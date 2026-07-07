-- Police Verification issue / expiry (valid-till) dates. QC/admin set them at
-- review; the retailer KYC page shows status + issue + expiry + days remaining.
alter table public.retailer_registrations
  add column if not exists police_issue_date date,
  add column if not exists police_expiry_date date;

create or replace function public.set_police_validity(reg_id uuid, _issue date, _expiry date)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')) then
    raise exception 'Only QC or admin can set validity';
  end if;
  update public.retailer_registrations
     set police_issue_date = _issue, police_expiry_date = _expiry
   where id = reg_id;
  return jsonb_build_object('ok', true);
end $function$;
grant execute on function public.set_police_validity(uuid, date, date) to authenticated;
