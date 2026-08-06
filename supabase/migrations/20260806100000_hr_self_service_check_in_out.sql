-- Employee self-service: check in / check out.
--
-- hr_attendance_v2 has had check_in/check_out columns since the table was
-- created, and nothing has ever written them — attendance is marked by HR
-- after the fact. These two functions let a staff member punch their own day.
-- SECURITY DEFINER because the table's write policy is HR-only, and that
-- stays: an employee can stamp today's times through these functions and
-- nothing else — not yesterday, not a colleague, not the status HR set.
--
-- All timestamps are taken from the SERVER clock in IST. The client never
-- supplies a time, so a device with a wrong (or wound-back) clock cannot
-- forge a punctual arrival. Asia/Kolkata rather than UTC because an evening
-- shift would otherwise land on tomorrow's date.

create or replace function private.is_staff_member(_uid uuid)
returns boolean
language sql stable security definer
set search_path = public, private
as $fn$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = _uid
      and r.role::text in ('admin','accountant','qc','operator','telecaller','hr_staff','manager','employee','dro','tro','bde')
  )
$fn$;

create or replace function public.hr_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := (now() at time zone 'Asia/Kolkata')::date;
  v_time time := (now() at time zone 'Asia/Kolkata')::time(0);
  v_row  public.hr_attendance_v2%rowtype;
begin
  if v_uid is null or not private.is_staff_member(v_uid) then
    raise exception 'Not permitted';
  end if;

  select * into v_row from public.hr_attendance_v2 where user_id = v_uid and day = v_day;

  if found and v_row.check_in is not null then
    -- Idempotent: the first punch of the day stands. A second tap tells them
    -- when they arrived instead of quietly moving the time.
    return jsonb_build_object('ok', true, 'already', true, 'day', v_day,
                              'check_in', v_row.check_in, 'check_out', v_row.check_out);
  end if;

  insert into public.hr_attendance_v2 as a (user_id, day, status, check_in, marked_by)
  values (v_uid, v_day, 'present', v_time, v_uid)
  on conflict (user_id, day) do update
    -- HR may already have marked the day (e.g. wfh); keep their status, add the time.
    set check_in = coalesce(a.check_in, excluded.check_in);

  return jsonb_build_object('ok', true, 'already', false, 'day', v_day, 'check_in', v_time);
end;
$$;

create or replace function public.hr_check_out()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := (now() at time zone 'Asia/Kolkata')::date;
  v_time time := (now() at time zone 'Asia/Kolkata')::time(0);
  v_in   time;
begin
  if v_uid is null or not private.is_staff_member(v_uid) then
    raise exception 'Not permitted';
  end if;

  select check_in into v_in from public.hr_attendance_v2 where user_id = v_uid and day = v_day;
  if v_in is null then
    raise exception 'Check in first';
  end if;

  -- Checking out again simply extends the day; the last punch wins here (the
  -- opposite of check-in) because leaving, coming back and leaving later is
  -- normal, and the final departure is the honest end of the day.
  update public.hr_attendance_v2
     set check_out = v_time
   where user_id = v_uid and day = v_day;

  return jsonb_build_object('ok', true, 'day', v_day, 'check_in', v_in, 'check_out', v_time);
end;
$$;

revoke all on function public.hr_check_in()  from public, anon;
revoke all on function public.hr_check_out() from public, anon;
grant execute on function public.hr_check_in()  to authenticated;
grant execute on function public.hr_check_out() to authenticated;

-- An employee can read their own hr_id_cards row but not the photograph on it:
-- the id-photos bucket was HR-only. Let a person see their own face.
create policy id_photos_own_read on storage.objects for select to authenticated
  using (
    bucket_id = 'id-photos'
    and exists (
      select 1 from public.hr_id_cards c
      where c.user_id = auth.uid() and c.photo_path = storage.objects.name
    )
  );
