-- Accountant "Hold" action: both Hold and Reject route the application to the
-- Telecaller with a MANDATORY remark. accountant_decision distinguishes
-- 'hold' vs 'rejected' (vs 'approved') so the telecaller sees why.
alter table public.retailer_registrations
  add column if not exists accountant_decision text;

create or replace function public.hold_retailer_payment(reg_id uuid, notes text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can hold'; end if;
  if coalesce(trim(notes),'') = '' then raise exception 'REMARK_REQUIRED'; end if;
  select * into r from public.retailer_registrations where id=reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  update public.retailer_registrations
     set status='telecaller', accountant_decision='hold',
         rejection_reason=notes, payment_verification_notes=notes,
         payment_verified=false, payment_verified_by=auth.uid(), payment_verified_at=now()
   where id=reg_id;
  perform public.notify_roles(array['telecaller','admin'],'sent_to_telecaller','Application on Hold',
    r.first_name||' '||r.surname||' ('||r.application_id||') put on hold by accountant — needs follow-up.',
    '/telecaller/registrations','retailer_registration', reg_id::text);
  return jsonb_build_object('id',reg_id,'status','telecaller','decision','hold');
end $function$;
grant execute on function public.hold_retailer_payment(uuid, text) to authenticated;

create or replace function public.verify_retailer_payment(reg_id uuid, received boolean, notes text DEFAULT NULL::text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can verify payment'; end if;
  select * into r from public.retailer_registrations where id=reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if received then
    update public.retailer_registrations set payment_verified=true, payment_verified_by=auth.uid(),
      payment_verified_at=now(), payment_verification_notes=notes, accountant_decision='approved', status='qc_review' where id=reg_id;
    perform public.notify_roles(array['qc','admin'],'forwarded_to_qc','Forwarded to QC',
      r.first_name||' '||r.surname||' ('||r.application_id||') payment verified by accountant — awaiting QC.',
      '/qc/kyc-queue','retailer_registration', reg_id::text);
    return jsonb_build_object('id',reg_id,'status','qc_review');
  else
    if coalesce(trim(notes),'') = '' then raise exception 'REMARK_REQUIRED'; end if;
    update public.retailer_registrations set payment_verified=false, payment_verified_by=auth.uid(),
      payment_verified_at=now(), payment_verification_notes=notes, status='telecaller',
      accountant_decision='rejected', rejection_reason=coalesce(notes,'Payment not received') where id=reg_id;
    perform public.notify_roles(array['telecaller','admin'],'sent_to_telecaller','Sent to Telecaller',
      r.first_name||' '||r.surname||' ('||r.application_id||') rejected by accountant — needs follow-up.',
      '/telecaller/registrations','retailer_registration', reg_id::text);
    return jsonb_build_object('id',reg_id,'status','telecaller');
  end if;
end; $function$;
