-- Configurable proximity radius: no two retailers within N km
create table if not exists public.app_settings (key text primary key, value text, updated_at timestamptz default now());
insert into public.app_settings(key,value) values ('retailer_radius_km','2') on conflict (key) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists as_read on public.app_settings;
create policy as_read on public.app_settings for select to anon, authenticated using (true);
drop policy if exists as_admin on public.app_settings;
create policy as_admin on public.app_settings for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
-- haversine _km(), check_retailer_location(), tg_proximity trigger, set_retailer_radius() — bodies as deployed
