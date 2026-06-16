create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  logo_url     text,
  redirect_url text not null,
  category     text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists services_active_idx on public.services (is_active, sort_order);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;
drop policy if exists "View active services" on public.services;
drop policy if exists "Admins manage services" on public.services;
create policy "View active services" on public.services for select to anon, authenticated
  using (is_active or private.is_admin(auth.uid()));
create policy "Admins manage services" on public.services for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;

-- public bucket for service logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-logos','service-logos', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml','image/gif'])
on conflict (id) do update set public = true;

drop policy if exists "Admins upload service logos" on storage.objects;
create policy "Admins upload service logos" on storage.objects for insert to authenticated
  with check (bucket_id='service-logos' and private.is_admin(auth.uid()));
drop policy if exists "Admins update service logos" on storage.objects;
create policy "Admins update service logos" on storage.objects for update to authenticated
  using (bucket_id='service-logos' and private.is_admin(auth.uid()));
drop policy if exists "Admins delete service logos" on storage.objects;
create policy "Admins delete service logos" on storage.objects for delete to authenticated
  using (bucket_id='service-logos' and private.is_admin(auth.uid()));
