-- Only retailers may submit service applications
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_name text; v_comm numeric(12,2);
begin
  if not public.has_role(auth.uid(),'retailer') then raise exception 'ONLY_RETAILER'; end if;
  select * into v_svc from public.services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    if coalesce((select balance from public.wallets where user_id=auth.uid()),0) < v_svc.service_charge then raise exception 'INSUFFICIENT_FUNDS'; end if;
  end if;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email) into v_name from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    payload->>'full_name', payload->>'father_name', payload->>'gender', payload->>'email',
    payload->>'phone', payload->>'address', payload->>'aadhaar_number', payload->>'pan_number',
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_name, v_cat.operator_id
  ) returning id into v_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    perform public._wallet_move(auth.uid(), 'debit', v_svc.service_charge, 'Application '||v_no||' - '||v_svc.name, 'application', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted', 'commission_price', v_comm);
end $$;
grant execute on function public.submit_service_application(jsonb) to authenticated;

create or replace function public.submit_backend_application(p_service_id uuid, p_form jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_rname text; v_comm numeric(12,2);
  k text; v text; lk text;
  v_full text; v_phone text; v_addr text; v_aadhaar text; v_email text; v_pan text; v_father text; v_gender text;
begin
  if not public.has_role(auth.uid(),'retailer') then raise exception 'ONLY_RETAILER'; end if;
  select * into v_svc from public.services where id = p_service_id and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    if coalesce((select balance from public.wallets where user_id=auth.uid()),0) < v_svc.service_charge then raise exception 'INSUFFICIENT_FUNDS'; end if;
  end if;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email) into v_rname from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  for k, v in select key, value from jsonb_each_text(coalesce(p_form,'{}'::jsonb)) loop
    lk := lower(k);
    if v is null or left(v,1) = '{' then continue; end if;
    if v_father is null and lk like '%father%' then v_father := v;
    elsif v_full is null and lk like '%name%' then v_full := v; end if;
    if v_phone is null and (lk like '%phone%' or lk like '%mobile%') then v_phone := v; end if;
    if v_addr is null and lk like '%address%' then v_addr := v; end if;
    if v_aadhaar is null and (lk like '%aadhaar%' or lk like '%aadhar%') then v_aadhaar := v; end if;
    if v_email is null and lk like '%email%' then v_email := v; end if;
    if v_pan is null and lk like '%pan%' then v_pan := v; end if;
    if v_gender is null and lk like '%gender%' then v_gender := v; end if;
  end loop;
  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator, form_data
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    coalesce(v_full, v_rname), v_father, v_gender, v_email, v_phone, v_addr, v_aadhaar, v_pan,
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_rname, v_cat.operator_id, p_form
  ) returning id into v_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    perform public._wallet_move(auth.uid(), 'debit', v_svc.service_charge, 'Application '||v_no||' - '||v_svc.name, 'application', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted');
end $$;
grant execute on function public.submit_backend_application(uuid, jsonb) to authenticated;

-- Remove test applications submitted by non-retailers (e.g. the operator account)
delete from public.application_messages where application_id in (
  select sa.id from public.service_applications sa
  where not exists (select 1 from public.user_roles ur where ur.user_id=sa.submitted_by and ur.role='retailer'));
delete from public.service_applications sa
  where not exists (select 1 from public.user_roles ur where ur.user_id=sa.submitted_by and ur.role='retailer');

select count(*) as remaining_apps,
  (select count(*) from public.service_applications sa join public.user_roles ur on ur.user_id=sa.submitted_by and ur.role='retailer') as retailer_apps
from public.service_applications;
