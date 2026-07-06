-- Admin-managed hero carousel images for the public homepage.
-- image_path is the object key in the public "gallery" bucket (hero/ prefix).
create table if not exists public.hero_images (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.hero_images enable row level security;

drop policy if exists hero_public_read on public.hero_images;
create policy hero_public_read on public.hero_images
  for select using (is_active = true);

drop policy if exists hero_admin_all on public.hero_images;
create policy hero_admin_all on public.hero_images
  for all using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));
