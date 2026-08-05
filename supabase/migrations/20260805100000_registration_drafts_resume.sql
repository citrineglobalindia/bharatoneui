-- Resumable registration drafts.
--
-- Until now nothing at all was written server-side until the applicant reached
-- the final Submit. Abandon the form at the KYC step and every field typed was
-- gone: the only trace was a sessionStorage blob that died with the tab. A
-- returning applicant re-verified their OTP and started from an empty form.
--
-- This holds the typed fields only. Documents are deliberately NOT persisted,
-- so a resumed applicant re-attaches them; the draft therefore never carries a
-- file path. It also never carries the account password.

create table if not exists public.registration_drafts (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  mobile            text,
  registration_type text not null default 'new'
                    check (registration_type in ('new','old')),
  current_step      int  not null default 0 check (current_step >= 0 and current_step <= 12),
  -- The furthest step ever reached, so stepping back does not shrink what we
  -- offer to resume.
  furthest_step     int  not null default 0 check (furthest_step >= 0 and furthest_step <= 12),
  data              jsonb not null default '{}'::jsonb,
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One draft per email. A second device continuing the same registration updates
-- the same row rather than forking it.
create unique index if not exists registration_drafts_email_key
  on public.registration_drafts (lower(email));

create index if not exists registration_drafts_last_seen_idx
  on public.registration_drafts (last_seen_at);

alter table public.registration_drafts enable row level security;

-- No policies. Deliberate: this table holds names, dates of birth, addresses,
-- bank details and ID numbers for people who are not yet customers and have no
-- login. Nothing reaches it except the SECURITY DEFINER functions, each of
-- which demands proof the applicant owns the email being touched.
revoke all on public.registration_drafts from anon, authenticated;
