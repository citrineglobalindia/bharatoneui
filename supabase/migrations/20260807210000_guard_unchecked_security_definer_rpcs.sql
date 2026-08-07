-- Close the SECURITY DEFINER functions that carried no caller check.
--
-- 334 SECURITY DEFINER functions are executable by `authenticated`. 228 check
-- the caller themselves; 106 did not. Among those 106 were the staff
-- dashboards, and measured against the live database an ordinary retailer could
-- call:
--
--   admin_dashboard()       company-wide figures, 64 retailers
--   accountant_dashboard()  pending top-ups, withdrawals, wallet float
--   qc_dashboard()          the KYC queue
--   admin_emails()          the addresses of all three administrators
--   company_balance()       Rs 994,978.76
--   tracker_list()          340 rows of internal project state
--
-- Every application user is the same Postgres role, `authenticated`, so GRANT
-- cannot separate a retailer from an accountant. The check has to live inside
-- the function.
--
-- private.require_staff() lets through pg_cron (no user at all), our own edge
-- functions (service_role), any staff role, and the super admin. It raises
-- 'Not authorised' for everyone else, in the same words whoever asks: an error
-- that distinguishes "wrong role" from "no such function" is a map of what
-- exists.
--
-- The guard is injected mechanically rather than by hand: for plpgsql, straight
-- after the body's opening BEGIN; for a set-returning SQL function, as a WHERE
-- on a wrapper; for a scalar SQL function, as a CASE around the original
-- expression. A SQL body's trailing semicolon is stripped first — it cannot
-- survive being wrapped in a subquery. Functions already containing the guard
-- are skipped, so this is safe to re-run.
--
-- The settlement and job functions in the second block were NOT exploitable:
-- each acts on a row the caller would have to forge first, and row-level
-- security refuses that. Verified end to end with a real retailer and a real
-- wallet, rolled back - balance before 5826.00, balance after 5826.00. Guarded
-- anyway: "unreachable because a second control happens to hold" is not the
-- same as "not permitted", and the day somebody widens a policy on
-- razorpay_payments for a good reason, that second control was all there was.
--
-- Verified live after applying:
--   retailer  admin_dashboard, accountant_dashboard, qc_dashboard   refused
--   retailer  company_balance, admin_emails, tracker_list           refused
--   retailer  razorpay_credit_wallet, settle_aeps_commission        refused
--   retailer  process_jobs                                          refused
--   admin     admin_dashboard  works, 64 retailers
--   admin     accountant_dashboard works
--   operator  category_operators_list works
--   service_role (edge functions)  still works
--   pg_cron (no JWT)               still works
--   unguarded SECURITY DEFINER functions: 106 -> 86
--
-- The remaining 86 are 38 trigger functions, which are not callable as RPCs,
-- and the intentionally public endpoints: registration, OTP verification,
-- application tracking, pincode lookup, site pages and telemetry.

create or replace function private.require_staff(_roles text[] default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return true; end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return true; end if;

  if exists (
    select 1 from public.user_roles r
    where r.user_id = v_uid
      and r.role::text = any (coalesce(_roles, array[
        'admin','accountant','qc','telecaller','operator',
        'hr_staff','manager','dro','tro','bde','store_staff'
      ]))
  ) then
    return true;
  end if;

  if private.is_super_admin_identity(v_uid) then return true; end if;

  raise exception 'Not authorised' using errcode = '42501';
end;
$fn$;

revoke all on function private.require_staff(text[]) from public;
grant execute on function private.require_staff(text[]) to anon, authenticated, service_role;

do $mig$
declare
  targets text[] := array[
    'admin_dashboard','admin_emails','admin_distributors','admin_live_feed',
    'admin_list_aeps_bank_changes','admin_list_aeps_payouts','admin_list_bbps',
    'accountant_dashboard','qc_dashboard','company_balance',
    'aeps_staff_ledger','aeps_staff_retailers',
    'registration_events_list','category_operators_list',
    'tracker_list','tracker_summary',
    'razorpay_credit_wallet','settle_aeps_commission','estore_settle_order','process_jobs'
  ];
  rec record; v_def text; v_body text; v_inner text; v_new text; n int := 0;
begin
  for rec in
    select p.oid, p.proname, l.lanname as lang,
           pg_get_functiondef(p.oid) as def, pg_get_function_result(p.oid) as res
    from pg_proc p
    join pg_namespace nsp on nsp.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where nsp.nspname = 'public' and p.proname = any(targets)
  loop
    v_def := rec.def;
    v_body := substring(v_def from 'AS \$function\$(.*)\$function\$');
    if v_body is null then raise notice 'skipped %', rec.proname; continue; end if;
    if v_body ~* 'require_staff' then continue; end if;

    if rec.lang = 'plpgsql' then
      v_new := regexp_replace(v_body, '(\mbegin\M)',
                 E'begin\n  perform private.require_staff();', 1, 1, 'i');
    else
      v_inner := regexp_replace(btrim(v_body), ';\s*$', '');
      if rec.res like 'SETOF%' or rec.res like 'TABLE%' then
        v_new := E'\n  select * from (' || v_inner || E'\n  ) _guarded where private.require_staff()\n';
      else
        v_new := E'\n  select case when private.require_staff() then (' || v_inner || E'\n  ) end\n';
      end if;
    end if;

    execute replace(v_def, '$function$' || v_body || '$function$',
                           '$function$' || v_new || '$function$');
    n := n + 1;
  end loop;
  raise notice 'guarded % function(s)', n;
end;
$mig$;
