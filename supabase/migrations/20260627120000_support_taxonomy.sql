-- CR-46: admin-managed support categories + sub-categories, and extra ticket fields.

create table if not exists public.support_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.support_categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extra fields captured on a ticket (category already exists).
alter table public.support_tickets add column if not exists department text;
alter table public.support_tickets add column if not exists service text;
alter table public.support_tickets add column if not exists subcategory text;

alter table public.support_categories enable row level security;
alter table public.support_subcategories enable row level security;

drop policy if exists support_categories_read on public.support_categories;
create policy support_categories_read on public.support_categories
  for select to anon, authenticated using (is_active or private.is_admin(auth.uid()));
drop policy if exists support_categories_admin on public.support_categories;
create policy support_categories_admin on public.support_categories
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop policy if exists support_subcategories_read on public.support_subcategories;
create policy support_subcategories_read on public.support_subcategories
  for select to anon, authenticated using (is_active or private.is_admin(auth.uid()));
drop policy if exists support_subcategories_admin on public.support_subcategories;
create policy support_subcategories_admin on public.support_subcategories
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

drop trigger if exists set_support_categories_updated_at on public.support_categories;
create trigger set_support_categories_updated_at before update on public.support_categories
  for each row execute function public.set_updated_at();
drop trigger if exists set_support_subcategories_updated_at on public.support_subcategories;
create trigger set_support_subcategories_updated_at before update on public.support_subcategories
  for each row execute function public.set_updated_at();

grant select on public.support_categories to anon, authenticated;
grant select on public.support_subcategories to anon, authenticated;
grant insert, update, delete on public.support_categories to authenticated;
grant insert, update, delete on public.support_subcategories to authenticated;

-- Seed a sensible default taxonomy (only when empty).
do $$
declare cid uuid;
begin
  if not exists (select 1 from public.support_categories) then
    insert into public.support_categories(name, sort_order) values ('Technical', 0) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'Login Issue',0),(cid,'App Error',1),(cid,'Performance',2);

    insert into public.support_categories(name, sort_order) values ('Payments', 1) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'Transaction Failed',0),(cid,'Refund',1),(cid,'Settlement',2);

    insert into public.support_categories(name, sort_order) values ('Wallet', 2) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'Top-up',0),(cid,'Balance Mismatch',1),(cid,'Withdrawal',2);

    insert into public.support_categories(name, sort_order) values ('Application', 3) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'Status Query',0),(cid,'Document Upload',1),(cid,'Rejection',2);

    insert into public.support_categories(name, sort_order) values ('Account', 4) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'Profile Update',0),(cid,'Password Reset',1),(cid,'KYC',2);

    insert into public.support_categories(name, sort_order) values ('Other', 5) returning id into cid;
    insert into public.support_subcategories(category_id, name, sort_order) values
      (cid,'General Query',0);
  end if;
end $$;
