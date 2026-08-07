-- Maintenance mode: take the site off the air without taking anything down.
--
-- The alternative levers are all worse. Pausing the Vercel project or the
-- Supabase project stops the admin portal too, so nobody can turn it back on
-- from inside, and any AePS or wallet transaction in flight fails instead of
-- finishing. This is a row: it flips instantly, it flips back instantly, and it
-- never touches data.
--
-- Administrators are exempt, and the login pages stay open, or the switch would
-- be one-way — off the air with the off switch on the other side of the door.
--
-- Verified after applying, then rolled back:
--   switch on                            value = 'on'
--   logged-out visitor reads the flag    2 of 2 keys
--   retailer reads the flag              yes
--   retailer tries to turn it off        refused
--   admin turns it off                   value = 'off'
--
-- TO PAUSE OR RESUME WITHOUT THE UI — one row, effective on the next page load:
--   update public.app_settings set value = 'on'  where key = 'maintenance_mode';
--   update public.app_settings set value = 'off' where key = 'maintenance_mode';

insert into public.app_settings (key, value) values
  ('maintenance_mode', 'off'),
  ('maintenance_message', 'We are carrying out scheduled maintenance and will be back shortly. Thank you for your patience.')
on conflict (key) do nothing;

-- The site has to read this while logged out, or a visitor would see the real
-- site and only find out at login. Added to the small public allow-list rather
-- than reopening the whole table.
drop policy if exists as_public_read on public.app_settings;
create policy as_public_read on public.app_settings
  for select to anon
  using (key in (
    'registration_fee',
    'platform_name',
    'company_legal_name',
    'company_address',
    'company_office_contact',
    'support_email',
    'support_phone',
    'maintenance_mode',
    'maintenance_message'
  ));

/*
 * Flip the switch. Admin only, and it records who and when so "who took the
 * site down at 4pm" has an answer.
 */
create or replace function public.admin_set_maintenance(_on boolean, _message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare v_email text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only an administrator can change maintenance mode';
  end if;

  update public.app_settings set value = case when _on then 'on' else 'off' end
   where key = 'maintenance_mode';

  if _message is not null and btrim(_message) <> '' then
    update public.app_settings set value = btrim(_message) where key = 'maintenance_message';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  perform public.notify_roles(
    array['admin'], 'security',
    case when _on then 'Site put into maintenance mode' else 'Site taken out of maintenance mode' end,
    coalesce(v_email, 'An administrator') ||
      case when _on then ' put the site into maintenance mode.' else ' brought the site back online.' end,
    '/admin', 'maintenance', null);

  return jsonb_build_object('ok', true, 'maintenance', _on);
end;
$fn$;

revoke all on function public.admin_set_maintenance(boolean, text) from public, anon;
grant execute on function public.admin_set_maintenance(boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Narrowed: only ONE named account keeps working while the site is paused.
-- ---------------------------------------------------------------------------
--
-- The exemption started as "any administrator", which is three accounts. The
-- intent is one named person, so it is now an explicit list, and everyone else
-- — including the other two administrators — sees the maintenance page like
-- any retailer.
--
-- Decided server-side, in maintenance_state(), so the list never ships in the
-- JavaScript bundle: publishing it would tell an attacker exactly which single
-- account is worth their attention. It is also removed from what ordinary
-- signed-in users may read, for the same reason.
--
-- Verified with the site paused, then rolled back:
--   sadanns123@gmail.com   may_pass true,  can read the list
--   the other admin        may_pass false
--   a retailer             may_pass false, list hidden
--   a logged-out visitor   sees on=true,   list hidden

insert into public.app_settings (key, value)
values ('maintenance_bypass_emails', 'sadanns123@gmail.com')
on conflict (key) do nothing;

create or replace function public.maintenance_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $fn$
declare
  v_on boolean; v_msg text; v_allowed text; v_email text; v_pass boolean := false;
begin
  select (value = 'on') into v_on from public.app_settings where key = 'maintenance_mode';
  v_on := coalesce(v_on, false);
  select value into v_msg from public.app_settings where key = 'maintenance_message';

  if v_on and auth.uid() is not null then
    select value into v_allowed from public.app_settings where key = 'maintenance_bypass_emails';
    select email into v_email from auth.users where id = auth.uid();

    -- Case- and space-insensitive, because this list is typed by a human under
    -- pressure and "Sadanns123@Gmail.com " must not be a lockout.
    v_pass := v_email is not null and exists (
      select 1 from unnest(string_to_array(coalesce(v_allowed, ''), ',')) e
      where lower(btrim(e)) = lower(btrim(v_email))
    );

    -- The super admin is never locked out of their own platform.
    if not v_pass then v_pass := private.is_super_admin_identity(auth.uid()); end if;
  end if;

  return jsonb_build_object('on', v_on,
    'message', coalesce(v_msg, 'We are carrying out scheduled maintenance and will be back shortly.'),
    'may_pass', v_pass);
end;
$fn$;

revoke all on function public.maintenance_state() from public;
grant execute on function public.maintenance_state() to anon, authenticated, service_role;

-- The bypass list names a real person: keep it out of the public allow-list and
-- away from ordinary signed-in users. Administrators still see it.
drop policy if exists as_public_read on public.app_settings;
create policy as_public_read on public.app_settings
  for select to anon
  using (key in (
    'registration_fee', 'platform_name', 'company_legal_name', 'company_address',
    'company_office_contact', 'support_email', 'support_phone'
  ));

drop policy if exists as_authenticated_read on public.app_settings;
create policy as_authenticated_read on public.app_settings
  for select to authenticated
  using (key not in ('tracker_passphrase_sha256', 'maintenance_bypass_emails'));
