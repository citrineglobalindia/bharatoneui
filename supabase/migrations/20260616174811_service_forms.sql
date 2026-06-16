-- backend services carry a form schema the admin designs
alter table public.services add column if not exists form_schema jsonb not null default '[]'::jsonb;

-- retailer form submissions
create table if not exists public.service_submissions (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid references public.services(id) on delete cascade,
  service_name  text,
  submitted_by  uuid references auth.users(id),
  submitter_name text,
  data          jsonb not null default '{}'::jsonb,
  status        text not null default 'submitted' check (status in ('submitted','in_progress','completed','rejected')),
  created_at    timestamptz not null default now()
);
create index if not exists service_submissions_idx on public.service_submissions (service_id, created_at desc);
create index if not exists service_submissions_user_idx on public.service_submissions (submitted_by, created_at desc);

alter table public.service_submissions enable row level security;
drop policy if exists "Users insert own submissions" on public.service_submissions;
drop policy if exists "Users see own submissions"   on public.service_submissions;
drop policy if exists "Staff see all submissions"    on public.service_submissions;
create policy "Users insert own submissions" on public.service_submissions for insert to authenticated
  with check (submitted_by = auth.uid());
create policy "Users see own submissions" on public.service_submissions for select to authenticated
  using (submitted_by = auth.uid());
create policy "Staff see all submissions" on public.service_submissions for select to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));
create policy "Staff update submissions" on public.service_submissions for update to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc'))
  with check (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc'));
grant select, insert, update on public.service_submissions to authenticated;
grant all on public.service_submissions to service_role;
