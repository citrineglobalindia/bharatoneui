-- Service catalog: categories, services (with charges + commission splits), applications
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  name text not null,
  description text,
  service_charge numeric(12,2) not null default 0,
  company_commission numeric(12,2) not null default 0,
  distributor_commission numeric(12,2) not null default 0,
  tro_commission numeric(12,2) not null default 0,
  dro_commission numeric(12,2) not null default 0,
  retailer_commission numeric(12,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.service_app_seq;

create table if not exists public.service_applications (
  id uuid primary key default gen_random_uuid(),
  application_no text unique not null,
  category_id uuid references public.service_categories(id),
  service_id uuid references public.catalog_services(id),
  category_name text,
  service_name text,
  full_name text not null,
  father_name text,
  gender text,
  email text,
  phone text,
  address text,
  aadhaar_number text,
  pan_number text,
  service_charge numeric(12,2) not null default 0,
  commission_price numeric(12,2) not null default 0,
  status text not null default 'submitted',
  submitted_by uuid references auth.users(id),
  submitter_name text,
  created_at timestamptz not null default now()
);

alter table public.service_categories enable row level security;
alter table public.catalog_services enable row level security;
alter table public.service_applications enable row level security;

-- Read active catalog (anon + authenticated); admin sees all and manages
drop policy if exists cat_read on public.service_categories;
create policy cat_read on public.service_categories for select to anon, authenticated
  using (is_active or private.is_admin(auth.uid()));
drop policy if exists cat_admin on public.service_categories;
create policy cat_admin on public.service_categories for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop policy if exists svc_read on public.catalog_services;
create policy svc_read on public.catalog_services for select to anon, authenticated
  using (is_active or private.is_admin(auth.uid()));
drop policy if exists svc_admin on public.catalog_services;
create policy svc_admin on public.catalog_services for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Applications: retailer inserts/sees own; staff see all; admin/accountant/qc update
drop policy if exists app_insert on public.service_applications;
create policy app_insert on public.service_applications for insert to authenticated
  with check (submitted_by = auth.uid());
drop policy if exists app_select on public.service_applications;
create policy app_select on public.service_applications for select to authenticated
  using (submitted_by = auth.uid()
    or private.is_admin(auth.uid())
    or public.has_role(auth.uid(),'accountant')
    or public.has_role(auth.uid(),'qc')
    or public.has_role(auth.uid(),'telecaller'));
drop policy if exists app_update on public.service_applications;
create policy app_update on public.service_applications for update to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc'));

-- Submit RPC: looks up service, fills charge + retailer commission, generates application_no
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.catalog_services;
  v_cat_name text;
  v_no text;
  v_id uuid;
  v_name text;
begin
  select * into v_svc from public.catalog_services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select name into v_cat_name from public.service_categories where id = v_svc.category_id;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();

  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name
  ) values (
    v_no, v_svc.category_id, v_svc.id, v_cat_name, v_svc.name,
    payload->>'full_name', payload->>'father_name', payload->>'gender', payload->>'email',
    payload->>'phone', payload->>'address', payload->>'aadhaar_number', payload->>'pan_number',
    v_svc.service_charge, v_svc.retailer_commission, 'submitted', auth.uid(), v_name
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted');
end $$;

grant execute on function public.submit_service_application(jsonb) to authenticated;
