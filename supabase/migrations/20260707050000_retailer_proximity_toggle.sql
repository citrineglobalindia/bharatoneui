-- Admin on/off toggle for the "no two registrations in the same location" rule.
-- ON  = enforce retailer_radius_km exclusion zone (default).
-- OFF = allow registrations at the same location (no radius restriction).
insert into public.app_settings(key, value)
  values ('retailer_proximity_enabled', 'true')
  on conflict (key) do nothing;

create or replace function public.set_retailer_proximity_enabled(p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  insert into public.app_settings(key, value, updated_at)
    values ('retailer_proximity_enabled', case when p_on then 'true' else 'false' end, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true, 'enabled', p_on);
end $function$;
grant execute on function public.set_retailer_proximity_enabled(boolean) to authenticated;

create or replace function public.tg_proximity()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_lat double precision; v_lng double precision; v_radius numeric; v_near double precision; v_enabled boolean;
begin
  select coalesce(value,'true') = 'true' into v_enabled from public.app_settings where key='retailer_proximity_enabled';
  if v_enabled is null then v_enabled := true; end if;
  if not v_enabled then return NEW; end if;

  v_lat := coalesce(NEW.latitude, NEW.video_kyc_lat); v_lng := coalesce(NEW.longitude, NEW.video_kyc_lng);
  if v_lat is null or v_lng is null then return NEW; end if;
  select coalesce(value::numeric,2) into v_radius from public.app_settings where key='retailer_radius_km';
  v_radius := coalesce(v_radius, 2);
  select min(public._km(v_lat,v_lng, coalesce(video_kyc_lat,latitude), coalesce(video_kyc_lng,longitude))) into v_near
    from public.retailer_registrations where status='approved' and coalesce(video_kyc_lat,latitude) is not null and id <> NEW.id;
  if v_near is not null and v_near < v_radius then
    raise exception 'LOCATION_TOO_CLOSE: an existing agent is within %km of this location', v_radius;
  end if;
  return NEW;
end $function$;
