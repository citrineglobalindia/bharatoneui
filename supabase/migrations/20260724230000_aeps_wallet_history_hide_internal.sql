-- Hide internal bookkeeping rows (opening migration lump + its reversal) from
-- the retailer wallet history. They net to zero and only confuse.
-- Applied to prod via the Supabase MCP.
create or replace function public.aeps_wallet_history(_limit integer default 60)
returns table(at timestamptz, kind text, direction text, amount numeric, description text, status text)
language sql security definer set search_path to 'public' as $function$
  select t.created_at,
         case when t.ref_type = 'aeps_payout' then 'withdrawal'
              when t.ref_type = 'aeps_principal' then 'principal'
              when t.direction = 'credit' then 'commission'
              else coalesce(t.ref_type,'adjustment') end,
         t.direction, t.amount, t.reason, 'done'::text
  from public.aeps_wallet_transactions t
  where t.user_id = auth.uid()
    and coalesce(t.ref_type,'') not in ('aeps_wallet_migration','aeps_reconcile')
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
$function$;
grant execute on function public.aeps_wallet_history(integer) to authenticated;
