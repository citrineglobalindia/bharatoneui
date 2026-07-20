-- ============================================================================
-- RESET TEST EMAILS  —  run this in Supabase Dashboard -> SQL Editor before
-- re-testing registration with these emails. It frees the emails so the
-- "already registered" warning does not appear.
--
-- It removes any live account (auth.users) and any registration rows for these
-- emails. It does NOT touch jsko_legacy_accounts, so the Old JSKO Portal lookup
-- still finds the record. Safe to run repeatedly.
--
-- Add/remove test emails in the array below as needed.
-- ============================================================================
do $$
declare
  v_emails text[] := array[
    'rishi.shankarappa@gmail.com',
    'rishi.shankarappa27@gmail.com'
  ];
  v_ids uuid[];
begin
  select array_agg(id) into v_ids
  from auth.users
  where lower(email) = any (select lower(e) from unnest(v_emails) e);

  -- Remove registration record(s) for these emails (any status).
  delete from public.retailer_registrations
  where lower(email) = any (select lower(e) from unnest(v_emails) e)
     or (v_ids is not null and auth_user_id = any (v_ids));

  if v_ids is not null then
    -- Unlink nullable staff-reference columns so the auth rows can be deleted.
    update public.retailer_registrations set reviewed_by         = null where reviewed_by         = any (v_ids);
    update public.retailer_registrations set payment_verified_by = null where payment_verified_by = any (v_ids);
    update public.retailer_registrations set qc_verified_by      = null where qc_verified_by      = any (v_ids);
    update public.retailer_registrations set approved_by         = null where approved_by         = any (v_ids);
    update public.service_applications  set submitted_by         = null where submitted_by         = any (v_ids);
    update public.service_submissions   set submitted_by         = null where submitted_by         = any (v_ids);
    update public.services              set created_by           = null where created_by           = any (v_ids);
    update public.feedback              set user_id              = null where user_id              = any (v_ids);
    update public.ledger_entries        set recorded_by          = null where recorded_by          = any (v_ids);

    delete from auth.users where id = any (v_ids);
  end if;
end $$;

-- Confirm both are free (both queries should return NO rows):
select 'auth.users' as source, email from auth.users
where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com')
union all
select 'retailer_registrations', email from public.retailer_registrations
where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com');
