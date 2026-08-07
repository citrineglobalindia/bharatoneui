-- Slow down password guessing.
--
-- There was nothing: no lockout, no attempt counter, and auth.audit_log_entries
-- is empty, so there is no server-side record of failures to build on either.
-- Staff are shielded by mandatory two-factor, but the 62 retailers hold wallet
-- balances behind a password alone, and 89 accounts is a small enough list to
-- spray.
--
-- Scope, stated honestly: this sits in front of OUR login forms. Somebody
-- calling the auth interface directly does not pass through it, and the control
-- for that is the rate limit in the Supabase dashboard. This is the layer that
-- stops the ordinary case — a credential-stuffing run against the website — and
-- it is not a substitute for the other.
--
-- Deliberately NOT implemented by banning the account at the auth server. That
-- would also work, and would cover direct interface calls, but then a mistyped
-- password would produce the "your access is restricted, contact the IT
-- department" screen built for administrator suspensions. A lockout and a
-- suspension are different events and must not look identical to the person
-- reading the screen.
--
-- Verified after applying, as an anonymous caller:
--   before any failure            allowed
--   after 4 wrong passwords       allowed
--   after 5 wrong passwords       refused, "try again in 15 minute(s)"
--   a username that does not exist refused identically (no enumeration)
--   an unrelated account          allowed
--   after a successful sign-in    allowed again

create table if not exists private.login_attempts (
  identifier   text primary key,
  failures     integer     not null default 0,
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  locked_until timestamptz
);

revoke all on table private.login_attempts from public, anon, authenticated;

-- Tunable without a deploy.
insert into public.app_settings (key, value) values
  ('login_max_failures', '5'),
  ('login_window_minutes', '15'),
  ('login_lock_minutes', '15')
on conflict (key) do nothing;

/*
 * May this identifier attempt a sign-in right now?
 *
 * Answers identically for an account that exists and one that does not: an
 * endpoint that locks out only real usernames is a way to enumerate them.
 */
create or replace function public.login_gate(_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare
  v_id   text := lower(btrim(coalesce(_identifier, '')));
  v_row  private.login_attempts%rowtype;
  v_left int;
begin
  if v_id = '' then return jsonb_build_object('allowed', true); end if;

  -- A ceiling per address as well, so one attacker cycling through many
  -- usernames runs out of road even though no single account locks.
  if not private.throttle('login-ip:' || private.caller_ip(), 40, interval '15 minutes') then
    return jsonb_build_object('allowed', false, 'retry_after', 900,
      'message', 'Too many sign-in attempts from this connection. Please wait 15 minutes and try again.');
  end if;

  select * into v_row from private.login_attempts where identifier = v_id;
  if v_row.identifier is null or v_row.locked_until is null or v_row.locked_until <= now() then
    return jsonb_build_object('allowed', true);
  end if;

  v_left := greatest(1, ceil(extract(epoch from (v_row.locked_until - now())))::int);
  return jsonb_build_object('allowed', false, 'retry_after', v_left,
    'message', 'Too many failed attempts. Please try again in '
               || greatest(1, ceil(v_left / 60.0))::int || ' minute(s), or reset your password.');
end;
$fn$;

/* A failed attempt. Locks the identifier once the threshold is crossed. */
create or replace function public.note_login_failure(_identifier text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare
  v_id     text := lower(btrim(coalesce(_identifier, '')));
  v_max    int  := coalesce((select value::int from public.app_settings where key='login_max_failures'), 5);
  v_window int  := coalesce((select value::int from public.app_settings where key='login_window_minutes'), 15);
  v_lock   int  := coalesce((select value::int from public.app_settings where key='login_lock_minutes'), 15);
  v_fail   int;
begin
  if v_id = '' then return; end if;

  insert into private.login_attempts (identifier, failures, first_at, last_at)
  values (v_id, 1, now(), now())
  on conflict (identifier) do update set
    -- Outside the window, start counting again rather than accumulating a
    -- lockout from failures spread over months.
    failures = case when private.login_attempts.first_at < now() - make_interval(mins => v_window)
                    then 1 else private.login_attempts.failures + 1 end,
    first_at = case when private.login_attempts.first_at < now() - make_interval(mins => v_window)
                    then now() else private.login_attempts.first_at end,
    last_at  = now()
  returning failures into v_fail;

  if v_fail >= v_max then
    update private.login_attempts
       set locked_until = now() + make_interval(mins => v_lock)
     where identifier = v_id;
  end if;

  if random() < 0.01 then
    delete from private.login_attempts
     where last_at < now() - interval '7 days' and (locked_until is null or locked_until < now());
  end if;
end;
$fn$;

/* A successful sign-in clears the slate. */
create or replace function public.note_login_success(_identifier text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
begin
  delete from private.login_attempts where identifier = lower(btrim(coalesce(_identifier, '')));
end;
$fn$;

revoke all on function public.login_gate(text)          from public;
revoke all on function public.note_login_failure(text)  from public;
revoke all on function public.note_login_success(text)  from public;
grant execute on function public.login_gate(text)         to anon, authenticated;
grant execute on function public.note_login_failure(text) to anon, authenticated;
grant execute on function public.note_login_success(text) to anon, authenticated;
