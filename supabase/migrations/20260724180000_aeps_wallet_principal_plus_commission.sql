-- "Self" model: the AEPS wallet holds the agent's full claim — the cash they
-- fronted on a withdrawal (principal) PLUS their commission. They withdraw the
-- total to their bank; BharatOne must have received the matching Eko settlement.
-- Applied to prod via the Supabase MCP.

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

  if t.service_type = 2 and coalesce(t.amount,0) > 0 then
    perform public._aeps_wallet_move(t.agent_id, 'credit', t.amount,
      'AEPS cash deposit — Rs ' || t.amount::text, 'aeps_principal', t.id);
  end if;

  v_comm := nullif(t.response->'data'->>'commission', '')::numeric;
  v_tds  := coalesce(nullif(t.response->'data'->>'tds', '')::numeric, 0);
  v_fee  := coalesce(nullif(t.response->'data'->>'totalfee', '')::numeric, 0);
  if coalesce(v_comm, 0) <= 0 then
    update public.aeps_transactions
       set commission_settled = true, eko_commission = coalesce(v_comm, 0),
           eko_tds = v_tds, eko_total_fee = v_fee, updated_at = now()
     where id = t.id;
    return jsonb_build_object('settled', true, 'reason', 'principal only, no commission');
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
  return jsonb_build_object('settled', true, 'principal', case when t.service_type=2 then t.amount else 0 end,
    'merchant', v_merchant, 'distributor', v_dist, 'admin', v_admin);
end $$;

create or replace function public.aeps_wallet_summary()
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric := 0; v_principal numeric := 0; v_commission numeric := 0;
  v_paid numeric := 0; v_pending numeric := 0; v_charges numeric := 0;
begin
  select coalesce(balance,0) into v_balance from public.aeps_wallets where user_id = v_uid;
  select coalesce(sum(amount),0) into v_principal
    from public.aeps_wallet_transactions where user_id = v_uid and direction='credit' and ref_type='aeps_principal';
  select coalesce(sum(amount),0) into v_commission
    from public.aeps_wallet_transactions where user_id = v_uid and direction='credit' and coalesce(ref_type,'') <> 'aeps_principal';
  select coalesce(sum(amount),0) into v_paid from public.aeps_payouts where agent_id = v_uid and status='paid';
  select coalesce(sum(amount),0) into v_pending from public.aeps_payouts where agent_id = v_uid and status='requested';
  select coalesce(sum(amount),0) into v_charges from public.wallet_transactions where user_id = v_uid and ref_type='aeps_2fa_charge';
  return json_build_object(
    'principal', v_principal, 'commission', v_commission,
    'earned', v_principal + v_commission, 'paid', v_paid, 'pending', v_pending,
    'charges', v_charges, 'balance', v_balance,
    'available', greatest(v_balance - v_pending, 0)
  );
end; $$;

create or replace function public.aeps_wallet_history(_limit int default 60)
returns table(at timestamptz, kind text, direction text, amount numeric, description text, status text)
language sql security definer set search_path to 'public' as $$
  select t.created_at,
         case when t.ref_type = 'aeps_payout' then 'withdrawal'
              when t.ref_type = 'aeps_principal' then 'principal'
              when t.direction = 'credit' then 'commission'
              else coalesce(t.ref_type,'adjustment') end,
         t.direction, t.amount, t.reason, 'done'::text
  from public.aeps_wallet_transactions t
  where t.user_id = auth.uid()
  union all
  select wt.created_at, 'daily_kyc', 'debit', wt.amount, 'Daily KYC charge', 'done'
  from public.wallet_transactions wt
  where wt.user_id = auth.uid() and wt.ref_type = 'aeps_2fa_charge'
  union all
  select p.requested_at, 'withdrawal', 'debit', p.amount, 'Withdrawal request', p.status
  from public.aeps_payouts p
  where p.agent_id = auth.uid() and p.status = 'requested'
  order by 1 desc
  limit _limit;
$$;

-- Backfill principal for past successful cash withdrawals (deduped by txn).
do $$
declare r record;
begin
  for r in
    select tr.id, tr.agent_id, tr.amount
    from public.aeps_transactions tr
    where tr.service_type = 2 and tr.status = 'success' and coalesce(tr.amount,0) > 0 and tr.agent_id is not null
      and not exists (select 1 from public.aeps_wallet_transactions x where x.ref_id = tr.id and x.ref_type = 'aeps_principal')
  loop
    perform public._aeps_wallet_move(r.agent_id, 'credit', r.amount,
      'AEPS cash deposit — Rs ' || r.amount::text, 'aeps_principal', r.id);
  end loop;
end $$;
