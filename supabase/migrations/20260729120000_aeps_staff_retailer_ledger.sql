-- Accountant/admin visibility: list AEPS retailers and view any one retailer's
-- full AEPS ledger with clear descriptions and a running balance. Covers the AEPS
-- wallet (deposits, commission, transfers to main, withdrawals) plus the AEPS-related
-- main-wallet entries (daily KYC charge, and the credit landing from a transfer).
-- Applied to prod via the MCP.
create or replace function public.aeps_staff_retailers()
returns table(user_id uuid, name text, jsko_id text, mobile text, balance numeric, last_activity timestamptz)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_aeps_staff() then raise exception 'Not permitted'; end if;
  return query
    select aw.user_id,
      coalesce(nullif(trim(pr.display_name),''),
               nullif(trim(coalesce(rr.first_name,'')||' '||coalesce(rr.surname,'')),''), 'Retailer'),
      rr.jsko_id,
      coalesce(nullif(pr.phone,''), rr.mobile),
      aw.balance,
      (select max(created_at) from public.aeps_wallet_transactions t where t.user_id = aw.user_id)
    from public.aeps_wallets aw
    left join public.profiles pr on pr.id = aw.user_id
    left join lateral (select first_name, surname, jsko_id, mobile from public.retailer_registrations
                       where auth_user_id = aw.user_id order by created_at desc limit 1) rr on true
    order by 2;
end $$;
grant execute on function public.aeps_staff_retailers() to authenticated;

create or replace function public.aeps_staff_ledger(p_user uuid, _limit integer default 200)
returns table(at timestamptz, source text, kind text, direction text, amount numeric,
              description text, balance_after numeric)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_aeps_staff() then raise exception 'Not permitted'; end if;
  return query
    select * from (
      select t.created_at as at, 'AEPS wallet'::text as source,
        case t.ref_type
          when 'aeps_principal' then 'Cash deposit (principal)'
          when 'aeps_transaction' then 'Commission earned'
          when 'aeps_to_main' then 'Transfer to main wallet'
          when 'aeps_payout' then 'Withdrawal to bank'
          when 'aeps_wallet_migration' then 'Opening commission (migrated)'
          when 'aeps_reconcile' then 'Commission reconciliation'
          else coalesce(t.ref_type,'Adjustment') end as kind,
        t.direction, t.amount, t.reason as description, t.balance_after
      from public.aeps_wallet_transactions t
      where t.user_id = p_user
      union all
      select w.created_at, 'Main wallet',
        case when w.ref_type='aeps_2fa_charge' then 'Daily KYC charge'
             when w.ref_type='aeps_transfer' then 'Received from AEPS wallet' end,
        w.direction, w.amount, w.reason, w.balance_after
      from public.wallet_transactions w
      where w.user_id = p_user and w.ref_type in ('aeps_2fa_charge','aeps_transfer')
    ) x
    order by x.at desc
    limit greatest(1, least(coalesce(_limit,200), 500));
end $$;
grant execute on function public.aeps_staff_ledger(uuid, integer) to authenticated;
