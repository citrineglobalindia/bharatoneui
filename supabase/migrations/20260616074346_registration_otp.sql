-- ============================================================
-- BharatOne — Registration OTP (email now; mobile later)
-- ============================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.registration_otps (
  id          uuid primary key default gen_random_uuid(),
  target      text not null,
  channel     text not null check (channel in ('email','mobile')),
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists registration_otps_lookup_idx
  on public.registration_otps (lower(target), channel, created_at desc);

alter table public.registration_otps enable row level security;
-- no policies: only SECURITY DEFINER functions / service_role may touch it
revoke all on public.registration_otps from anon, authenticated;
grant all on public.registration_otps to service_role;

-- issue: generate + store hashed code, return plaintext (service_role / edge fn only)
create or replace function public.issue_registration_otp(_target text, _channel text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_code text;
begin
  if _channel not in ('email','mobile') then raise exception 'bad channel'; end if;
  -- light rate limit: max 5 issues per target/channel in last 15 min
  if (select count(*) from public.registration_otps
      where lower(target)=lower(_target) and channel=_channel
        and created_at > now() - interval '15 minutes') >= 5 then
    raise exception 'Too many OTP requests. Please wait a few minutes.';
  end if;
  v_code := lpad((floor(random()*1000000))::int::text, 6, '0');
  insert into public.registration_otps (target, channel, code_hash, expires_at)
  values (_target, _channel, extensions.crypt(v_code, extensions.gen_salt('bf')), now() + interval '10 minutes');
  return v_code;
end;
$$;
revoke all on function public.issue_registration_otp(text,text) from public, anon, authenticated;
grant execute on function public.issue_registration_otp(text,text) to service_role;

-- verify: check latest valid code (anon-callable)
create or replace function public.verify_registration_otp(_target text, _channel text, _code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare r public.registration_otps;
begin
  select * into r from public.registration_otps
  where lower(target)=lower(_target) and channel=_channel and verified=false and expires_at > now()
  order by created_at desc limit 1;

  if r.id is null then return jsonb_build_object('verified', false, 'reason', 'expired'); end if;
  if r.attempts >= 5 then return jsonb_build_object('verified', false, 'reason', 'too_many_attempts'); end if;

  if extensions.crypt(_code, r.code_hash) = r.code_hash then
    update public.registration_otps set verified=true where id=r.id;
    return jsonb_build_object('verified', true);
  else
    update public.registration_otps set attempts=attempts+1 where id=r.id;
    return jsonb_build_object('verified', false, 'reason', 'invalid');
  end if;
end;
$$;
revoke all on function public.verify_registration_otp(text,text,text) from public;
grant execute on function public.verify_registration_otp(text,text,text) to anon, authenticated;
