-- Retailers request phone/email changes; QC (or admin) approves before they apply.
-- Applied via Supabase MCP on 2026-07-21; kept here for traceability.
create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null check (field in ('phone','email')),
  old_value text,
  new_value text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  remarks text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists pcr_one_pending_per_field on public.profile_change_requests (user_id, field) where status = 'pending';
alter table public.profile_change_requests enable row level security;
create policy "Own change requests visible" on public.profile_change_requests
  for select to authenticated using (user_id = auth.uid());
create policy "Reviewers see all change requests" on public.profile_change_requests
  for select to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin')));
grant select on public.profile_change_requests to authenticated;
grant all on public.profile_change_requests to service_role;

create or replace function public.submit_profile_change_request(_field text, _new_value text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
  v_new text := btrim(coalesce(_new_value,''));
  v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  if _field not in ('phone','email') then return jsonb_build_object('ok', false, 'reason', 'bad_field'); end if;
  if _field = 'phone' then
    v_new := regexp_replace(v_new, '\D', '', 'g');
    if v_new !~ '^[6-9][0-9]{9}$' then return jsonb_build_object('ok', false, 'reason', 'bad_phone'); end if;
    select coalesce(p.phone,'') into v_old from public.profiles p where p.id = v_uid;
  else
    v_new := lower(v_new);
    if v_new !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
    select coalesce(u.email,'') into v_old from auth.users u where u.id = v_uid;
    if exists (select 1 from auth.users u where lower(u.email) = v_new and u.id <> v_uid) then
      return jsonb_build_object('ok', false, 'reason', 'email_taken');
    end if;
  end if;
  if coalesce(v_old,'') = v_new then return jsonb_build_object('ok', false, 'reason', 'unchanged'); end if;
  begin
    insert into public.profile_change_requests (user_id, field, old_value, new_value)
    values (v_uid, _field, nullif(v_old,''), v_new) returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_pending');
  end;
  perform public.notify_roles(
    array['qc','admin'], 'profile_change_request', 'Profile change request',
    format('%s change requested: %s -> %s', initcap(_field), coalesce(nullif(v_old,''),'(empty)'), v_new),
    '/qc/profile-changes', 'profile_change_request', v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.qc_list_profile_change_requests(_status text default 'pending')
returns table (id uuid, user_id uuid, field text, old_value text, new_value text, status text, remarks text, created_at timestamptz, requester_name text, requester_email text, requester_phone text, application_id text)
language sql security definer set search_path = public as $$
  select r.id, r.user_id, r.field, r.old_value, r.new_value, r.status, r.remarks, r.created_at,
         p.display_name, u.email, p.phone, reg.application_id
  from public.profile_change_requests r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  left join lateral (
    select rr.application_id from public.retailer_registrations rr
    where rr.auth_user_id = r.user_id order by rr.created_at desc limit 1
  ) reg on true
  where (_status is null or r.status = _status)
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin'))
  order by r.created_at asc;
$$;

create or replace function public.review_profile_change_request(_id uuid, _approve boolean, _remarks text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_reviewer uuid := auth.uid();
  r record;
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_reviewer and ur.role::text in ('qc','admin')) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  select * into r from public.profile_change_requests where id = _id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', false, 'reason', 'already_reviewed'); end if;
  if _approve then
    if r.field = 'phone' then
      update public.profiles set phone = r.new_value where id = r.user_id;
      if not found then
        begin
          insert into public.profiles (id, phone) values (r.user_id, r.new_value);
        exception when others then null;
        end;
      end if;
      update public.retailer_registrations set mobile = r.new_value where auth_user_id = r.user_id;
    else
      if exists (select 1 from auth.users u where lower(u.email) = lower(r.new_value) and u.id <> r.user_id) then
        return jsonb_build_object('ok', false, 'reason', 'email_taken');
      end if;
      update auth.users set email = r.new_value, updated_at = now() where id = r.user_id;
      update public.retailer_registrations set email = r.new_value where auth_user_id = r.user_id;
    end if;
  end if;
  update public.profile_change_requests
     set status = case when _approve then 'approved' else 'rejected' end,
         remarks = _remarks, reviewed_by = v_reviewer, reviewed_at = now()
   where id = _id;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id,
          case when _approve then 'profile_change_approved' else 'profile_change_rejected' end,
          case when _approve then 'Profile change approved' else 'Profile change rejected' end,
          format('Your %s change to %s was %s.%s', r.field, r.new_value,
                 case when _approve then 'approved' else 'rejected' end,
                 case when _remarks is not null and btrim(_remarks) <> '' then ' Remarks: ' || _remarks else '' end),
          '/settings', 'profile_change_request', _id::text);
  return jsonb_build_object('ok', true);
end $$;
