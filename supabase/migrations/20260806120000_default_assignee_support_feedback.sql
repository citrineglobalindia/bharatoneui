-- Default assignee for support tickets and feedback.
--
-- Admin can name one user per queue; anything raised without an assignee goes
-- to that person immediately, with the same notification a manual assignment
-- sends. Partner accounts — retailer, distributor, master-distributor — can
-- never be the assignee: they are customers of these queues, not handlers.

create or replace function private.is_assignable(_uid uuid)
returns boolean
language sql stable security definer
set search_path = public, private
as $fn$
  select exists (select 1 from public.user_roles r where r.user_id = _uid)
     and not exists (
       select 1 from public.user_roles r
       where r.user_id = _uid
         and r.role::text in ('retailer','distributor','master-distributor')
     )
$fn$;

-- Admin sets (or clears) the default for one queue.
create or replace function public.set_default_assignee(p_kind text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_key  text;
  v_name text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  if p_kind not in ('support','feedback') then
    raise exception 'Unknown queue';
  end if;
  v_key := p_kind || '_default_assignee';

  if p_user is null then
    delete from public.app_settings where key = v_key;
    return jsonb_build_object('ok', true, 'cleared', true);
  end if;

  if not private.is_assignable(p_user) then
    raise exception 'Retailers, distributors and master distributors cannot be assignees';
  end if;

  select coalesce(display_name, 'Staff') into v_name from public.profiles where id = p_user;

  insert into public.app_settings (key, value) values (v_key, p_user::text)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('ok', true, 'assigned_name', v_name);
end;
$$;

revoke all on function public.set_default_assignee(text, uuid) from public, anon;
grant execute on function public.set_default_assignee(text, uuid) to authenticated;

-- Resolve the configured default, re-checking eligibility at use time: if the
-- chosen person later gained a partner role or lost their account, the default
-- silently lapses rather than routing queries to someone who should not hold them.
create or replace function private.default_assignee_for(p_kind text)
returns uuid
language sql stable security definer
set search_path = public, private
as $fn$
  select case
    when s.value ~ '^[0-9a-f-]{36}$' and private.is_assignable(s.value::uuid) then s.value::uuid
    else null
  end
  from public.app_settings s
  where s.key = p_kind || '_default_assignee'
$fn$;

-- New support ticket with no assignee -> the default, before insert so the row
-- lands already assigned.
create or replace function public.tg_ticket_default_assignee()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_who uuid; v_name text;
begin
  if new.assigned_to is null then
    v_who := private.default_assignee_for('support');
    if v_who is not null and v_who <> new.user_id then
      select coalesce(display_name,'Staff') into v_name from public.profiles where id = v_who;
      new.assigned_to := v_who;
      new.assigned_name := v_name;
      new.status := case when new.status = 'open' then 'in_progress' else new.status end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_default_assignee on public.support_tickets;
create trigger ticket_default_assignee
  before insert on public.support_tickets
  for each row execute function public.tg_ticket_default_assignee();

-- The BEFORE INSERT path never passes through the UPDATE-diff notification in
-- tg_ticket_after, so notify the default assignee explicitly.
create or replace function public.tg_ticket_default_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null and new.assigned_to <> new.user_id then
    insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
    values (new.assigned_to, 'support', 'Ticket assigned to you',
            coalesce(new.ticket_no,'Ticket') || ': ' || new.subject, '/support', 'ticket', new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_default_notify on public.support_tickets;
create trigger ticket_default_notify
  after insert on public.support_tickets
  for each row execute function public.tg_ticket_default_notify();

-- Same pair for feedback.
create or replace function public.tg_feedback_default_assignee()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_who uuid; v_name text;
begin
  if new.assigned_to is null then
    v_who := private.default_assignee_for('feedback');
    if v_who is not null and v_who is distinct from new.user_id then
      select coalesce(display_name,'Staff') into v_name from public.profiles where id = v_who;
      new.assigned_to := v_who;
      new.assigned_name := v_name;
      new.status := case when new.status = 'open' then 'reviewing' else new.status end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_default_assignee on public.feedback;
create trigger feedback_default_assignee
  before insert on public.feedback
  for each row execute function public.tg_feedback_default_assignee();

create or replace function public.tg_feedback_default_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from new.user_id then
    insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
    values (new.assigned_to, 'feedback', 'Feedback assigned to you',
            coalesce(new.subject, left(new.message, 60)), '/feedback', 'feedback', new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_default_notify on public.feedback;
create trigger feedback_default_notify
  after insert on public.feedback
  for each row execute function public.tg_feedback_default_notify();

-- Manual assignment must obey the same bar. assign_ticket predates this and
-- accepted anyone; assign_feedback gets the check too.
create or replace function public.assign_ticket(p_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v_name text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  if not private.is_assignable(p_assignee) then
    raise exception 'Retailers, distributors and master distributors cannot be assignees';
  end if;
  select coalesce(display_name,'Staff') into v_name from public.profiles where id=p_assignee;
  update public.support_tickets set assigned_to=p_assignee, assigned_name=v_name,
    status=case when status='open' then 'in_progress' else status end, updated_at=now() where id=p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.assign_feedback(p_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v_name text; v_subject text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  if p_assignee is null then
    update public.feedback set assigned_to = null, assigned_name = null, updated_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'unassigned', true);
  end if;
  if not private.is_assignable(p_assignee) then
    raise exception 'Retailers, distributors and master distributors cannot be assignees';
  end if;
  select coalesce(display_name, 'Staff') into v_name from public.profiles where id = p_assignee;
  update public.feedback
     set assigned_to = p_assignee, assigned_name = v_name,
         status = case when status = 'open' then 'reviewing' else status end,
         updated_at = now()
   where id = p_id
   returning coalesce(subject, left(message, 60)) into v_subject;
  if not found then raise exception 'Feedback not found'; end if;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (p_assignee, 'feedback', 'Feedback assigned to you', coalesce(v_subject, 'Feedback item'), '/feedback', 'feedback', p_id::text);
  return jsonb_build_object('ok', true, 'assigned_name', v_name);
end $$;
