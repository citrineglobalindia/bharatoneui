-- ============================================================
-- BharatOne UI — Complete Backend Schema
-- Target: Supabase / Postgres 17
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ---------- 0. Extensions ----------
create extension if not exists pgcrypto with schema extensions;

-- ---------- 1. Roles enum ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('hr_staff', 'manager', 'employee', 'admin');
  end if;
end$$;

-- Ensure all expected values exist (in case the type pre-existed)
alter type public.app_role add value if not exists 'hr_staff';
alter type public.app_role add value if not exists 'manager';
alter type public.app_role add value if not exists 'employee';
alter type public.app_role add value if not exists 'admin';

-- ---------- 2. Private schema (for SECURITY DEFINER helpers) ----------
create schema if not exists private;

-- ---------- 3. profiles ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  department    text not null default 'General',
  designation   text,
  employee_code text unique,
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- 4. user_roles ----------
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- ---------- 5. admin_audit_logs ----------
create table if not exists public.admin_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid,
  actor_name     text not null,
  module         text not null,
  action         text not null,
  target_type    text,
  target_id      text,
  before_changes jsonb,
  after_changes  jsonb,
  metadata       jsonb not null default '{}'::jsonb,
  outcome        text not null default 'success' check (outcome in ('success', 'failure')),
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx     on public.admin_audit_logs (actor_user_id, created_at desc);
create index if not exists admin_audit_logs_module_idx    on public.admin_audit_logs (module, created_at desc);
create index if not exists admin_audit_logs_target_idx    on public.admin_audit_logs (target_type, target_id);

-- ============================================================
-- 6. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================

-- Generic role check
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Admin check (used by RLS policies)
create or replace function private.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role::text = 'admin'
  );
$$;

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- auto-provision profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, department, designation, employee_code)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'department', ''), 'General'),
    nullif(new.raw_user_meta_data->>'designation', ''),
    nullif(new.raw_user_meta_data->>'employee_code', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (
    new.id,
    coalesce((nullif(new.raw_user_meta_data->>'role', ''))::public.app_role, 'employee')
  )
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- immutability guard for audit logs
create or replace function public.prevent_admin_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Admin audit logs are immutable';
end;
$$;

-- ============================================================
-- 7. Triggers
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists prevent_admin_audit_log_update on public.admin_audit_logs;
create trigger prevent_admin_audit_log_update
  before update on public.admin_audit_logs
  for each row execute function public.prevent_admin_audit_log_mutation();

drop trigger if exists prevent_admin_audit_log_delete on public.admin_audit_logs;
create trigger prevent_admin_audit_log_delete
  before delete on public.admin_audit_logs
  for each row execute function public.prevent_admin_audit_log_mutation();

-- ============================================================
-- 8. Row Level Security
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.admin_audit_logs enable row level security;

-- ----- profiles -----
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Admins can view all profiles"  on public.profiles;
drop policy if exists "Users can update own profile"  on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can insert profiles"    on public.profiles;
drop policy if exists "Admins can delete profiles"    on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (private.is_admin(auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

create policy "Admins can insert profiles"
  on public.profiles for insert to authenticated
  with check (private.is_admin(auth.uid()));

create policy "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using (private.is_admin(auth.uid()));

-- ----- user_roles (privilege-escalation-safe: only admins write) -----
drop policy if exists "Users can view own roles" on public.user_roles;
drop policy if exists "Admins can view all roles" on public.user_roles;
drop policy if exists "Admins can manage roles"   on public.user_roles;

create policy "Users can view own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using (private.is_admin(auth.uid()));

create policy "Admins can manage roles"
  on public.user_roles for all to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- ----- admin_audit_logs (read-only for admins; inserts via service_role) -----
drop policy if exists "Administrators can view audit logs" on public.admin_audit_logs;

create policy "Administrators can view audit logs"
  on public.admin_audit_logs for select to authenticated
  using (private.is_admin(auth.uid()));

-- ============================================================
-- 9. Grants
-- ============================================================
grant usage on schema public to authenticated, anon;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant all  on public.user_roles to service_role;
grant select on public.admin_audit_logs to authenticated;
grant all  on public.admin_audit_logs to service_role;
grant all  on public.profiles to service_role;

-- done.
