-- Products/Services (mapped to a category + sub-category) and custom Priorities
-- for the Raise Support Ticket form, plus ticket attachment support.

create table if not exists public.support_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.support_categories(id) on delete cascade,
  subcategory_id uuid references public.support_subcategories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_priorities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets add column if not exists product text;
alter table public.support_tickets add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.support_products enable row level security;
alter table public.support_priorities enable row level security;

drop policy if exists support_products_read on public.support_products;
create policy support_products_read on public.support_products
  for select to anon, authenticated using (is_active or private.is_admin(auth.uid()));
drop policy if exists support_products_admin on public.support_products;
create policy support_products_admin on public.support_products
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop policy if exists support_priorities_read on public.support_priorities;
create policy support_priorities_read on public.support_priorities
  for select to anon, authenticated using (is_active or private.is_admin(auth.uid()));
drop policy if exists support_priorities_admin on public.support_priorities;
create policy support_priorities_admin on public.support_priorities
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop trigger if exists set_support_products_updated_at on public.support_products;
create trigger set_support_products_updated_at before update on public.support_products
  for each row execute function public.set_updated_at();
drop trigger if exists set_support_priorities_updated_at on public.support_priorities;
create trigger set_support_priorities_updated_at before update on public.support_priorities
  for each row execute function public.set_updated_at();

grant select on public.support_products to anon, authenticated;
grant select on public.support_priorities to anon, authenticated;
grant insert, update, delete on public.support_products to authenticated;
grant insert, update, delete on public.support_priorities to authenticated;

insert into public.support_priorities (name, sort_order)
select * from (values ('Low',0),('Medium',1),('High',2),('Critical',3)) v(name, sort_order)
where not exists (select 1 from public.support_priorities);

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

drop policy if exists support_attach_read on storage.objects;
create policy support_attach_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'support-attachments');
drop policy if exists support_attach_write on storage.objects;
create policy support_attach_write on storage.objects
  for insert to authenticated with check (bucket_id = 'support-attachments');
