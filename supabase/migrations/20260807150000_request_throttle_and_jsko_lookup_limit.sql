-- A general-purpose throttle, and the first thing to use it.
--
-- fetch_jsko_account answers {"found": true} for a real legacy username and
-- {"found": false} for one that does not exist. The registration screen needs
-- that answer — somebody typing their old JSKO username deserves to be told it
-- was not found. But the same answer, asked a few thousand times, hands over
-- the whole list of 725 usernames, which is the first half of a credential
-- stuffing run against the old portal.
--
-- Silence is the wrong fix; nobody legitimate tries four hundred usernames in a
-- minute, so speed is the thing to take away, not honesty.
--
-- Verified after applying, as an anonymous caller:
--   attempt 1  -> {"found": true, "password_ok": false}   (real applicant, fine)
--   attempt 2  -> {"found": false}
--   refused from attempt 21 onwards

create table if not exists private.request_throttle (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

revoke all on table private.request_throttle from public, anon, authenticated;

/*
 * Count one hit against a bucket and say whether it is still under the limit.
 *
 * Fixed windows rather than a sliding log: a sliding window needs a row per
 * request and a periodic sweep, and this is protecting a username lookup, not
 * a payment. A caller who times attempts across a window boundary gets double
 * the allowance for one moment, which does not matter at these numbers.
 */
create or replace function private.throttle(_bucket text, _limit integer, _window interval)
returns boolean
language plpgsql
security definer
set search_path = private, pg_temp
as $fn$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from _window)) * extract(epoch from _window));
  v_hits  integer;
begin
  insert into private.request_throttle (bucket, window_start, hits)
  values (_bucket, v_start, 1)
  on conflict (bucket, window_start)
  do update set hits = private.request_throttle.hits + 1
  returning hits into v_hits;

  -- Opportunistic sweep so the table cannot grow without bound. Cheap: it only
  -- fires on roughly one call in two hundred.
  if random() < 0.005 then
    delete from private.request_throttle where window_start < now() - interval '1 day';
  end if;

  return v_hits <= _limit;
end;
$fn$;

revoke all on function private.throttle(text, integer, interval) from public, anon, authenticated;

/*
 * Best-effort caller address.
 *
 * PostgREST forwards the request headers, so the proxy's X-Forwarded-For is
 * available. It is spoofable, which is why there is a global limit underneath
 * the per-address one — an attacker who rotates the header still hits that.
 */
create or replace function private.caller_ip()
returns text
language plpgsql
stable
security definer
set search_path = private, pg_temp
as $fn$
declare v text;
begin
  begin
    v := btrim(split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1));
  exception when others then v := null;
  end;
  return coalesce(nullif(v, ''), 'unknown');
end;
$fn$;

revoke all on function private.caller_ip() from public, anon, authenticated;

create or replace function public.fetch_jsko_account(p_username text, p_password text default null::text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare r public.jsko_legacy_accounts;
begin
  -- Per address first: a real applicant checking their old username needs two
  -- or three tries, not twenty.
  if not private.throttle('jsko:' || private.caller_ip(), 20, interval '10 minutes') then
    raise exception 'Too many attempts. Please wait a few minutes and try again.'
      using errcode = 'P0001';
  end if;
  -- Then a ceiling across everybody, so rotating the forwarded-for header does
  -- not simply reset the counter. 600 an hour is far above real traffic on this
  -- screen and far below what harvesting 725 usernames needs.
  if not private.throttle('jsko:all', 600, interval '1 hour') then
    raise exception 'This service is busy. Please try again shortly.'
      using errcode = 'P0001';
  end if;

  select * into r from public.jsko_legacy_accounts
   where lower(username) = lower(trim(p_username)) and is_active;
  if not found then return jsonb_build_object('found', false); end if;

  if coalesce(r.legacy_password, '') <> '' then
    if coalesce(trim(p_password), '') <> r.legacy_password then
      return jsonb_build_object('found', true, 'password_ok', false);
    end if;
  end if;

  return jsonb_build_object('found', true, 'password_ok', true,
                            'username', r.username, 'full_name', r.full_name,
                            'email', r.email, 'mobile', r.mobile);
end;
$fn$;

revoke all on function public.fetch_jsko_account(text, text) from public;
grant execute on function public.fetch_jsko_account(text, text) to anon, authenticated, service_role;
