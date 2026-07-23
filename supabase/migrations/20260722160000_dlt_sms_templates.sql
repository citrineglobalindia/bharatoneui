-- DLT SMS templates
-- ---------------------------------------------------------------------------
-- India's DLT regime blocks any commercial SMS whose text does not match a
-- pre-registered content template. So we cannot send free-form SMS: every send
-- must name a registered template and supply only the variable values.
--
-- This table is that registry. `notify-dispatch` looks a row up by `template_key`,
-- fills the `{#var#}` / `{#alp#}` placeholders positionally, and sends the result
-- with the row's `dlt_template_id` + `sender_id`. Adding a new SMS type is a row
-- insert here — no redeploy.
--
-- Credentials (SMSJust username/password) and the DLT entity id are NOT stored
-- here — they live as edge-function secrets so they never sit in the database
-- or in query-string logs.

create table if not exists public.dlt_templates (
  id              uuid primary key default gen_random_uuid(),
  template_key    text not null unique,      -- e.g. 'otp', 'subscription_reminder'
  description     text,
  sender_id       text not null default 'BHRONE',
  dlt_template_id text,                       -- the 19-digit content template id
  -- Exact registered text, with one placeholder token per variable. Any token of
  -- the form {#...#} is replaced, in order, by the values the caller passes.
  body            text not null,
  var_count       int not null default 0,
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.dlt_templates is
  'DLT-registered SMS content templates. notify-dispatch renders these; free-form SMS is not permitted under DLT.';

alter table public.dlt_templates enable row level security;

-- Admins manage templates; the edge function reads them with the service role
-- (which bypasses RLS), so no broad read policy is needed for retailers.
drop policy if exists "Admins manage dlt templates" on public.dlt_templates;
create policy "Admins manage dlt templates"
  on public.dlt_templates for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- Seed 1: the subscription-expiry reminder you already have registered.
-- Two variables: {1} = name, {2} = expiry date.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'subscription_reminder',
  'Subscription expiry / renewal reminder',
  'BHRONE',
  '1177178426730247549',
  'Dear {#var#}, Your BharatOne subscription expires on {#var#}. Please renew to continue uninterrupted services.',
  2,
  true
)
on conflict (template_key) do nothing;

-- Seed 2: OTP template — registered on the DLT portal 23 Jul 2026.
-- Template id 1177178478512201547. Two variables: {1}=OTP code, {2}=validity mins.
-- The fixed text (and line breaks) below reproduce the registered content exactly;
-- DLT rejects any deviation in the non-variable words.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'otp',
  'One-time password for portal registration / login',
  'BHRONE',
  '1177178478512201547',
  E'Dear Customer,\nyour OTP for BharatOne Portal Registration is {#var#}.\nIt is valid for {#var#} minutes.\nDo not share this OTP with anyone.',
  2,
  true
)
on conflict (template_key) do nothing;
