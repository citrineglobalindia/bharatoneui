-- Commission columns now represent PERCENTAGES of service_charge (must sum to 100%).
-- Retailer commission_price on an application = service_charge * retailer_commission% / 100.
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.catalog_services;
  v_cat_name text;
  v_no text;
  v_id uuid;
  v_name text;
  v_comm numeric(12,2);
begin
  select * into v_svc from public.catalog_services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select name into v_cat_name from public.service_categories where id = v_svc.category_id;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  begin select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid(); exception when others then v_name := null; end;
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);

  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name
  ) values (
    v_no, v_svc.category_id, v_svc.id, v_cat_name, v_svc.name,
    payload->>'full_name', payload->>'father_name', payload->>'gender', payload->>'email',
    payload->>'phone', payload->>'address', payload->>'aadhaar_number', payload->>'pan_number',
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_name
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted', 'commission_price', v_comm);
end $$;
grant execute on function public.submit_service_application(jsonb) to authenticated;
