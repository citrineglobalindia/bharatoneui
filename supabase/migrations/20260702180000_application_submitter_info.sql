-- Return the submitter (JSKO/retailer) info for a service application so the
-- Operator portal can show JSKO ID / Name / Contact without hitting RLS on the
-- submitter's profile & registration. Staff-only.
create or replace function public.application_submitter_info(p_app uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_by uuid; v_name text; v_disp text; v_phone text; v_jsko text; v_appid text; v_mobile text;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('operator','admin','qc','accountant','telecaller','manager')
  ) then
    raise exception 'Not authorised';
  end if;

  select submitted_by, submitter_name into v_by, v_name
  from public.service_applications where id = p_app;

  if v_by is null then
    return jsonb_build_object('jsko_id', null, 'name', v_name, 'phone', null);
  end if;

  select display_name, phone into v_disp, v_phone from public.profiles where id = v_by;
  select jsko_id, application_id, mobile into v_jsko, v_appid, v_mobile
  from public.retailer_registrations
  where auth_user_id = v_by
  order by created_at desc limit 1;

  return jsonb_build_object(
    'jsko_id', coalesce(v_jsko, v_appid),
    'name', coalesce(v_name, v_disp),
    'phone', coalesce(v_phone, v_mobile)
  );
end $function$;

revoke all on function public.application_submitter_info(uuid) from public, anon;
grant execute on function public.application_submitter_info(uuid) to authenticated;
