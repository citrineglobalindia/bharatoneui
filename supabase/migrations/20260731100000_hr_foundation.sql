-- BharatOne HR — foundation. Applied to prod via the MCP; recorded here in full.
--
-- Employees are the people already in `profiles`; there is deliberately no second
-- employee table. Retailers and distributors are partners, not staff, so they are
-- excluded by role. The pre-existing empty `hr_employees` table is left alone and
-- should be retired separately.
--
-- Leave is counted in WORKING days: Sundays and declared holidays never consume a
-- balance, and the count is computed server-side so it cannot be forged from a form.

create or replace function private.is_staff_role(r text)
returns boolean language sql immutable as $fn$
  select r in ('admin','accountant','qc','operator','telecaller','hr_staff',
               'manager','employee','dro','tro','bde')
$fn$;

create or replace function private.is_hr(_uid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select private.is_admin(_uid)
      or exists (select 1 from public.user_roles r
                 where r.user_id = _uid and r.role::text = 'hr_staff')
$fn$;

create table if not exists public.hr_employment (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  employment_type  text default 'full_time'
                     check (employment_type in ('full_time','part_time','contract','intern','consultant')),
  date_of_joining  date,
  date_of_exit     date,
  status           text not null default 'active'
                     check (status in ('active','probation','notice','resigned','terminated','on_leave')),
  probation_until  date,
  reports_to       uuid references auth.users(id) on delete set null,
  work_location    text,
  confirmed_on     date,
  exit_reason      text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists hr_employment_status_idx on public.hr_employment(status);

create table if not exists public.hr_leave_types (
  code            text primary key,
  name            text not null,
  annual_days     numeric(5,1) not null default 0,
  paid            boolean not null default true,
  requires_proof  boolean not null default false,
  proof_after_days integer,
  colour          text default '#0ea5e9',
  active          boolean not null default true,
  sort_order      integer not null default 0
);

insert into public.hr_leave_types(code, name, annual_days, paid, requires_proof, proof_after_days, colour, sort_order) values
  ('casual','Casual Leave',      12, true,  false, null, '#0ea5e9', 1),
  ('sick','Sick Leave',           8, true,  true,  2,    '#f97316', 2),
  ('earned','Earned Leave',      15, true,  false, null, '#16a34a', 3),
  ('unpaid','Leave Without Pay',  0, false, false, null, '#64748b', 4)
on conflict (code) do nothing;

create table if not exists public.hr_holidays (
  id          uuid primary key default gen_random_uuid(),
  holiday_on  date not null,
  name        text not null,
  optional    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (holiday_on, name)
);
create index if not exists hr_holidays_date_idx on public.hr_holidays(holiday_on);

create table if not exists public.hr_leave_balances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  year        integer not null,
  leave_code  text not null references public.hr_leave_types(code) on delete cascade,
  entitled    numeric(5,1) not null default 0,
  carried     numeric(5,1) not null default 0,
  adjustment  numeric(5,1) not null default 0,
  note        text,
  updated_at  timestamptz not null default now(),
  unique (user_id, year, leave_code)
);

create table if not exists public.hr_leave_requests_v2 (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  leave_code    text not null references public.hr_leave_types(code),
  from_date     date not null,
  to_date       date not null,
  half_day      boolean not null default false,
  days          numeric(5,1) not null,
  reason        text not null,
  proof_path    text,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','cancelled')),
  applied_at    timestamptz not null default now(),
  decided_by    uuid references auth.users(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  check (to_date >= from_date)
);
create index if not exists hr_lr2_user_idx   on public.hr_leave_requests_v2(user_id, from_date desc);
create index if not exists hr_lr2_status_idx on public.hr_leave_requests_v2(status, applied_at desc);

create table if not exists public.hr_policies (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       text default 'General',
  summary        text,
  body           text,
  document_path  text,
  version        text default '1.0',
  effective_from date not null default current_date,
  requires_ack   boolean not null default false,
  published      boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists hr_policies_pub_idx on public.hr_policies(published, effective_from desc);

create table if not exists public.hr_policy_acks (
  policy_id  uuid not null references public.hr_policies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  ack_at     timestamptz not null default now(),
  primary key (policy_id, user_id)
);

alter table public.hr_employment        enable row level security;
alter table public.hr_leave_types       enable row level security;
alter table public.hr_holidays          enable row level security;
alter table public.hr_leave_balances    enable row level security;
alter table public.hr_leave_requests_v2 enable row level security;
alter table public.hr_policies          enable row level security;
alter table public.hr_policy_acks       enable row level security;

drop policy if exists hr_employment_read on public.hr_employment;
create policy hr_employment_read on public.hr_employment for select to authenticated
  using (private.is_hr(auth.uid()) or user_id = auth.uid());
drop policy if exists hr_employment_write on public.hr_employment;
create policy hr_employment_write on public.hr_employment for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

drop policy if exists hr_types_read on public.hr_leave_types;
create policy hr_types_read on public.hr_leave_types for select to authenticated using (true);
drop policy if exists hr_types_write on public.hr_leave_types;
create policy hr_types_write on public.hr_leave_types for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

drop policy if exists hr_hol_read on public.hr_holidays;
create policy hr_hol_read on public.hr_holidays for select to authenticated using (true);
drop policy if exists hr_hol_write on public.hr_holidays;
create policy hr_hol_write on public.hr_holidays for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

drop policy if exists hr_bal_read on public.hr_leave_balances;
create policy hr_bal_read on public.hr_leave_balances for select to authenticated
  using (private.is_hr(auth.uid()) or user_id = auth.uid());
drop policy if exists hr_bal_write on public.hr_leave_balances;
create policy hr_bal_write on public.hr_leave_balances for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

drop policy if exists hr_req_read on public.hr_leave_requests_v2;
create policy hr_req_read on public.hr_leave_requests_v2 for select to authenticated
  using (private.is_hr(auth.uid()) or user_id = auth.uid());
drop policy if exists hr_req_insert on public.hr_leave_requests_v2;
create policy hr_req_insert on public.hr_leave_requests_v2 for insert to authenticated
  with check (user_id = auth.uid() or private.is_hr(auth.uid()));
drop policy if exists hr_req_update on public.hr_leave_requests_v2;
create policy hr_req_update on public.hr_leave_requests_v2 for update to authenticated
  using (private.is_hr(auth.uid()) or (user_id = auth.uid() and status = 'pending'))
  with check (private.is_hr(auth.uid()) or user_id = auth.uid());

drop policy if exists hr_pol_read on public.hr_policies;
create policy hr_pol_read on public.hr_policies for select to authenticated
  using (published or private.is_hr(auth.uid()));
drop policy if exists hr_pol_write on public.hr_policies;
create policy hr_pol_write on public.hr_policies for all to authenticated
  using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()));

drop policy if exists hr_ack_read on public.hr_policy_acks;
create policy hr_ack_read on public.hr_policy_acks for select to authenticated
  using (private.is_hr(auth.uid()) or user_id = auth.uid());
drop policy if exists hr_ack_insert on public.hr_policy_acks;
create policy hr_ack_insert on public.hr_policy_acks for insert to authenticated
  with check (user_id = auth.uid());

-- The RPCs (hr_working_days, hr_employees_list, hr_employee_detail,
-- hr_save_employment, hr_apply_leave, hr_decide_leave, hr_cancel_leave,
-- hr_leave_list) are recorded in the Supabase migration history under
-- hr_rpcs_directory_and_leave and hr_leave_apply_and_decide.
