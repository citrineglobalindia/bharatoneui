-- Make aeps_wallets the single source of truth for the AEPS commission wallet.
-- The existing derived summary + aeps_payouts flow now read/write the ledger.
-- Applied to prod via the Supabase MCP.

create or replace function public.aeps_wallet_summary()
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric := 0; v_earned numeric := 0; v_paid numeric := 0;
  v_pending numeric := 0; v_charges numeric := 0;
begin
  select coalesce(balance,0) into v_balance from public.aeps_wallets where user_id = v_uid;
  select coalesce(sum(amount),0) into v_earned
    from public.aeps_wallet_transactions where user_id = v_uid and direction = 'credit';
  select coalesce(sum(amount),0) into v_paid
    from public.aeps_payouts where agent_id = v_uid and status = 'paid';
  select coalesce(sum(amount),0) into v_pending
    from public.aeps_payouts where agent_id = v_uid and status = 'requested';
  select coalesce(sum(amount),0) into v_charges
    from public.wallet_transactions where user_id = v_uid and ref_type = 'aeps_2fa_charge';
  return json_build_object(
    'earned', v_earned, 'paid', v_paid, 'pending', v_pending,
    'charges', v_charges, 'balance', v_balance,
    'available', greatest(v_balance - v_pending, 0)
  );
end; $$;

create or replace function public.admin_process_aeps_payout(p_id uuid, p_action text, p_utr text default null, p_remarks text default null)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_new text; v_row public.aeps_payouts;
begin
  if not public.is_aeps_staff() then raise exception 'Not permitted'; end if;
  select * into v_row from public.aeps_payouts where id = p_id for update;
  if v_row.id is null or v_row.status <> 'requested' then raise exception 'Payout not found or already processed'; end if;
  if p_action = 'approve' then
    perform public._aeps_wallet_move(v_row.agent_id, 'debit', v_row.amount,
      'AEPS payout to bank' || coalesce(' — UTR ' || p_utr, ''), 'aeps_payout', v_row.id);
    v_new := 'paid';
  elsif p_action = 'reject' then
    v_new := 'rejected';
  else
    raise exception 'Unknown action';
  end if;
  update public.aeps_payouts
    set status = v_new, utr = coalesce(p_utr, utr), remarks = coalesce(p_remarks, remarks),
        processed_by = auth.uid(), processed_at = now()
    where id = p_id;
  return json_build_object('ok', true, 'status', v_new);
end; $$;

create or replace function public.aeps_wallet_history(_limit int default 60)
returns table(at timestamptz, kind text, direction text, amount numeric, description text, status text)
language sql security definer set search_path to 'public' as $$
  select t.created_at,
         case when t.ref_type = 'aeps_payout' then 'withdrawal'
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
grant execute on function public.aeps_wallet_history(int) to authenticated;

update public.app_settings set value = '0.94', updated_at = now() where key = 'aeps_daily_2fa_charge';
