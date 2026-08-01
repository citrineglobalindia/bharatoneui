-- BharatOne HR — recruitment and onboarding. Applied to prod via the MCP.
--
-- One continuous story rather than two disconnected screens: an opening attracts
-- candidates, a candidate moves through stages, and reaching the Hired stage seeds
-- their onboarding checklist automatically. That hand-off is precisely the step that
-- gets forgotten when it is done by hand.
--
-- Stages and checklist items are configurable. Every company's hiring process differs
-- and hard-coding one only makes people work around it.

create table if not exists public.hr_stages (
  code text primary key, name text not null, sort_order integer not null default 0,
  is_final boolean not null default false, is_hired boolean not null default false,
  colour text default '#0ea5e9', active boolean not null default true
);
insert into public.hr_stages(code, name, sort_order, is_final, is_hired, colour) values
  ('applied','Applied',1,false,false,'#64748b'),
  ('screening','Screening',2,false,false,'#0ea5e9'),
  ('interview','Interview',3,false,false,'#8b5cf6'),
  ('final','Final round',4,false,false,'#f59e0b'),
  ('offer','Offer sent',5,false,false,'#16a34a'),
  ('hired','Hired',6,true,true,'#15803d'),
  ('rejected','Not proceeding',7,true,false,'#e11d48')
on conflict (code) do nothing;

create table if not exists public.hr_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null, department text, designation text, location text,
  employment_type text default 'full_time', vacancies integer not null default 1,
  description text, salary_from numeric(12,2), salary_to numeric(12,2),
  status text not null default 'open' check (status in ('draft','open','on_hold','closed')),
  opened_on date not null default current_date, closed_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists hr_openings_status_idx on public.hr_openings(status, opened_on desc);

create table if not exists public.hr_candidates (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid references public.hr_openings(id) on delete set null,
  full_name text not null, email text, phone text, source text default 'direct',
  resume_path text,
  current_stage text not null default 'applied' references public.hr_stages(code),
  rating integer check (rating between 1 and 5),
  expected_salary numeric(12,2), offered_salary numeric(12,2), notes text,
  applied_on date not null default current_date, decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hr_cand_stage_idx   on public.hr_candidates(current_stage, applied_on desc);
create index if not exists hr_cand_opening_idx on public.hr_candidates(opening_id);

create table if not exists public.hr_candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.hr_candidates(id) on delete cascade,
  from_stage text, to_stage text not null, note text,
  by_user uuid references auth.users(id) on delete set null,
  at timestamptz not null default now()
);
create index if not exists hr_cand_ev_idx on public.hr_candidate_events(candidate_id, at desc);

create table if not exists public.hr_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  label text not null, category text default 'Joining',
  sort_order integer not null default 0, active boolean not null default true
);
insert into public.hr_onboarding_tasks(label, category, sort_order) values
  ('Offer letter signed and returned','Joining',1),
  ('Aadhaar and PAN collected','Documents',2),
  ('Educational certificates collected','Documents',3),
  ('Previous employment proof collected','Documents',4),
  ('Bank account details collected','Payroll',5),
  ('Police verification initiated','Compliance',6),
  ('Platform login created','Access',7),
  ('Role and permissions assigned','Access',8),
  ('Company policies shared and acknowledged','Compliance',9),
  ('Workstation and assets handed over','Facilities',10),
  ('Introduction to the team','Joining',11)
on conflict do nothing;

create table if not exists public.hr_onboarding (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.hr_candidates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  task_id uuid not null references public.hr_onboarding_tasks(id) on delete cascade,
  done boolean not null default false, done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null, note text,
  unique (candidate_id, task_id)
);

alter table public.hr_stages           enable row level security;
alter table public.hr_openings         enable row level security;
alter table public.hr_candidates       enable row level security;
alter table public.hr_candidate_events enable row level security;
alter table public.hr_onboarding_tasks enable row level security;
alter table public.hr_onboarding       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['hr_stages','hr_openings','hr_candidates','hr_candidate_events',
                           'hr_onboarding_tasks','hr_onboarding']
  loop
    execute format('drop policy if exists %I_hr on public.%I', t, t);
    execute format('create policy %I_hr on public.%I for all to authenticated
       using (private.is_hr(auth.uid())) with check (private.is_hr(auth.uid()))', t, t);
  end loop;
end $$;

-- Function bodies recorded in the Supabase migration history under
-- hr_recruitment_and_onboarding:
--   hr_move_candidate(uuid,text,text)  stage change + timeline; seeds onboarding on hire
--   hr_pipeline()                      the board, with onboarding progress per candidate
--   hr_set_onboarding(uuid,boolean,text)
