-- Admin-managed "Awarded & Recognized By" section on the public site.
-- logo_path / certificate_path are object keys in the public "gallery" bucket
-- (awards/ prefix). certificate_path is optional (shown enlarged on click).
create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text not null,
  certificate_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.awards enable row level security;

drop policy if exists awards_public_read on public.awards;
create policy awards_public_read on public.awards
  for select using (is_active = true);

drop policy if exists awards_admin_all on public.awards;
create policy awards_admin_all on public.awards
  for all using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));
