-- Distributor registrations: allow accountant (besides admin) to Approve / Reject
-- and add a Hold action (status 'on_hold') with a mandatory remark — mirroring the
-- retailer accountant flow so the distributor Actions have View/Download/Approve/Hold/Reject.
-- approve_distributor_registration + reject_distributor_registration guards updated to
-- (is_admin OR accountant); hold_distributor_registration added. Full bodies applied via
-- Supabase migrations (see repo history / project migrations).
create or replace function public.hold_distributor_registration(reg_id uuid, reason text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v public.distributor_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'not authorized'; end if;
  if coalesce(trim(reason),'') = '' then raise exception 'a remark is required'; end if;
  update public.distributor_registrations
     set status='on_hold', rejection_reason=reason, reviewed_by=auth.uid(), reviewed_at=now()
   where id=reg_id returning * into v;
  if v.id is null then raise exception 'distributor registration not found'; end if;
  perform public.notify_roles(array['admin','accountant'],'distributor_hold','Distributor on hold',
    v.distributor_name||' ('||v.application_id||') put on hold — needs follow-up.','/admin/users','distributor_registration', v.id::text);
  return jsonb_build_object('id', v.id, 'status','on_hold');
end $function$;
grant execute on function public.hold_distributor_registration(uuid, text) to authenticated;
