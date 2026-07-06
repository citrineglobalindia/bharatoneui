-- Service Catalog v2: Category -> Sub-Category -> Service.
-- Additive only (safe alongside current live code, which ignores these).
create table if not exists public.service_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_subcategories_cat_idx on public.service_subcategories(category_id);

alter table public.services add column if not exists subcategory_id uuid references public.service_subcategories(id) on delete set null;

alter table public.service_subcategories enable row level security;

drop policy if exists service_subcategories_read on public.service_subcategories;
create policy service_subcategories_read on public.service_subcategories
  for select to anon, authenticated using (is_active or private.is_admin(auth.uid()));
drop policy if exists service_subcategories_admin on public.service_subcategories;
create policy service_subcategories_admin on public.service_subcategories
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop trigger if exists set_service_subcategories_updated_at on public.service_subcategories;
create trigger set_service_subcategories_updated_at before update on public.service_subcategories
  for each row execute function public.set_updated_at();

grant select on public.service_subcategories to anon, authenticated;
grant insert, update, delete on public.service_subcategories to authenticated;
