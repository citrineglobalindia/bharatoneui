-- BharatOne HR — attendance, dashboard and reports. Applied to prod via the MCP.
--
-- Attendance is keyed to the same staff records as the rest of HR. The pre-existing
-- hr_attendance table pointed at hr_employees, which is empty and being retired.
--
-- The important design decision is in hr_attendance_month: attendance is NOT only what
-- somebody ticked. Declared holidays, Sundays and approved leave are facts already held
-- elsewhere, so they are merged into the grid rather than marked by hand. That keeps the
-- attendance sheet and the leave register from ever disagreeing, and means HR only
-- records the genuinely discretionary days.
--
-- Precedence: holiday -> weekly off -> approved leave -> what HR marked -> not marked.

create table if not exists public.hr_attendance_v2 (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  status     text not null default 'present'
               check (status in ('present','absent','half_day','wfh','on_duty')),
  check_in   time,
  check_out  time,
  note       text,
  marked_by  uuid references auth.users(id) on delete set null,
  marked_at  timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists hr_att2_day_idx  on public.hr_attendance_v2(day desc);
create index if not exists hr_att2_user_idx on public.hr_attendance_v2(user_id, day desc);

alter table public.hr_attendance_v2 enable row level security;
drop policy if exists hr_att2_read on public.hr_attendance_v2;
create policy hr_att2_read on public.hr_attendance_v2 for select to authenticated
  using (private.is_hr(auth.uid()) or user_id = auth.uid());
drop policy if exists hr_att2_write on public.hr_attendance_v2;
create policy hr_att2_write on public.hr_attendance_v2 for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

-- Function bodies are recorded in the Supabase migration history under
-- hr_attendance_and_dashboard and hr_reports:
--   hr_attendance_month(int,int)   monthly grid, holidays/leave merged in
--   hr_mark_attendance(uuid,date,text,text)
--   hr_mark_day_present(date)      bulk mark, skipping anyone already marked or on leave
--   hr_dashboard()                 live headcount, approvals, birthdays, holidays
--   hr_report_staff(date,date)     per person: tenure, leave taken, attendance
--   hr_report_leave(date,date)     usage by leave type
--   hr_report_attendance(int)      month by month across the company
