-- Admin-managed homepage headlines (marquee) and testimonials.
create table if not exists public.headlines (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.headlines enable row level security;
drop policy if exists headlines_public_read on public.headlines;
create policy headlines_public_read on public.headlines for select using (is_active = true);
drop policy if exists headlines_admin_all on public.headlines;
create policy headlines_admin_all on public.headlines for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text,
  quote text not null,
  rating int not null default 5,
  initials text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select using (is_active = true);
drop policy if exists testimonials_admin_all on public.testimonials;
create policy testimonials_admin_all on public.testimonials for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
