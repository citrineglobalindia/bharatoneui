-- New support tickets have always notified every admin (tg_ticket_after).
-- New feedback notified nobody at all unless a default assignee was set —
-- an admin only discovered it by opening the Feedback screen. Same courtesy
-- for both queues.
create or replace function public.tg_feedback_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_roles(
    array['admin'], 'feedback', 'New feedback',
    coalesce(new.subject, left(new.message, 60)) || ' (' || coalesce(new.name, 'user') || ')',
    '/admin', 'feedback', new.id::text);
  return null;
end;
$$;

drop trigger if exists feedback_after_insert on public.feedback;
create trigger feedback_after_insert
  after insert on public.feedback
  for each row execute function public.tg_feedback_after_insert();
