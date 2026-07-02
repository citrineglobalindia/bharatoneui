-- Safe service delete: hard-delete when no retailer applications reference it,
-- otherwise deactivate (preserve service_applications history). Admin only.
create or replace function public.admin_delete_service(p_service uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_refs int;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only admins can delete services';
  end if;
  select count(*) into v_refs from public.service_applications where service_id = p_service;

  if v_refs = 0 then
    -- cascades to service_api_config and service_submissions
    delete from public.services where id = p_service;
    return jsonb_build_object('deleted', true, 'deactivated', false, 'refs', 0);
  else
    update public.services set is_active = false, updated_at = now() where id = p_service;
    return jsonb_build_object('deleted', false, 'deactivated', true, 'refs', v_refs);
  end if;
end $function$;
