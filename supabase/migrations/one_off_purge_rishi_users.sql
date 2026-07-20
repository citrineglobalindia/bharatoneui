-- ONE-OFF: fully remove rishi.shankarappa@gmail.com and rishi.shankarappa27@gmail.com
-- Run this in Supabase Dashboard -> SQL Editor (it runs as a superuser, bypassing RLS).
-- Safe to run even if one/both emails don't exist.
do $$
declare v_ids uuid[];
begin
  select array_agg(id) into v_ids
  from auth.users
  where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com');

  -- Remove their registration record(s) — by link or by email — so the emails are freed.
  delete from public.retailer_registrations
    where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com')
       or (v_ids is not null and auth_user_id = any(v_ids));

  if v_ids is not null then
    -- Unlink nullable staff-reference columns that could block the auth delete.
    update public.retailer_registrations set reviewed_by         = null where reviewed_by         = any(v_ids);
    update public.retailer_registrations set payment_verified_by = null where payment_verified_by = any(v_ids);
    update public.retailer_registrations set qc_verified_by      = null where qc_verified_by      = any(v_ids);
    update public.retailer_registrations set approved_by         = null where approved_by         = any(v_ids);
    update public.service_applications  set submitted_by         = null where submitted_by         = any(v_ids);
    update public.service_submissions   set submitted_by         = null where submitted_by         = any(v_ids);
    update public.services              set created_by           = null where created_by           = any(v_ids);
    update public.feedback              set user_id              = null where user_id              = any(v_ids);
    update public.ledger_entries        set recorded_by          = null where recorded_by          = any(v_ids);

    -- Remove the logins; cascade / set-null FKs clean up profiles, roles, wallets, etc.
    delete from auth.users where id = any(v_ids);
  end if;
end $$;

-- Verify they are gone (should return no rows):
select id, email from auth.users
where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com');
select id, email, status from public.retailer_registrations
where lower(email) in ('rishi.shankarappa@gmail.com', 'rishi.shankarappa27@gmail.com');
