-- Separate, withdraw-only AEPS wallet. AEPS commission accrues here; charges
-- (2FA, etc.) only ever hit the main wallet. Mirrors wallets / wallet_transactions
-- / _wallet_move so it behaves identically. Applied to prod via the Supabase MCP.

create table if not exists public.aeps_wallets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aeps_wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  direction     text not null check (direction in ('credit','debit')),
  amount        numeric not null,
  balance_after numeric not null,
  reason        text,
  ref_type      text,
  ref_id        uuid,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create index if not exists aeps_wtx_user_idx on public.aeps_wallet_transactions(user_id, created_at desc);

alter table public.aeps_wallets enable row level security;
alter table public.aeps_wallet_transactions enable row level security;

drop policy if exists "aeps wallet read" on public.aeps_wallets;
create policy "aeps wallet read" on public.aeps_wallets for select to authenticated
  using (auth.uid() = user_id or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));

drop policy if exists "aeps wtx read" on public.aeps_wallet_transactions;
create policy "aeps wtx read" on public.aeps_wallet_transactions for select to authenticated
  using (auth.uid() = user_id or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));

create or replace function public._aeps_wallet_move(p_user uuid, p_dir text, p_amount numeric, p_reason text, p_ref_type text, p_ref_id uuid)
returns numeric language plpgsql security definer set search_path to 'public' as $$
declare v_bal numeric;
begin
  insert into public.aeps_wallets(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  select balance into v_bal from public.aeps_wallets where user_id = p_user for update;
  if p_dir = 'debit' then
    if v_bal < p_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
    v_bal := v_bal - p_amount;
  else
    v_bal := v_bal + p_amount;
  end if;
  update public.aeps_wallets set balance = v_bal, updated_at = now() where user_id = p_user;
  insert into public.aeps_wallet_transactions(user_id, direction, amount, balance_after, reason, ref_type, ref_id, created_by)
    values (p_user, p_dir, p_amount, v_bal, p_reason, p_ref_type, p_ref_id, auth.uid());
  return v_bal;
end $$;

-- Route commission into the AEPS wallet instead of the main wallet.
create or replace function public.settle_aeps_commission(p_txn_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  t public.aeps_transactions;
  v_comm numeric; v_tds numeric; v_fee numeric; v_net numeric;
  v_mpct numeric; v_dpct numeric;
  v_merchant numeric; v_dist numeric; v_admin numeric;
  v_distributor uuid;
begin
  select * into t from public.aeps_transactions where id = p_txn_id for update;
  if t.id is null then raise exception 'AEPS_TXN_NOT_FOUND'; end if;
  if t.status <> 'success' or t.commission_settled or t.agent_id is null then
    return jsonb_build_object('settled', false, 'reason', 'not eligible');
  end if;
  if t.service_type not in (2, 5) then
    update public.aeps_transactions set commission_settled = true, updated_at = now() where id = t.id;
    return jsonb_build_object('settled', false, 'reason', 'non-financial operation');
  end if;
  v_comm := nullif(t.response->'data'->>'commission', '')::numeric;
  v_tds  := coalesce(nullif(t.response->'data'->>'tds', '')::numeric, 0);
  v_fee  := coalesce(nullif(t.response->'data'->>'totalfee', '')::numeric, 0);
  if coalesce(v_comm, 0) <= 0 then
    update public.aeps_transactions
       set commission_settled = true, eko_commission = coalesce(v_comm, 0),
           eko_tds = v_tds, eko_total_fee = v_fee, updated_at = now()
     where id = t.id;
    return jsonb_build_object('settled', false, 'reason', 'no commission returned by Eko');
  end if;
  v_net := round(v_comm - v_tds, 2);
  v_mpct := coalesce(nullif((select value from public.app_settings where key = 'aeps_merchant_share_percent'), '')::numeric, 70);
  v_dpct := coalesce(nullif((select value from public.app_settings where key = 'aeps_distributor_share_percent'), '')::numeric, 0);
  v_distributor := public.aeps_resolve_distributor(t.agent_id);
  v_merchant := round(v_net * v_mpct / 100.0, 2);
  v_dist     := case when v_distributor is null then 0 else round(v_net * v_dpct / 100.0, 2) end;
  v_admin    := round(v_net - v_merchant - v_dist, 2);
  update public.aeps_transactions set
    eko_commission = v_comm, eko_tds = v_tds, eko_total_fee = v_fee,
    merchant_commission = v_merchant, admin_commission = v_admin,
    commission_gross = v_comm, commission = v_merchant,
    commission_distributor = v_dist, commission_company = v_admin,
    distributor_id = v_distributor, commission_settled = true, updated_at = now()
  where id = t.id;
  if v_merchant > 0 then
    perform public._aeps_wallet_move(t.agent_id, 'credit', v_merchant,
      'AEPS commission — ' || replace(t.operation, '_', ' ') || ' Rs ' || t.amount::text,
      'aeps_transaction', t.id);
  end if;
  if v_distributor is not null and v_dist > 0 then
    perform public._aeps_wallet_move(v_distributor, 'credit', v_dist,
      'AEPS distributor commission — ' || replace(t.operation, '_', ' '),
      'aeps_transaction', t.id);
  end if;
  return jsonb_build_object('settled', true, 'eko_commission', v_comm, 'tds', v_tds,
    'net', v_net, 'merchant', v_merchant, 'distributor', v_dist, 'admin', v_admin);
end $$;

alter table public.wallet_withdrawals add column if not exists wallet text not null default 'main';

create or replace function public.request_aeps_withdrawal(p_amount numeric, p_method text, p_account text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text; v_bal numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  select coalesce(balance,0) into v_bal from public.aeps_wallets where user_id = auth.uid();
  if coalesce(v_bal,0) < p_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
  insert into public.wallet_withdrawals(user_id, amount, method, account_details, note, wallet)
    values (auth.uid(), p_amount, p_method, p_account, p_note, 'aeps') returning id into v_id;
  select coalesce(display_name,'Retailer') into v_name from public.profiles where id = auth.uid();
  perform public.notify_roles(array['accountant','admin'],'withdrawal','New AEPS withdrawal request',
    coalesce(v_name,'Retailer')||' requested AEPS payout of '||to_char(p_amount,'FM999999990'),
    '/accountant/withdrawals','withdrawal', v_id::text);
  return jsonb_build_object('id', v_id, 'status', 'pending', 'wallet', 'aeps');
end $$;
grant execute on function public.request_aeps_withdrawal(numeric,text,text,text) to authenticated;

create or replace function public.process_withdrawal(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.wallet_withdrawals; v_bal numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  select * into w from public.wallet_withdrawals where id = p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status not in ('pending') then return jsonb_build_object('ok', false, 'status', w.status); end if;
  if p_action = 'approve' then
    if coalesce(w.wallet,'main') = 'aeps' then
      v_bal := public._aeps_wallet_move(w.user_id,'debit', w.amount, 'AEPS wallet payout', 'withdrawal', w.id);
    else
      v_bal := public._wallet_move(w.user_id,'debit', w.amount, 'Withdrawal payout', 'withdrawal', w.id);
    end if;
    update public.wallet_withdrawals set status='paid', processed_by=auth.uid(), processed_at=now(), processor_note=p_note where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (w.user_id,'withdrawal','Withdrawal paid','Your payout of '||to_char(w.amount,'FM999999990')||' has been processed. New balance: '||to_char(v_bal,'FM999999990')||'.','/wallet','withdrawal',w.id::text);
    return jsonb_build_object('ok', true, 'status', 'paid', 'balance', v_bal, 'wallet', coalesce(w.wallet,'main'));
  else
    update public.wallet_withdrawals set status='rejected', processed_by=auth.uid(), processed_at=now(), processor_note=p_note where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (w.user_id,'withdrawal','Withdrawal rejected','Your payout request of '||to_char(w.amount,'FM999999990')||' was not approved.','/wallet','withdrawal',w.id::text);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
end $$;
grant execute on function public.process_withdrawal(uuid,text,text) to authenticated;

-- One-time: move AEPS commission already in the main wallet into the AEPS wallet.
do $$
declare r record; v_move numeric; v_mainbal numeric;
begin
  for r in
    select user_id, sum(amount) as amt
    from public.wallet_transactions
    where ref_type = 'aeps_transaction' and direction = 'credit'
    group by user_id
    having sum(amount) > 0
  loop
    select balance into v_mainbal from public.wallets where user_id = r.user_id;
    v_move := least(r.amt, coalesce(v_mainbal, 0));
    if v_move > 0 then
      perform public._wallet_move(r.user_id, 'debit', v_move, 'Move AEPS commission to AEPS wallet', 'aeps_wallet_migration', null);
      perform public._aeps_wallet_move(r.user_id, 'credit', v_move, 'Opening AEPS commission balance (migrated from main wallet)', 'aeps_wallet_migration', null);
    end if;
  end loop;
end $$;
