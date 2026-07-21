-- Agent name in the admin AEPS list: registration name first, profile display
-- name as fallback — staff/test agents (e.g. 38520007) have a profile but no
-- registration row, so their name showed blank. Email also falls back to the
-- auth account's email. Applied via Supabase MCP on 2026-07-21.
create or replace function public.admin_aeps_users()
returns table(user_id uuid, eko_user_code text, jsko_id text, application_id text, full_name text, mobile text, email text, dob date, pan_number text, aadhaar_number text, settlement_account text, settlement_ifsc text, bank_holder_name text, shop_name text, shop_address text, onboarded boolean, service_activated boolean, ekyc_done boolean, daily_kyc_done boolean, last_error text, created_at timestamptz)
language sql security definer set search_path to 'public'
as $$
  select
    a.user_id,
    a.eko_user_code,
    r.jsko_id,
    r.application_id,
    coalesce(
      nullif(btrim(concat_ws(' ', nullif(btrim(r.first_name),''), nullif(btrim(r.middle_name),''), nullif(btrim(r.surname),''))), ''),
      nullif(btrim(p.display_name), '')
    ) as full_name,
    coalesce(nullif(btrim(a.mobile),''), r.mobile) as mobile,
    coalesce(r.email, u.email) as email,
    r.dob,
    r.pan_number,
    coalesce(nullif(btrim(a.agent_aadhaar),''), r.aadhaar_number) as aadhaar_number,
    coalesce(nullif(btrim(a.settlement_account),''), r.account_number) as settlement_account,
    coalesce(nullif(btrim(a.settlement_ifsc),''), r.ifsc) as settlement_ifsc,
    r.bank_holder_name,
    r.shop_name,
    btrim(concat_ws(', ',
      nullif(btrim(r.building_shop_no),''), nullif(btrim(r.street_area),''),
      nullif(btrim(r.landmark),''), nullif(btrim(r.city),''),
      nullif(btrim(r.state),''), nullif(btrim(r.pincode),''))) as shop_address,
    a.onboarded, a.service_activated, a.ekyc_done,
    ((a.last_daily_kyc_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date) as daily_kyc_done,
    a.last_error,
    a.created_at
  from public.aeps_agents a
  left join public.profiles p on p.id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join lateral (
    select rr.* from public.retailer_registrations rr
    where rr.auth_user_id = a.user_id order by rr.created_at desc limit 1
  ) r on true
  where exists (select 1 from public.user_roles ur
                where ur.user_id = auth.uid() and ur.role in ('admin','accountant','operator'))
  order by a.created_at desc nulls last;
$$;
