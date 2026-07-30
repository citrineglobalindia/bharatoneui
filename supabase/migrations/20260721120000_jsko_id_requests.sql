-- JSKO ID requests
-- ---------------------------------------------------------------------------
-- A retailer whose profile shows no JSKO ID can raise a request; an admin
-- approves it and the ID is generated at that moment.
--
-- Where the generated ID lands
-- ----------------------------
-- `use-current-user.ts` resolves a retailer's JSKO ID from
-- `retailer_registrations` (username -> jsko_id -> application_id). But only 12
-- of 214 registration rows currently carry an `auth_user_id`, so a logged-in
-- retailer may have no registration row to write to. We therefore store the
-- generated ID on the request row as the source of truth, and *also* mirror it
-- onto the registration when one is linked.
--
-- Note on uniqueness of the legacy column
-- ---------------------------------------
-- `retailer_registrations.jsko_id` has no unique constraint and already holds a
-- duplicate ('JSKO155' on BO00001075 and BO00001076 — the same shop submitted
-- twice, seven minutes apart, one since rejected). We deliberately do NOT add a
-- unique index here, because it would fail against that existing row. Instead
-- `private.next_jsko_id()` guarantees uniqueness for newly issued IDs by
-- checking both tables under an advisory lock.

create table if not exists public.jsko_id_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  registration_id uuid references public.retailer_registrations(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  jsko_id         text,
  note            text,
  decision_note   text,
  decided_by      uuid references auth.users(id),
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.jsko_id_requests is
  'Retailer-raised requests for a JSKO ID. Admin-actioned; the ID is generated on approval.';

-- At most one open request per retailer. This is what stops a retailer
-- spamming the queue by clicking the button repeatedly.
create unique index if not exists jsko_id_requests_one_pending_per_user
  on public.jsko_id_requests (user_id)
  where status = 'pending';

create index if not exists jsko_id_requests_status_created_idx
  on public.jsko_id_requests (status, created_at desc);

alter table public.jsko_id_requests enable row level security;

-- Retailers: see and raise their own, nothing else. Note the INSERT check pins
-- status to 'pending' so a retailer cannot self-approve by inserting a row that
-- is already 'approved'.
drop policy if exists "Users can view own jsko requests" on public.jsko_id_requests;
create policy "Users can view own jsko requests"
  on public.jsko_id_requests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can raise own jsko request" on public.jsko_id_requests;
create policy "Users can raise own jsko request"
  on public.jsko_id_requests for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Admins: full read, and update to action the queue.
drop policy if exists "Admins can view all jsko requests" on public.jsko_id_requests;
create policy "Admins can view all jsko requests"
  on public.jsko_id_requests for select
  to authenticated
  using (private.is_admin(auth.uid()));

drop policy if exists "Admins can update jsko requests" on public.jsko_id_requests;
create policy "Admins can update jsko requests"
  on public.jsko_id_requests for update
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- ID generation
-- ---------------------------------------------------------------------------
-- Existing IDs run JSKO001..JSKO821 with 5 rows off-format. We continue the
-- series from the highest numeric suffix seen in either table. The advisory
-- lock serialises concurrent approvals so two admins cannot mint the same ID.
create or replace function private.next_jsko_id()
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  next_num int;
  candidate text;
begin
  perform pg_advisory_xact_lock(hashtext('jsko_id_allocation'));

  select coalesce(max(n), 0) + 1 into next_num
  from (
    select (regexp_replace(jsko_id, '\D', '', 'g'))::int as n
      from public.retailer_registrations
     where jsko_id ~ '^JSKO[0-9]+$'
    union all
    select (regexp_replace(jsko_id, '\D', '', 'g'))::int as n
      from public.jsko_id_requests
     where jsko_id ~ '^JSKO[0-9]+$'
  ) s;

  -- Belt and braces: skip anything already taken, in case an off-format or
  -- manually-entered value collides with the computed next value.
  loop
    candidate := 'JSKO' || lpad(next_num::text, 3, '0');
    exit when not exists (select 1 from public.retailer_registrations where jsko_id = candidate)
         and not exists (select 1 from public.jsko_id_requests where jsko_id = candidate);
    next_num := next_num + 1;
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retailer: raise a request
-- ---------------------------------------------------------------------------
create or replace function public.request_jsko_id()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  uid uuid := auth.uid();
  reg public.retailer_registrations%rowtype;
  existing public.jsko_id_requests%rowtype;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into reg
    from public.retailer_registrations
   where auth_user_id = uid
   order by created_at desc
   limit 1;

  -- Already holds a real ID? Nothing to request. 'DEMO' is a seed placeholder
  -- and is treated as absent, matching use-current-user.ts.
  if reg.id is not null
     and coalesce(btrim(reg.username), '') = ''
     and coalesce(btrim(reg.jsko_id), '') <> ''
     and upper(btrim(reg.jsko_id)) <> 'DEMO' then
    return jsonb_build_object('ok', false, 'reason', 'already_has_id', 'jsko_id', reg.jsko_id);
  end if;

  select * into existing
    from public.jsko_id_requests
   where user_id = uid and status = 'pending'
   limit 1;

  if existing.id is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_pending', 'request_id', existing.id);
  end if;

  insert into public.jsko_id_requests (user_id, registration_id)
  values (uid, reg.id)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'request_id', new_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: approve or reject
-- ---------------------------------------------------------------------------
create or replace function public.decide_jsko_id_request(
  _request_id uuid,
  _approve boolean,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  uid uuid := auth.uid();
  req public.jsko_id_requests%rowtype;
  new_jsko text;
begin
  if uid is null or not private.is_admin(uid) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into req from public.jsko_id_requests where id = _request_id for update;

  if req.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'already_decided', 'status', req.status);
  end if;

  if not _approve then
    update public.jsko_id_requests
       set status = 'rejected', decision_note = _note,
           decided_by = uid, decided_at = now(), updated_at = now()
     where id = _request_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  new_jsko := private.next_jsko_id();

  update public.jsko_id_requests
     set status = 'approved', jsko_id = new_jsko, decision_note = _note,
         decided_by = uid, decided_at = now(), updated_at = now()
   where id = _request_id;

  -- Mirror onto the registration when one is linked, so the existing
  -- use-current-user lookup path picks it up without a fallback query.
  if req.registration_id is not null then
    update public.retailer_registrations
       set jsko_id = new_jsko
     where id = req.registration_id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'approved', 'jsko_id', new_jsko);
end;
$$;

revoke all on function public.request_jsko_id() from public;
revoke all on function public.decide_jsko_id_request(uuid, boolean, text) from public;
grant execute on function public.request_jsko_id() to authenticated;
grant execute on function public.decide_jsko_id_request(uuid, boolean, text) to authenticated;
