-- Backend service-form submissions become routed applications (not a separate table)
alter table public.service_applications add column if not exists form_data jsonb;

create or replace function public.submit_backend_application(p_service_id uuid, p_form jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_rname text; v_comm numeric(12,2);
  k text; v text; lk text;
  v_full text; v_phone text; v_addr text; v_aadhaar text; v_email text; v_pan text; v_father text; v_gender text;
begin
  select * into v_svc from public.services where id = p_service_id and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email) into v_rname from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  for k, v in select key, value from jsonb_each_text(coalesce(p_form,'{}'::jsonb)) loop
    lk := lower(k);
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
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted');
end $$;
grant execute on function public.submit_backend_application(uuid, jsonb) to authenticated;
