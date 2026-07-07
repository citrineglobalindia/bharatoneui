-- Admin-managed downloadable distributor onboarding forms.
-- form_* = blank form the applicant fills; sample_* = a filled example.
-- Files live in the public "gallery" bucket (forms/ prefix).
create table if not exists public.distributor_forms (
  id uuid primary key default gen_random_uuid(),
  form_path text,
  form_name text,
  sample_path text,
  sample_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.distributor_forms enable row level security;
drop policy if exists distform_public_read on public.distributor_forms;
create policy distform_public_read on public.distributor_forms for select using (is_active = true);
drop policy if exists distform_admin_all on public.distributor_forms;
create policy distform_admin_all on public.distributor_forms for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
