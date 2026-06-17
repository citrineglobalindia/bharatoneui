-- Bucket for files uploaded by retailers on applications
insert into storage.buckets (id, name, public, file_size_limit)
values ('application-files', 'application-files', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800;
drop policy if exists af_insert on storage.objects;
create policy af_insert on storage.objects for insert to authenticated with check (bucket_id = 'application-files');
drop policy if exists af_select on storage.objects;
create policy af_select on storage.objects for select to authenticated using (bucket_id = 'application-files');

-- Admin-managed legacy JSKO accounts
create table if not exists public.jsko_legacy_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  email text, mobile text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.jsko_legacy_accounts enable row level security;
drop policy if exists jsko_admin on public.jsko_legacy_accounts;
create policy jsko_admin on public.jsko_legacy_accounts for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create or replace function public.fetch_jsko_account(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.jsko_legacy_accounts;
begin
  select * into r from public.jsko_legacy_accounts where lower(username)=lower(trim(p_username)) and is_active;
  if not found then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'username', r.username, 'full_name', r.full_name, 'email', r.email, 'mobile', r.mobile);
end $$;
grant execute on function public.fetch_jsko_account(text) to anon, authenticated;
