-- Staff requests: resignation and early salary.
--
-- Raised by the employee from My HR, decided by HR (or admin) from the HR
-- portal. Same review shape as leave: pending -> approved/rejected, with a
-- decision note, and the requester may withdraw while still pending.

create table if not exists public.hr_staff_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             text not null check (kind in ('resignation','early_salary')),
  reason           text not null,
  last_working_day date,
  amount           numeric(12,2) check (amount is null or amount > 0),
  needed_by        date,
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','withdrawn')),
  applied_at       timestamptz not null default now(),
  decided_by       uuid references auth.users(id) on delete set null,
  decided_at       timestamptz,
  decision_note    text
);
create index if not exists hr_staff_requests_user_idx on public.hr_staff_requests (user_id, applied_at desc);
create index if not exists hr_staff_requests_status_idx on public.hr_staff_requests (status, applied_at desc);

alter table public.hr_staff_requests enable row level security;

create policy hsr_sel on public.hr_staff_requests for select to authenticated
  using (user_id = auth.uid() or private.is_hr(auth.uid()));
create policy hsr_ins on public.hr_staff_requests for insert to authenticated
  with check (user_id = auth.uid() and private.is_staff_member(auth.uid()));
create policy hsr_withdraw on public.hr_staff_requests for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status in ('pending','withdrawn'));

grant select, insert, update on public.hr_staff_requests to authenticated;

create or replace function public.tg_hr_staff_request_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  select coalesce(display_name, 'Staff member') into v_name from public.profiles where id = new.user_id;
  perform public.notify_roles(array['hr_staff','admin'], 'hr',
    case new.kind when 'resignation' then 'Resignation submitted' else 'Early salary request' end,
    v_name || case new.kind
      when 'resignation' then ' has submitted their resignation' || coalesce(' (last working day ' || to_char(new.last_working_day, 'DD Mon YYYY') || ')', '')
      else ' has requested early salary' || coalesce(' of ₹' || new.amount::text, '') end,
    '/hr/requests', 'hr_request', new.id::text);
  return null;
end;
$$;

drop trigger if exists hr_staff_request_notify on public.hr_staff_requests;
create trigger hr_staff_request_notify
  after insert on public.hr_staff_requests
  for each row execute function public.tg_hr_staff_request_notify();

create or replace function public.hr_decide_staff_request(p_id uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare r public.hr_staff_requests%rowtype;
begin
  if not private.is_hr(auth.uid()) then
    raise exception 'Only HR can decide staff requests';
  end if;

  select * into r from public.hr_staff_requests where id = p_id;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'This request has already been %', r.status; end if;

  update public.hr_staff_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(coalesce(p_note,'')), '')
   where id = p_id;

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'hr',
          case r.kind when 'resignation' then 'Resignation ' else 'Early salary request ' end
            || case when p_approve then 'approved' else 'rejected' end,
          coalesce(nullif(btrim(coalesce(p_note,'')),''), 'Decision recorded by HR.'),
          '/hr/my-hr', 'hr_request', r.id::text);

  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

revoke all on function public.hr_decide_staff_request(uuid, boolean, text) from public, anon;
grant execute on function public.hr_decide_staff_request(uuid, boolean, text) to authenticated;
