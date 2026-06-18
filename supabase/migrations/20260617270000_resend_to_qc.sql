create or replace function public.resend_to_qc(reg_id uuid, notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  update public.retailer_registrations set status='qc_review', qc_verified=false, qc_notes=coalesce(notes, qc_notes) where id=reg_id;
  perform public.notify_roles(array['qc','admin'],'kyc','Application sent for QC','An application has been (re)sent for QC verification by admin.','/qc/kyc-queue','registration', reg_id::text);
  return jsonb_build_object('ok', true, 'status', 'qc_review');
end $$;
grant execute on function public.resend_to_qc(uuid, text) to authenticated;
