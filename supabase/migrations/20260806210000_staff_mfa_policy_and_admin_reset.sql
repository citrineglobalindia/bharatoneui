-- Two-factor authentication for staff.
--
-- Which roles must hold a second factor is configuration, not code, so the
-- policy can be tightened without a deploy. Default: the roles that move money
-- or hold personal data.
insert into public.app_settings (key, value)
values ('mfa_required_roles', 'admin,accountant,hr_staff')
on conflict (key) do nothing;

-- Does the CURRENT user have to enrol? Answered server-side so the browser
-- cannot simply decide it is exempt.
create or replace function public.my_mfa_requirement()
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_required text[];
  v_mine text[];
  v_needs boolean;
  v_factors int;
begin
  if v_uid is null then
    return jsonb_build_object('required', false, 'enrolled', false);
  end if;

  select string_to_array(coalesce(value,''), ',') into v_required
    from public.app_settings where key = 'mfa_required_roles';
  select coalesce(array_agg(role::text), '{}') into v_mine
    from public.user_roles where user_id = v_uid;

  v_needs := exists (
    select 1 from unnest(coalesce(v_required,'{}')) r
    where btrim(r) <> '' and btrim(r) = any (v_mine)
  );

  select count(*) into v_factors
    from auth.mfa_factors f where f.user_id = v_uid and f.status = 'verified';

  return jsonb_build_object('required', v_needs, 'enrolled', v_factors > 0,
                            'factors', v_factors, 'roles', to_jsonb(v_mine));
end;
$fn$;
revoke all on function public.my_mfa_requirement() from public, anon;
grant execute on function public.my_mfa_requirement() to authenticated;

-- Someone will lose their phone. Without this the only way back is the
-- Supabase dashboard, which most of the team should not have.
create or replace function public.admin_reset_user_mfa(target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $fn$
declare v_n int; v_email text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only an administrator can reset two-factor authentication';
  end if;
  if private.is_super_admin_identity(target) then
    raise exception 'User not found';
  end if;
  select email into v_email from auth.users where id = target;
  if v_email is null then raise exception 'User not found'; end if;

  delete from auth.mfa_factors where user_id = target;
  get diagnostics v_n = row_count;

  -- Removing somebody's second factor is exactly the action an attacker with a
  -- stolen admin account would take, so it is recorded and the owner is told.
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (target, 'security', 'Two-factor authentication was reset',
          'An administrator removed the authenticator on your account. If this was not expected, contact your manager immediately.',
          '/settings', 'mfa', target::text);
  perform public.notify_roles(array['admin'], 'security', 'Two-factor reset',
          v_email || ' had their authenticator removed by an administrator.', '/admin', 'mfa', target::text);

  return jsonb_build_object('ok', true, 'removed', v_n, 'email', v_email);
end;
$fn$;
revoke all on function public.admin_reset_user_mfa(uuid) from public, anon;
grant execute on function public.admin_reset_user_mfa(uuid) to authenticated;

-- Admin needs to see who has actually enrolled, to chase the stragglers.
create or replace function public.admin_mfa_status()
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $fn$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only an administrator can view this';
  end if;
  return coalesce((
    select jsonb_agg(t order by t.enrolled, t.name)
    from (
      select p.id, coalesce(p.display_name, au.email) as name, au.email,
             coalesce((select array_agg(r.role::text order by r.role::text)
                       from public.user_roles r where r.user_id = p.id), '{}') as roles,
             exists (select 1 from auth.mfa_factors f
                     where f.user_id = p.id and f.status = 'verified') as enrolled
      from public.profiles p join auth.users au on au.id = p.id
      where p.is_active and not private.is_super_admin_identity(p.id)
        and exists (select 1 from public.user_roles r
                    where r.user_id = p.id
                      and r.role::text = any (string_to_array(
                        (select coalesce(value,'') from public.app_settings where key='mfa_required_roles'), ',')))
    ) t
  ), '[]'::jsonb);
end;
$fn$;
revoke all on function public.admin_mfa_status() from public, anon;
grant execute on function public.admin_mfa_status() to authenticated;
