create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text, user_role text,
  category text, priority text default 'Low',
  subject text not null, body text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id) on delete set null, assigned_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create sequence if not exists public.support_ticket_seq;
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text, sender_role text, body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_msg_idx on public.support_messages(ticket_id, created_at);
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists st_sel on public.support_tickets;
create policy st_sel on public.support_tickets for select to authenticated using (user_id=auth.uid() or assigned_to=auth.uid() or private.is_admin(auth.uid()));
drop policy if exists st_ins on public.support_tickets;
create policy st_ins on public.support_tickets for insert to authenticated with check (user_id=auth.uid());
drop policy if exists st_upd on public.support_tickets;
create policy st_upd on public.support_tickets for update to authenticated using (private.is_admin(auth.uid()) or assigned_to=auth.uid());

drop policy if exists sm_sel on public.support_messages;
create policy sm_sel on public.support_messages for select to authenticated using (
  private.is_admin(auth.uid()) or exists (select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or t.assigned_to=auth.uid())));
drop policy if exists sm_ins on public.support_messages;
create policy sm_ins on public.support_messages for insert to authenticated with check (
  sender_id=auth.uid() and (private.is_admin(auth.uid()) or exists (select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or t.assigned_to=auth.uid()))));

-- ticket number + notify admins on create
create or replace function public.tg_ticket_ins() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if NEW.ticket_no is null then NEW.ticket_no := 'TKT'||lpad(nextval('public.support_ticket_seq')::text,6,'0'); end if;
  return NEW;
end $$;
drop trigger if exists trg_ticket_no on public.support_tickets;
create trigger trg_ticket_no before insert on public.support_tickets for each row execute function public.tg_ticket_ins();

create or replace function public.tg_ticket_after() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='INSERT' then
    perform public.notify_roles(array['admin'],'support','New support ticket',NEW.ticket_no||': '||NEW.subject||' ('||coalesce(NEW.user_name,'user')||')','/admin','ticket',NEW.id::text);
    perform public._audit('ticket.create','support_ticket',NEW.id::text, coalesce(NEW.user_name,'User')||' raised '||NEW.ticket_no);
  elsif TG_OP='UPDATE' then
    if NEW.status is distinct from OLD.status then
      insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (NEW.user_id,'support','Ticket '||replace(NEW.status,'_',' '),NEW.ticket_no||' is now '||replace(NEW.status,'_',' ')||'.','/support','ticket',NEW.id::text);
      perform public._audit('ticket.status','support_ticket',NEW.id::text, NEW.ticket_no||' → '||NEW.status);
    end if;
    if NEW.assigned_to is distinct from OLD.assigned_to and NEW.assigned_to is not null then
      insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (NEW.assigned_to,'support','Ticket assigned to you',NEW.ticket_no||': '||NEW.subject,'/support','ticket',NEW.id::text);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_ticket_after on public.support_tickets;
create trigger trg_ticket_after after insert or update on public.support_tickets for each row execute function public.tg_ticket_after();

-- notify the counterpart on new message
create or replace function public.tg_ticket_msg() returns trigger language plpgsql security definer set search_path=public as $$
declare t public.support_tickets; recip uuid;
begin
  select * into t from public.support_tickets where id=NEW.ticket_id;
  recip := case when NEW.sender_id = t.user_id then coalesce(t.assigned_to, null) else t.user_id end;
  if recip is not null and recip <> NEW.sender_id then
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
    values (recip,'support','New reply on '||t.ticket_no,left(NEW.body,120), case when recip=t.user_id then '/support' else '/support' end,'ticket',t.id::text);
  end if;
  if NEW.sender_id = t.user_id and t.assigned_to is null then
    perform public.notify_roles(array['admin'],'support','New reply on '||t.ticket_no,left(NEW.body,120),'/admin','ticket',t.id::text);
  end if;
  return null;
end $$;
drop trigger if exists trg_ticket_msg on public.support_messages;
create trigger trg_ticket_msg after insert on public.support_messages for each row execute function public.tg_ticket_msg();

create or replace function public.assign_ticket(p_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  select coalesce(display_name,'Staff') into v_name from public.profiles where id=p_assignee;
  update public.support_tickets set assigned_to=p_assignee, assigned_name=v_name, status=case when status='open' then 'in_progress' else status end, updated_at=now() where id=p_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.assign_ticket(uuid, uuid) to authenticated;
select 'support system OK' as status;
