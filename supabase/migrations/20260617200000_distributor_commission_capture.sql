create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_name text; v_comm numeric(12,2); v_dist uuid;
begin
  if not public.has_role(auth.uid(),'retailer') then raise exception 'ONLY_RETAILER'; end if;
  select * into v_svc from public.services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    if coalesce((select balance from public.wallets where user_id=auth.uid()),0) < v_svc.service_charge then raise exception 'INSUFFICIENT_FUNDS'; end if;
  end if;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email), p.distributor_id into v_name, v_dist
    from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator,
    distributor_id, company_commission_amount, distributor_commission_amount, dro_commission_amount, tro_commission_amount
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    payload->>'full_name', payload->>'father_name', payload->>'gender', payload->>'email',
    payload->>'phone', payload->>'address', payload->>'aadhaar_number', payload->>'pan_number',
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_name, v_cat.operator_id,
    v_dist,
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.company_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.distributor_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.dro_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.tro_commission,0)/100.0,2)
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
  v_no text; v_id uuid; v_rname text; v_comm numeric(12,2); v_dist uuid;
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
  select coalesce(p.display_name, u.email), p.distributor_id into v_rname, v_dist
    from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
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
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator, form_data,
    distributor_id, company_commission_amount, distributor_commission_amount, dro_commission_amount, tro_commission_amount
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    coalesce(v_full, v_rname), v_father, v_gender, v_email, v_phone, v_addr, v_aadhaar, v_pan,
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_rname, v_cat.operator_id, p_form,
    v_dist,
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.company_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.distributor_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.dro_commission,0)/100.0,2),
    round(coalesce(v_svc.service_charge,0)*coalesce(v_svc.tro_commission,0)/100.0,2)
  ) returning id into v_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    perform public._wallet_move(auth.uid(), 'debit', v_svc.service_charge, 'Application '||v_no||' - '||v_svc.name, 'application', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted');
end $$;
grant execute on function public.submit_backend_application(uuid, jsonb) to authenticated;

-- create distributor account
do $$
declare uid uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email='distributor@bharatone.in') then return; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'distributor@bharatone.in', crypt('Distributor@123', gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values ('distributor@bharatone.in', uid, json_build_object('sub', uid::text, 'email','distributor@bharatone.in')::jsonb, 'email', now(), now(), now());
  insert into public.profiles (id, display_name, department, is_active) values (uid, 'Demo Distributor', 'Distribution', true)
    on conflict (id) do update set display_name=excluded.display_name, is_active=true;
  delete from public.user_roles where user_id=uid and role='employee';
  insert into public.user_roles (user_id, role) values (uid, 'distributor') on conflict do nothing;
  -- attach demo retailer to this distributor + backfill their existing applications
  update public.profiles set distributor_id=uid where id=(select id from auth.users where email='retailer@bharatone.in');
end $$;
update public.service_applications sa set distributor_id = p.distributor_id,
  distributor_commission_amount = round(coalesce(sa.service_charge,0) * coalesce(s.distributor_commission,0)/100.0,2)
from public.profiles p, public.services s
where sa.submitted_by = p.id and sa.service_id = s.id and p.distributor_id is not null;
select email from auth.users where email='distributor@bharatone.in';
