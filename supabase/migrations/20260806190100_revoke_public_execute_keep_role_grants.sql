-- The previous migration revoked EXECUTE from `anon` directly, but most of
-- these functions never had a grant TO anon — they had one to PUBLIC, the
-- pseudo-role every role inherits. So anon could still call
-- admin_reset_user_password, _wallet_move, process_withdrawal and the rest.
-- (Verified: the spot-check after the first migration still showed them open.)
--
-- Revoking from PUBLIC is the real fix, but it must not collaterally remove
-- access from authenticated or service_role. So: record exactly what those two
-- roles can execute today, revoke PUBLIC, then re-grant precisely that set —
-- no more. Anything deliberately withheld from authenticated earlier (e.g.
-- purge_registration_drafts) stays withheld.
do $$
declare r record;
begin
  create temp table _keep on commit drop as
  select p.oid,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authed,
         has_function_privilege('service_role',  p.oid, 'EXECUTE') as svc
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public';

  for r in select oid::regprocedure::text as sig from _keep loop
    execute format('revoke execute on function %s from public', r.sig);
  end loop;
  for r in select oid::regprocedure::text as sig from _keep where authed loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
  for r in select oid::regprocedure::text as sig from _keep where svc loop
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

alter default privileges in schema public revoke execute on functions from public;

-- Verified after applying, as the anon role:
--   admin_reset_user_password, accountant_topup_wallet, _wallet_move,
--   _company_move, recharge_company_account, process_withdrawal,
--   set_app_setting, razorpay_credit_wallet, create_staff_account  -> all blocked
--   all 14 public entry points (site, registration, token pages, login,
--   password recovery)                                            -> all still callable
--   live site probe: homepage + track-application make 15 Supabase
--   calls, zero 401/403.
