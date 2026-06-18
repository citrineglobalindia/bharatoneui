-- Allow authenticated/anon to evaluate private.is_admin() inside RLS policies.
-- Without this, admin-only INSERT policies (e.g. jsko_legacy_accounts) failed with
-- "new row violates row-level security policy" because the policy expression errored.
grant usage on schema private to authenticated, anon;
grant execute on function private.is_admin(uuid) to authenticated, anon;
