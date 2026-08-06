-- Make the database itself refuse privileged access until the second factor
-- has actually been presented.
--
-- Until now two-factor was enforced by the browser: StaffMfaBoundary replaces
-- the app with the code screen. Measured against the live database, a session
-- that signed in with the password alone and never entered a code could still
-- read 235 registrations, 8 wallets and call the admin RPCs — because policies
-- ask "is this user an admin?", never "has this session proved itself?". So the
-- control stopped exactly the attacker it was not built for (a curious member
-- of staff) and not the one it was (somebody holding a stolen password, using
-- curl, who never loads our JavaScript at all).

insert into public.app_settings (key, value)
values ('enforce_mfa_at_api', 'off')
on conflict (key) do nothing;

/*
 * Has the CALLER settled their second factor?
 *
 * True — meaning "let them through" — in five situations:
 *
 *   1. The switch is off. One row, no deploy, instant.
 *   2. There is no JWT at all: pg_cron, a migration, psql. Not a login.
 *   3. The JWT belongs to service_role: our own edge functions. They hold the
 *      service key, a far bigger secret than any staff password, and they
 *      cannot present a TOTP code.
 *   4. The session has reached aal2 — the code was entered.
 *   5. The user holds no verified factor at all. Nobody can present something
 *      they have not enrolled, and blocking them here would lock them out of
 *      the very screen that enrols them.
 *
 * Which leaves exactly one case denied: a user who HAS an authenticator and has
 * not used it this session. That is the stolen-password case.
 *
 * aal is read from auth.sessions rather than trusting an 'aal' claim to be
 * present in the token — the session row is the auth server's own record and is
 * populated for every session (verified: the enrolled admin's row reads aal2,
 * every other live session reads aal1).
 */
create or replace function private.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth, pg_temp
as $fn$
  select
    coalesce((select value from public.app_settings where key = 'enforce_mfa_at_api'), 'off') <> 'on'
    or auth.uid() is null
    or auth.jwt() is null
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or exists (
      select 1 from auth.sessions s
      where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
        and s.aal::text = 'aal2'
    )
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$fn$;

-- Policies are evaluated as the calling role, so both roles need EXECUTE for
-- the check to run at all. SECURITY DEFINER, and it returns only a boolean
-- about the caller's own session, so this grants no data access.
revoke all on function private.mfa_ok() from public;
grant execute on function private.mfa_ok() to anon, authenticated, service_role;

-- Wire it into the two functions every privileged decision already runs
-- through: private.is_admin (136 policies) and public.has_role (48), plus every
-- SECURITY DEFINER RPC that calls them. Two edits rather than 184, and no
-- policy can be forgotten because none of them change.
--
-- The gate is on the CALLER's session, not on the user being asked about. A
-- session that has not presented its code gets no privileged answer about
-- anybody, including itself.

create or replace function private.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $fn$
  select private.mfa_ok()
     and (
       exists (
         select 1 from public.user_roles
         where user_id = _user_id and role::text = 'admin'
       )
       or private.is_super_admin(_user_id)
     );
$fn$;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $fn$
  select private.mfa_ok()
     and exists (
       select 1 from public.user_roles
       where user_id = _user_id and role = _role
     );
$fn$;

revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- Rehearsed first, inside a transaction that rolled back, against real accounts:
--
--   enrolled admin, password only, no code   235 registrations -> 0, is_admin false
--   same admin after entering the code       235 registrations,   is_admin true
--   admin with no authenticator yet          235 registrations,   is_admin true
--   operator not yet enrolled                unchanged (0 -> 0, never had access)
--   retailer reading own wallet              unchanged (1 -> 1)
--   service_role (edge functions)            allowed
--   pg_cron / migrations, no JWT             allowed
--
-- And the chicken-and-egg case, which is the one that would have hurt: at aal1
-- an enrolled staff member can still read their own user_roles row, their own
-- profile and my_mfa_requirement(), because those policies test auth.uid()
-- directly and never go through is_admin. So the portal can still work out who
-- they are in order to show them the code screen. No lockout loop.
--
-- TO TURN OFF IN A HURRY — one row, no deploy, effective on the next query:
--   update public.app_settings set value = 'off' where key = 'enforce_mfa_at_api';

update public.app_settings set value = 'on' where key = 'enforce_mfa_at_api';
