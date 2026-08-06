-- Star rating on resolved support tickets.
--
-- Once the assignee marks a ticket resolved, the person who raised it scores
-- the help they received, 1-5 stars with an optional comment. The rating is
-- visible wherever the ticket is: the raiser's own view, the assignee's inbox
-- and the admin Support Center.

alter table public.support_tickets
  add column if not exists rating int check (rating between 1 and 5),
  add column if not exists rating_comment text,
  add column if not exists rated_at timestamptz;

create or replace function public.rate_support_ticket(p_id uuid, p_rating int, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  t public.support_tickets%rowtype;
begin
  select * into t from public.support_tickets where id = p_id;
  if t.id is null then raise exception 'Ticket not found'; end if;

  -- Only the person who raised the ticket judges the help they received.
  if t.user_id <> auth.uid() then
    raise exception 'Only the person who raised the ticket can rate it';
  end if;
  if t.status not in ('resolved','closed') then
    raise exception 'You can rate once the ticket is resolved';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5 stars';
  end if;
  -- One verdict per ticket. A rating that can be quietly edited later is not a
  -- record of how the resolution felt at the time.
  if t.rating is not null then
    raise exception 'This ticket has already been rated';
  end if;

  update public.support_tickets
     set rating = p_rating,
         rating_comment = nullif(btrim(coalesce(p_comment,'')), ''),
         rated_at = now(),
         updated_at = now()
   where id = p_id;

  -- The person who did the work hears the verdict; admins see it too.
  if t.assigned_to is not null then
    insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
    values (t.assigned_to, 'support',
            'Your resolution was rated ' || p_rating || ' star' || case when p_rating = 1 then '' else 's' end,
            t.ticket_no || ': ' || t.subject, '/support', 'ticket', t.id::text);
  end if;
  perform public.notify_roles(array['admin'], 'support',
            'Ticket rated ' || p_rating || '/5',
            t.ticket_no || ' by ' || coalesce(t.user_name, 'user'), '/admin', 'ticket', t.id::text);

  return jsonb_build_object('ok', true, 'rating', p_rating);
end;
$$;

revoke all on function public.rate_support_ticket(uuid, int, text) from public, anon;
grant execute on function public.rate_support_ticket(uuid, int, text) to authenticated;
