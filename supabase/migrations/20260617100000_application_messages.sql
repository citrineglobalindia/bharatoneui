-- Retailer ↔ operator messaging on applications
create table if not exists public.application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.service_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text, sender_role text, body text not null,
  created_at timestamptz not null default now()
);
create index if not exists application_messages_app_idx on public.application_messages(application_id, created_at);
alter table public.application_messages enable row level security;
drop policy if exists am_select on public.application_messages;
create policy am_select on public.application_messages for select to authenticated using (
  private.is_admin(auth.uid())
  or exists (select 1 from public.service_applications sa where sa.id = application_id and (sa.submitted_by = auth.uid() or sa.assigned_operator = auth.uid())));
drop policy if exists am_insert on public.application_messages;
create policy am_insert on public.application_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and (private.is_admin(auth.uid())
       or exists (select 1 from public.service_applications sa where sa.id = application_id and (sa.submitted_by = auth.uid() or sa.assigned_operator = auth.uid()))));
