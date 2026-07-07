-- Admin-managed "Inspired by" photo + tagline shown below the footer address.
-- image_path is an object key in the public "gallery" bucket (footer/ prefix).
create table if not exists public.footer_inspiration (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  tagline text not null default 'Inspired by',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.footer_inspiration enable row level security;
drop policy if exists footer_insp_public_read on public.footer_inspiration;
create policy footer_insp_public_read on public.footer_inspiration for select using (is_active = true);
drop policy if exists footer_insp_admin_all on public.footer_inspiration;
create policy footer_insp_admin_all on public.footer_inspiration for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
