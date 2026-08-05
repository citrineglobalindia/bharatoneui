-- A short-lived session minted the moment an applicant proves the email is
-- theirs. Every draft read and write carries it.
--
-- Why not re-check the OTP on each save? A save happens throughout a long
-- form-filling sitting, and an OTP is only ~10 minutes old at verification
-- time. Tying every write to OTP age would start failing saves half way down
-- the form. The OTP proves identity once; this token carries that proof.
create table if not exists public.registration_sessions (
  token      uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

create index if not exists registration_sessions_email_idx on public.registration_sessions (lower(email));
create index if not exists registration_sessions_expiry_idx on public.registration_sessions (expires_at);

alter table public.registration_sessions enable row level security;
revoke all on public.registration_sessions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Step 1: prove the email, get back a token plus whatever we are holding.
-- ---------------------------------------------------------------------------
create or replace function public.registration_resume_begin(
  _email  text,
  _mobile text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email   text := lower(btrim(coalesce(_email, '')));
  v_ok      boolean;
  v_token   uuid;
  v_draft   public.registration_drafts%rowtype;
  v_app     record;
  v_draft_j jsonb := null;
  v_app_j   jsonb := null;
begin
  if v_email = '' then
    raise exception 'Email is required';
  end if;

  -- The gate. An email OTP for this address must have been verified in the last
  -- 30 minutes. Without this the function would be an oracle: anyone could ask
  -- it about any email address and be told whether that person has a
  -- half-finished registration and how far into KYC they had gone.
  select exists (
    select 1 from public.registration_otps o
    where lower(o.target) = v_email
      and o.channel = 'email'
      and o.verified = true
      and o.created_at > now() - interval '30 minutes'
  ) into v_ok;

  if not v_ok then
    raise exception 'Verify your email first';
  end if;

  insert into public.registration_sessions (email) values (v_email)
  returning token into v_token;

  select * into v_draft from public.registration_drafts d where lower(d.email) = v_email;
  if found then
    v_draft_j := jsonb_build_object(
      'current_step',      v_draft.current_step,
      'furthest_step',     v_draft.furthest_step,
      'registration_type', v_draft.registration_type,
      'mobile',            v_draft.mobile,
      'data',              v_draft.data,
      'last_seen_at',      v_draft.last_seen_at,
      'created_at',        v_draft.created_at
    );
  end if;

  -- An application already submitted on this email. Surfaced so a returning
  -- applicant is told where theirs stands instead of unknowingly filing a
  -- second one -- which the schema permits today, since email is indexed but
  -- not unique and submit_retailer_registration is a plain insert.
  select r.application_id, r.status, r.created_at, r.rejection_reason
    into v_app
  from public.retailer_registrations r
  where lower(r.email) = v_email
  order by r.created_at desc
  limit 1;

  if found then
    v_app_j := jsonb_build_object(
      'application_id',   v_app.application_id,
      'status',           v_app.status,
      'submitted_at',     v_app.created_at,
      -- Only a rejected application leaves the door open for a fresh one.
      'can_start_new',    (v_app.status = 'rejected'),
      'rejection_reason', case when v_app.status = 'rejected' then v_app.rejection_reason else null end
    );
  end if;

  if _mobile is not null and btrim(_mobile) <> '' then
    update public.registration_drafts
       set mobile = btrim(_mobile), last_seen_at = now()
     where lower(email) = v_email;
  end if;

  return jsonb_build_object('token', v_token, 'draft', v_draft_j, 'application', v_app_j);
end;
$$;

-- ---------------------------------------------------------------------------
-- Step 2: save progress. Called on every step change.
-- ---------------------------------------------------------------------------
create or replace function public.registration_draft_save(
  _token  uuid,
  _step   int,
  _data   jsonb,
  _mobile text default null,
  _type   text default 'new'
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_data  jsonb := coalesce(_data, '{}'::jsonb);
begin
  select s.email into v_email
  from public.registration_sessions s
  where s.token = _token and s.expires_at > now();

  if v_email is null then
    raise exception 'Session expired. Verify your email again.';
  end if;

  -- Belt and braces. The client is not supposed to send these; if it ever does,
  -- they do not reach the table. A password must never sit in a draft, and file
  -- paths have no business here because documents are not persisted at all.
  v_data := v_data - 'password' - 'confirmPassword' - 'files';

  insert into public.registration_drafts as d
    (email, mobile, registration_type, current_step, furthest_step, data, last_seen_at, updated_at)
  values
    (v_email, nullif(btrim(coalesce(_mobile,'')),''),
     case when _type in ('new','old') then _type else 'new' end,
     greatest(0, least(12, coalesce(_step,0))),
     greatest(0, least(12, coalesce(_step,0))),
     v_data, now(), now())
  on conflict (lower(email)) do update
    set current_step      = excluded.current_step,
        furthest_step     = greatest(d.furthest_step, excluded.current_step),
        data              = excluded.data,
        mobile            = coalesce(excluded.mobile, d.mobile),
        registration_type = excluded.registration_type,
        last_seen_at      = now(),
        updated_at        = now();

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Step 3: "Start again from the beginning".
-- ---------------------------------------------------------------------------
create or replace function public.registration_draft_discard(_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  select s.email into v_email
  from public.registration_sessions s
  where s.token = _token and s.expires_at > now();

  if v_email is null then
    raise exception 'Session expired. Verify your email again.';
  end if;

  delete from public.registration_drafts where lower(email) = v_email;
  return true;
end;
$$;

-- EXECUTE is granted to PUBLIC by default on new functions, so revoke first and
-- then grant deliberately.
revoke all on function public.registration_resume_begin(text, text)                 from public;
revoke all on function public.registration_draft_save(uuid, int, jsonb, text, text) from public;
revoke all on function public.registration_draft_discard(uuid)                      from public;

grant execute on function public.registration_resume_begin(text, text)                 to anon, authenticated;
grant execute on function public.registration_draft_save(uuid, int, jsonb, text, text) to anon, authenticated;
grant execute on function public.registration_draft_discard(uuid)                      to anon, authenticated;
