create table if not exists public.wallet_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  method text, account_details text, note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  requested_at timestamptz not null default now(),
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz, processor_note text
);
create index if not exists wd_status_idx on public.wallet_withdrawals(status, requested_at desc);
alter table public.wallet_withdrawals enable row level security;
drop policy if exists wd_sel on public.wallet_withdrawals;
create policy wd_sel on public.wallet_withdrawals for select to authenticated using (user_id=auth.uid() or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));
drop policy if exists wd_ins on public.wallet_withdrawals;
create policy wd_ins on public.wallet_withdrawals for insert to authenticated with check (user_id=auth.uid());

create or replace function public.request_withdrawal(p_amount numeric, p_method text, p_account text, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text; v_bal numeric;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Invalid amount'; end if;
  select coalesce(balance,0) into v_bal from public.wallets where user_id=auth.uid();
  if coalesce(v_bal,0) < p_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
  insert into public.wallet_withdrawals(user_id, amount, method, account_details, note)
    values (auth.uid(), p_amount, p_method, p_account, p_note) returning id into v_id;
  select coalesce(display_name,'Retailer') into v_name from public.profiles where id=auth.uid();
  perform public.notify_roles(array['accountant','admin'],'withdrawal','New withdrawal request',
    coalesce(v_name,'Retailer')||' requested payout of '||to_char(p_amount,'FM999999990'),
    '/accountant/withdrawals','withdrawal', v_id::text);
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;
grant execute on function public.request_withdrawal(numeric,text,text,text) to authenticated;

create or replace function public.process_withdrawal(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare w public.wallet_withdrawals; v_bal numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  select * into w from public.wallet_withdrawals where id=p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status not in ('pending') then return jsonb_build_object('ok', false, 'status', w.status); end if;
  if p_action='approve' then
    v_bal := public._wallet_move(w.user_id,'debit', w.amount, 'Withdrawal payout', 'withdrawal', w.id);
    update public.wallet_withdrawals set status='paid', processed_by=auth.uid(), processed_at=now(), processor_note=p_note where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (w.user_id,'withdrawal','Withdrawal paid','Your payout of '||to_char(w.amount,'FM999999990')||' has been processed. New balance: '||to_char(v_bal,'FM999999990')||'.','/wallet','withdrawal',w.id::text);
    return jsonb_build_object('ok', true, 'status', 'paid', 'balance', v_bal);
  else
    update public.wallet_withdrawals set status='rejected', processed_by=auth.uid(), processed_at=now(), processor_note=p_note where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (w.user_id,'withdrawal','Withdrawal rejected','Your payout request of '||to_char(w.amount,'FM999999990')||' was not approved.','/wallet','withdrawal',w.id::text);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
end $$;
grant execute on function public.process_withdrawal(uuid,text,text) to authenticated;
