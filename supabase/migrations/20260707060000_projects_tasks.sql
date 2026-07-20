-- Projects → Tasks with client (token-link) approval.
-- Admin creates a project and its tasks; the client opens a secure approval link
-- (/project-approval/<approval_token>) and approves/rejects each task.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  client_email text,
  approval_token uuid not null default gen_random_uuid(),
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create unique index if not exists projects_approval_token_idx on public.projects(approval_token);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  client_comment text,
  decided_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_tasks_project_idx on public.project_tasks(project_id);

alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;

drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
drop policy if exists ptasks_admin_all on public.project_tasks;
create policy ptasks_admin_all on public.project_tasks for all
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create or replace function public.get_project_for_approval(_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.projects; t jsonb;
begin
  select * into p from public.projects where approval_token=_token;
  if p.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'description', description,
      'status', status, 'client_comment', client_comment, 'decided_at', decided_at
    ) order by sort_order, created_at), '[]'::jsonb)
    into t from public.project_tasks where project_id=p.id;
  return jsonb_build_object('name', p.name, 'client_name', p.client_name, 'status', p.status, 'tasks', t);
end $function$;
grant execute on function public.get_project_for_approval(uuid) to anon, authenticated;

create or replace function public.decide_project_task(_token uuid, _task_id uuid, _decision text, _comment text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_pid uuid;
begin
  if _decision not in ('approved','rejected') then raise exception 'INVALID_DECISION'; end if;
  select id into v_pid from public.projects where approval_token=_token;
  if v_pid is null then raise exception 'INVALID_OR_EXPIRED_LINK'; end if;
  update public.project_tasks
     set status=_decision, client_comment=nullif(trim(coalesce(_comment,'')),''), decided_at=now()
   where id=_task_id and project_id=v_pid;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  return jsonb_build_object('ok', true, 'status', _decision);
end $function$;
grant execute on function public.decide_project_task(uuid, uuid, text, text) to anon, authenticated;
