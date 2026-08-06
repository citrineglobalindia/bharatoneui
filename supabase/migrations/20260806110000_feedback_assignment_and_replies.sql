-- Feedback: assignment and replies, mirroring what support tickets already have.
--
-- Tickets could be assigned to any user, the assignee was notified, could see
-- an inbox and could respond. Feedback had none of that: no assigned_to, no
-- reply mechanism at all, and only admin could touch a row — the person who
-- wrote the feedback got a status chip changing under them and nothing else.

alter table public.feedback
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists assigned_name text,
  add column if not exists updated_at timestamptz not null default now();

-- The assignee becomes a principal, exactly as on support_tickets.
create policy fb_assignee_sel on public.feedback for select to authenticated
  using (assigned_to = auth.uid());
create policy fb_assignee_upd on public.feedback for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- Replies. A thread table rather than a single response column, because a
-- feedback conversation is a conversation — the raiser can answer back.
create table if not exists public.feedback_replies (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  sender_name text,
  sender_role text,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_replies_fb_idx on public.feedback_replies (feedback_id, created_at);

alter table public.feedback_replies enable row level security;

-- Read/write: the feedback's owner, its assignee, or an admin. Same shape as
-- support_messages' policies.
create policy fbr_sel on public.feedback_replies for select to authenticated using (
  private.is_admin(auth.uid()) or exists (
    select 1 from public.feedback f
    where f.id = feedback_id and (f.user_id = auth.uid() or f.assigned_to = auth.uid())
  )
);
create policy fbr_ins on public.feedback_replies for insert to authenticated with check (
  sender_id = auth.uid() and (
    private.is_admin(auth.uid()) or exists (
      select 1 from public.feedback f
      where f.id = feedback_id and (f.user_id = auth.uid() or f.assigned_to = auth.uid())
    )
  )
);
grant select, insert on public.feedback_replies to authenticated;

-- Admin assigns. Follows assign_ticket: name from profiles, open -> reviewing,
-- notification to the assignee.
create or replace function public.assign_feedback(p_id uuid, p_assignee uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_name text;
  v_subject text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorised';
  end if;

  if p_assignee is null then
    update public.feedback set assigned_to = null, assigned_name = null, updated_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'unassigned', true);
  end if;

  select coalesce(display_name, 'Staff') into v_name from public.profiles where id = p_assignee;
  update public.feedback
     set assigned_to = p_assignee,
         assigned_name = v_name,
         status = case when status = 'open' then 'reviewing' else status end,
         updated_at = now()
   where id = p_id
   returning coalesce(subject, left(message, 60)) into v_subject;
  if not found then raise exception 'Feedback not found'; end if;

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (p_assignee, 'feedback', 'Feedback assigned to you', coalesce(v_subject, 'Feedback item'), '/feedback', 'feedback', p_id::text);

  return jsonb_build_object('ok', true, 'assigned_name', v_name);
end;
$$;

revoke all on function public.assign_feedback(uuid, uuid) from public, anon;
grant execute on function public.assign_feedback(uuid, uuid) to authenticated;

-- A reply notifies the other side of the conversation, mirroring tg_ticket_msg:
-- raiser replied -> tell the assignee (or admins if unassigned); anyone else
-- replied -> tell the raiser.
create or replace function public.tg_feedback_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.feedback%rowtype;
begin
  select * into f from public.feedback where id = new.feedback_id;
  if f.id is null then return new; end if;
  update public.feedback set updated_at = now() where id = f.id;
  if new.sender_id = f.user_id then
    if f.assigned_to is not null then
      insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
      values (f.assigned_to, 'feedback', 'Reply on feedback', left(new.body, 120), '/feedback', 'feedback', f.id::text);
    else
      perform public.notify_roles(array['admin'], 'feedback', 'Reply on feedback', left(new.body, 120), '/feedback', 'feedback', f.id::text);
    end if;
  elsif f.user_id is not null then
    insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
    values (f.user_id, 'feedback', 'Response to your feedback', left(new.body, 120), '/feedback', 'feedback', f.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_reply_notify on public.feedback_replies;
create trigger feedback_reply_notify
  after insert on public.feedback_replies
  for each row execute function public.tg_feedback_reply();
