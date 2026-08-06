-- Two anonymous-callable leftovers found while re-testing the API surface.
--
-- 1. fetch_jsko_account had TWO overloads, both granted to anon:
--
--      fetch_jsko_account(p_username)              <- no password check at all
--      fetch_jsko_account(p_username, p_password)  <- checks the password
--
--    The one-argument version returns full_name, email and mobile for any of
--    the 725 active legacy accounts on a username alone. It is currently
--    unreachable only by accident: Postgres cannot choose between the two
--    overloads because the second has a DEFAULT, so every call errors out.
--    That is not a control, it is a coincidence — drop the two-argument
--    version and the passwordless one silently becomes the live endpoint.
--    Nothing calls it (the registration screen passes both arguments), so it
--    goes.
--
-- 2. has_role(uuid, app_role) was executable by anon. It needs a user id to be
--    useful, so it is not a bulk leak, but there is no reason for an anonymous
--    caller to be able to ask "is this person an admin?". It is called only
--    from inside policies and other functions, never from the browser.
--
-- Not changed here, deliberately: fetch_jsko_account(username, password) still
-- answers {"found": true, "password_ok": false} for a real username and
-- {"found": false} for a fake one, so it remains a username-enumeration oracle
-- across those 725 accounts. The registration screen genuinely needs to tell
-- somebody their old username was not found, so the answer is rate limiting
-- rather than silence, and that is a separate change.
--
-- Verified after applying, as anon:
--   registration screen, wrong password -> {"found": true, "password_ok": false}   (still works)
--   has_role()                          -> blocked
--   passwordless overload               -> dropped

drop function if exists public.fetch_jsko_account(text);

revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
