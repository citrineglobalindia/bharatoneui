-- Make admin user-deletion a TRUE hard delete: also remove the user's retailer
-- registration record(s) so no data is left behind and the email is freed
-- (otherwise the leftover registration keeps the email flagged "already registered").
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_email text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only administrators can delete users';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;
  if exists (
    select 1 from public.user_roles
    where user_id = target and role = 'admin'::public.app_role
  ) then
    raise exception 'Cannot delete an administrator account';
  end if;

  select lower(email) into v_email from auth.users where id = target;

  -- Fully remove this user's registration record(s), by link or by email, so the
  -- email is freed and nothing is left behind. ledger_entries.registration_id is
  -- ON DELETE SET NULL, so history rows are preserved but de-linked.
  delete from public.retailer_registrations
    where auth_user_id = target
       or (v_email is not null and lower(email) = v_email);

  -- Unlink the nullable NO-ACTION staff-reference columns so auth.users can be removed.
  update public.retailer_registrations set reviewed_by         = null where reviewed_by         = target;
  update public.retailer_registrations set payment_verified_by = null where payment_verified_by = target;
  update public.retailer_registrations set qc_verified_by      = null where qc_verified_by      = target;
  update public.retailer_registrations set approved_by         = null where approved_by         = target;
  update public.service_applications  set submitted_by         = null where submitted_by         = target;
  update public.service_submissions   set submitted_by         = null where submitted_by         = target;
  update public.services              set created_by           = null where created_by           = target;
  update public.feedback              set user_id              = null where user_id              = target;
  update public.ledger_entries        set recorded_by          = null where recorded_by          = target;

  -- Remove the auth user; cascade / set-null FKs clean up profiles, roles, wallets,
  -- notifications, sessions, razorpay/wallet_recharges, etc.
  delete from auth.users where id = target;
end;
$fn$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
