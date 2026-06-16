-- service type + internal route for backend services
alter table public.services add column if not exists service_type text not null default 'inlink'
  check (service_type in ('inlink','api','backend'));
alter table public.services add column if not exists backend_route text;

-- admin-only API integration config (stores a SECRET NAME, never the raw key)
create table if not exists public.service_api_config (
  service_id      uuid primary key references public.services(id) on delete cascade,
  endpoint        text,
  method          text not null default 'POST',
  auth_type       text not null default 'apikey' check (auth_type in ('none','apikey','bearer')),
  auth_header     text default 'Authorization',
  secret_ref      text,                       -- name of the Supabase Edge Function secret holding the key
  request_template jsonb not null default '{}'::jsonb,
  notes           text,
  updated_at      timestamptz not null default now()
);
alter table public.service_api_config enable row level security;
drop policy if exists "Admins manage api config" on public.service_api_config;
create policy "Admins manage api config" on public.service_api_config for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
grant all on public.service_api_config to authenticated, service_role;
