-- Unify catalog into the existing `services` table (which already drives the
-- inlink / api-integrated / backend retailer launcher). Each service now also
-- carries a category + total cost + commission split (percentages summing to 100%).
alter table public.services alter column redirect_url drop not null;
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id) on delete set null,
  add column if not exists service_charge numeric(12,2) not null default 0,
  add column if not exists company_commission numeric(12,2) not null default 0,
  add column if not exists distributor_commission numeric(12,2) not null default 0,
  add column if not exists dro_commission numeric(12,2) not null default 0,
  add column if not exists tro_commission numeric(12,2) not null default 0,
  add column if not exists retailer_commission numeric(12,2) not null default 0;

-- service_applications now reference services (catalog_services table is dropped)
alter table public.service_applications drop constraint if exists service_applications_service_id_fkey;
alter table public.service_applications
  add constraint service_applications_service_id_fkey foreign key (service_id) references public.services(id);

drop table if exists public.catalog_services cascade;

-- submit RPC reads from services; commission_price = service_charge * retailer% / 100
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services;
  v_cat_name text;
  v_no text;
  v_id uuid;
  v_name text;
  v_comm numeric(12,2);
begin
  select * into v_svc from public.services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select name into v_cat_name from public.service_categories where id = v_svc.category_id;
  v_cat_name := coalesce(v_cat_name, v_svc.category);
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
