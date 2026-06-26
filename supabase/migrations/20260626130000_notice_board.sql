-- CR-BHO-48: scrolling notice board for the retailer dashboard, managed from admin.
create table if not exists public.notice_board (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notice_board enable row level security;

-- Anyone (incl. retailers) may read active notices; admins read everything.
drop policy if exists notice_board_read on public.notice_board;
create policy notice_board_read on public.notice_board
  for select to anon, authenticated
  using (is_active or private.is_admin(auth.uid()));

-- Only admins can add / edit / delete.
drop policy if exists notice_board_admin_all on public.notice_board;
create policy notice_board_admin_all on public.notice_board
  for all to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

drop trigger if exists set_notice_board_updated_at on public.notice_board;
create trigger set_notice_board_updated_at
  before update on public.notice_board
  for each row execute function public.set_updated_at();

grant select on public.notice_board to anon, authenticated;
grant insert, update, delete on public.notice_board to authenticated;
