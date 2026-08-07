-- Restrict a user's access, for real.
--
-- User Management already had a "Deactivate" button. It set profiles.is_active
-- to false and nothing else: no login path, guard or policy anywhere in the
-- application reads that column for a user. So an administrator could suspend
-- somebody, watch the badge turn red, and that person would carry on signing in
-- and working. A security control that reports success and does nothing is
-- worse than no control, because it stops anyone looking for the real one.
--
-- The real lever is auth.users.banned_until: the auth server refuses to issue a
-- token at all while it is in the future. That covers the browser, curl and
-- anything else, because it happens before a session exists rather than being
-- something the client is trusted to check.
--
-- Existing sessions are deleted at the same time. A ban that leaves a live
-- session running means the person keeps working until their token expires,
-- which is exactly the window an administrator is trying to close.
--
-- Rehearsed against a live operator account, rolled back:
--   before          6 sessions, banned_until null
--   after restrict  0 sessions, banned_until 2126-08-07, is_active false
--   after restore   banned_until null, is_active true
--   self-restriction              refused
--   operator restricting an admin refused

alter table public.profiles
  add column if not exists restricted_at     timestamptz,
  add column if not exists restricted_by     uuid,
  add column if not exists restriction_reason text;

create or replace function public.admin_set_user_restricted(
  _target     uuid,
  _restricted boolean,
  _reason     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_email text;
  v_sessions int := 0;
begin
  if not private.is_admin(v_admin) then
    raise exception 'Only an administrator can change access';
  end if;

  -- The super admin is not visible to administrators anywhere else; it must not
  -- become visible here by being restrictable.
  if private.is_super_admin_identity(_target) then
    raise exception 'User not found';
  end if;

  -- Nobody locks themselves out. With three admins that is recoverable, but it
  -- is a pointless way to spend an afternoon.
  if _target = v_admin then
    raise exception 'You cannot restrict your own account';
  end if;

  select email into v_email from auth.users where id = _target;
  if v_email is null then raise exception 'User not found'; end if;

  if _restricted then
    -- A hundred years rather than 'infinity': some auth-server versions compare
    -- this against now() in code that does not expect an infinite timestamp.
    update auth.users set banned_until = now() + interval '100 years' where id = _target;

    delete from auth.sessions where user_id = _target;
    get diagnostics v_sessions = row_count;

    update public.profiles
       set is_active = false,
           restricted_at = now(),
           restricted_by = v_admin,
           restriction_reason = nullif(btrim(coalesce(_reason, '')), '')
     where id = _target;
  else
    update auth.users set banned_until = null where id = _target;
    update public.profiles
       set is_active = true,
           restricted_at = null,
           restricted_by = null,
           restriction_reason = null
     where id = _target;
  end if;

  -- Cutting off or restoring somebody's access is exactly what a stolen admin
  -- account would do, so every other administrator is told.
  perform public.notify_roles(
    array['admin'], 'security',
    case when _restricted then 'Account restricted' else 'Account restriction lifted' end,
    v_email || case when _restricted
                    then ' was restricted' || coalesce(' — ' || nullif(btrim(coalesce(_reason,'')), ''), '')
                    else ' had their restriction removed' end,
    '/admin', 'user', _target::text);

  return jsonb_build_object(
    'ok', true,
    'email', v_email,
    'restricted', _restricted,
    'sessions_ended', v_sessions
  );
end;
$fn$;

revoke all on function public.admin_set_user_restricted(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_user_restricted(uuid, boolean, text) to authenticated;
