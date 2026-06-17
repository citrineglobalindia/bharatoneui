-- Operator role: each category is handled by an operator who receives its applications.
alter type public.app_role add value if not exists 'operator';

alter table public.service_categories add column if not exists operator_id uuid references auth.users(id) on delete set null;
alter table public.service_applications add column if not exists assigned_operator uuid references auth.users(id) on delete set null;

-- Route each new application to its category's operator
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services;
  v_cat public.service_categories;
  v_no text;
  v_id uuid;
  v_name text;
  v_comm numeric(12,2);
begin
  select * into v_svc from public.services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  begin select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid(); exception when others then v_name := null; end;
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

  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted', 'commission_price', v_comm);
end $$;
grant execute on function public.submit_service_application(jsonb) to authenticated;

-- Operators can see + update only the applications routed to them
drop policy if exists app_select on public.service_applications;
create policy app_select on public.service_applications for select to authenticated
  using (submitted_by = auth.uid() or assigned_operator = auth.uid()
    or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')
    or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));
drop policy if exists app_update on public.service_applications;
create policy app_update on public.service_applications for update to authenticated
  using (private.is_admin(auth.uid()) or assigned_operator = auth.uid()
    or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc'));
