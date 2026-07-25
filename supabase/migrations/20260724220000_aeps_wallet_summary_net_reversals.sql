-- aeps_wallet_summary: report commission as the NET of non-principal ledger
-- movements (excluding payout withdrawals), so reversal debits like
-- 'aeps_reconcile' cancel the credits they undo. Previously it summed
-- non-principal credits only, which double-counted the migrated opening lump
-- after it was reversed and re-settled per Eko. Applied to prod via the MCP.
create or replace function public.aeps_wallet_summary()
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric := 0; v_principal numeric := 0; v_commission numeric := 0;
  v_paid numeric := 0; v_pending numeric := 0; v_charges numeric := 0;
begin
  select coalesce(balance,0) into v_balance from public.aeps_wallets where user_id = v_uid;
  select coalesce(sum(amount),0) into v_principal
    from public.aeps_wallet_transactions
    where user_id = v_uid and direction='credit' and ref_type='aeps_principal';
  select coalesce(sum(case when direction='credit' then amount else -amount end),0)
    into v_commission
    from public.aeps_wallet_transactions
    where user_id = v_uid
      and coalesce(ref_type,'') not in ('aeps_principal','aeps_payout','aeps_withdrawal');
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
grant execute on function public.aeps_wallet_summary() to authenticated;
