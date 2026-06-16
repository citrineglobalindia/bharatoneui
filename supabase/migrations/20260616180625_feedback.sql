create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  name        text,
  role        text,
  category    text not null default 'general',
  subject     text,
  message     text not null,
  status      text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
drop policy if exists "Users submit feedback" on public.feedback;
drop policy if exists "Users see own feedback" on public.feedback;
drop policy if exists "Staff see all feedback" on public.feedback;
drop policy if exists "Admins update feedback" on public.feedback;
create policy "Users submit feedback" on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy "Users see own feedback" on public.feedback for select to authenticated using (user_id = auth.uid());
create policy "Staff see all feedback" on public.feedback for select to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));
create policy "Admins update feedback" on public.feedback for update to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
grant select, insert, update on public.feedback to authenticated;
grant all on public.feedback to service_role;
