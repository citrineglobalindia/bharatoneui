-- BharatOne — access log: device ID, country, region, timezone.
-- Applied to prod via the MCP as:
--   20260730115xxx access_log_device_and_geo
--   20260730115xxx access_log_readers_with_geo
--
-- Supersedes the log_access / log_access_batch / admin_access_* definitions in
-- 20260730160000_platform_access_log.sql (extra parameters and columns).
--
-- Where the location data comes from:
--   country  — Cloudflare's cf-ipcountry header. Real geo-IP, accurate.
--   colo     — the Cloudflare edge that served the request, from cf-ray. This is the
--              closest thing to a city available without an Enterprise plan
--              (cf-ipcity), so `region` derived from it is APPROXIMATE.
--   timezone — reported by the browser; a useful second location signal.
--   device_id— a random id the browser keeps in localStorage. It survives sign-out and
--              restarts, so one physical device can be followed across sessions and
--              across different accounts. Cleared if the user wipes site data.

drop function if exists public.debug_headers();

alter table public.platform_access_log
  add column if not exists device_id text,
  add column if not exists country   text,
  add column if not exists colo      text,
  add column if not exists region    text,
  add column if not exists timezone  text;

create index if not exists pal_device_idx  on public.platform_access_log(device_id, at desc);
create index if not exists pal_country_idx on public.platform_access_log(country, at desc);

create or replace function private.colo_city(p text)
returns text language sql immutable as $fn$
  select case upper(coalesce(p,''))
    when 'BOM' then 'Mumbai'      when 'DEL' then 'Delhi'       when 'MAA' then 'Chennai'
    when 'BLR' then 'Bengaluru'   when 'HYD' then 'Hyderabad'   when 'CCU' then 'Kolkata'
    when 'AMD' then 'Ahmedabad'   when 'PAT' then 'Patna'       when 'NAG' then 'Nagpur'
    when 'COK' then 'Kochi'       when 'BBI' then 'Bhubaneswar' when 'IXC' then 'Chandigarh'
    when 'JAI' then 'Jaipur'      when 'KNU' then 'Kanpur'      when 'PNQ' then 'Pune'
    when 'CMB' then 'Colombo'     when 'KTM' then 'Kathmandu'   when 'DAC' then 'Dhaka'
    when 'SIN' then 'Singapore'   when 'DXB' then 'Dubai'       when 'NRT' then 'Tokyo'
    when 'HKG' then 'Hong Kong'   when 'LHR' then 'London'      when 'FRA' then 'Frankfurt'
    when 'AMS' then 'Amsterdam'   when 'CDG' then 'Paris'       when 'IAD' then 'Washington'
    when 'EWR' then 'Newark'      when 'LAX' then 'Los Angeles' when 'SJC' then 'San Jose'
    when 'ORD' then 'Chicago'     when 'DFW' then 'Dallas'      when 'SYD' then 'Sydney'
    when 'ICN' then 'Seoul'       when 'KUL' then 'Kuala Lumpur'
    else nullif(upper(coalesce(p,'')), '')
  end
$fn$;

create or replace function private.request_colo()
returns text language sql stable as $fn$
  select nullif(upper(split_part(coalesce(private.request_header('cf-ray'), ''), '-', 2)), '')
$fn$;

-- NOTE: the full bodies of log_access(…, p_device, p_tz),
-- log_access_batch(p_events, p_session, p_device, p_tz), admin_access_log(… p_device),
-- admin_access_sessions and admin_access_stats as applied in production are recorded in
-- the Supabase migration history (supabase_migrations.schema_migrations) for
-- access_log_device_and_geo and access_log_readers_with_geo. They differ from
-- 20260730160000 only by these extra parameters/columns:
--   log_access        + p_device text, p_tz text      -> writes device_id/country/colo/region/timezone
--   log_access_batch  + p_device text, p_tz text      -> same
--   admin_access_log  + p_device text filter          -> returns device_id/country/region/timezone
--   admin_access_sessions                              -> returns device_id/country/region/timezone
--   admin_access_stats                                 -> adds devices_24h and by_region
