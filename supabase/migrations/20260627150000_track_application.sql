-- Public application tracking by reference (application) ID or registered mobile.
-- Searches distributor and retailer registrations and returns status + summary.
create or replace function public.track_application(p_ref text default null, p_mobile text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record;
begin
  if coalesce(p_ref,'') <> '' then
    select application_id, distributor_name as name, mobile, status, created_at, transaction_id
      into r from public.distributor_registrations
      where upper(application_id) = upper(trim(p_ref)) order by created_at desc limit 1;
    if found then
      return jsonb_build_object('found', true, 'type', 'distributor', 'application_id', r.application_id,
        'name', r.name, 'mobile', r.mobile, 'status', r.status, 'submitted_at', r.created_at, 'transaction_id', r.transaction_id);
    end if;
    select application_id, trim(both ' ' from coalesce(first_name,'') || ' ' || coalesce(surname,'')) as name, mobile, status, created_at, transaction_id
      into r from public.retailer_registrations
      where upper(application_id) = upper(trim(p_ref)) order by created_at desc limit 1;
    if found then
      return jsonb_build_object('found', true, 'type', 'retailer', 'application_id', r.application_id,
        'name', r.name, 'mobile', r.mobile, 'status', r.status, 'submitted_at', r.created_at, 'transaction_id', r.transaction_id);
    end if;
  end if;

  if coalesce(p_mobile,'') <> '' then
    select application_id, distributor_name as name, mobile, status, created_at, transaction_id
      into r from public.distributor_registrations
      where mobile = trim(p_mobile) order by created_at desc limit 1;
    if found then
      return jsonb_build_object('found', true, 'type', 'distributor', 'application_id', r.application_id,
        'name', r.name, 'mobile', r.mobile, 'status', r.status, 'submitted_at', r.created_at, 'transaction_id', r.transaction_id);
    end if;
    select application_id, trim(both ' ' from coalesce(first_name,'') || ' ' || coalesce(surname,'')) as name, mobile, status, created_at, transaction_id
      into r from public.retailer_registrations
      where mobile = trim(p_mobile) order by created_at desc limit 1;
    if found then
      return jsonb_build_object('found', true, 'type', 'retailer', 'application_id', r.application_id,
        'name', r.name, 'mobile', r.mobile, 'status', r.status, 'submitted_at', r.created_at, 'transaction_id', r.transaction_id);
    end if;
  end if;

  return jsonb_build_object('found', false);
end;
$function$;

revoke all on function public.track_application(text, text) from public;
grant execute on function public.track_application(text, text) to anon, authenticated;
