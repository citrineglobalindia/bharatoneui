-- Who may use the payment gateway while it is still in UAT. Applied via the MCP.
--
-- Admins-only was the wrong rule: the wallet belongs to retailers, so an admin has
-- nothing to top up and the flow could not be rehearsed at all. Instead keep an
-- explicit allow-list of accounts permitted to reach the sandbox; everyone else is
-- told online payment is not open yet and keeps the existing options.
--
-- Comma-separated BharatOne IDs and/or e-mail addresses. Stops applying by itself
-- once payment_gateways.mode = 'live', since the check only runs in test mode.
insert into public.app_settings(key, value)
values ('icici_test_accounts', 'BO00001095')
on conflict (key) do update set value = excluded.value;

create or replace function public.icici_test_allowed(p_user uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $fn$
  with allow as (
    select string_to_array(
      lower(coalesce((select value from public.app_settings where key = 'icici_test_accounts'), '')),
      ',') as list
  )
  select
    exists (select 1 from public.user_roles r where r.user_id = p_user and r.role::text = 'admin')
    or exists (
      select 1
      from auth.users u
      left join lateral (
        select rr.application_id, rr.username
        from public.retailer_registrations rr
        where rr.auth_user_id = u.id
        order by rr.created_at desc limit 1
      ) reg on true, allow
      where u.id = p_user
        and (
          lower(trim(u.email))               = any (select trim(x) from unnest(allow.list) x)
          or lower(trim(reg.application_id)) = any (select trim(x) from unnest(allow.list) x)
          or lower(trim(reg.username))       = any (select trim(x) from unnest(allow.list) x)
        )
    )
$fn$;
grant execute on function public.icici_test_allowed(uuid) to anon, authenticated, service_role;
