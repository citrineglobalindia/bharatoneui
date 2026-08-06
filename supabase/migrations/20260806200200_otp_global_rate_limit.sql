-- OTP abuse limits.
--
-- issue_registration_otp already capped 5 requests per target per 15 minutes,
-- which stops someone pestering ONE address. It did nothing about the attack
-- that costs money: a script walking thousands of DIFFERENT mobile numbers to
-- make BharatOne pay for the SMS ("SMS pumping"). A platform-wide ceiling
-- closes that without affecting a real applicant, who sends one or two.
--
-- The log stores a sha256 of the target, not the address itself, so this
-- control does not quietly become a list of everyone's phone number.
create table if not exists public.otp_issue_log (
  id          bigserial primary key,
  channel     text not null,
  target_hash text not null,
  created_at  timestamptz not null default now()
);
create index if not exists otp_issue_log_time_idx on public.otp_issue_log (created_at desc);
alter table public.otp_issue_log enable row level security;
revoke all on public.otp_issue_log from anon, authenticated;

create or replace function public.issue_registration_otp(_target text, _channel text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_code   text;
  v_recent int;
  v_global int;
begin
  if coalesce(btrim(_target),'') = '' then raise exception 'Target required'; end if;
  if _channel not in ('email','mobile') then raise exception 'Unknown channel'; end if;

  select count(*) into v_recent from public.registration_otps
   where lower(target) = lower(_target) and channel = _channel
     and created_at > now() - interval '15 minutes';
  if v_recent >= 5 then
    raise exception 'Too many OTP requests. Please wait a few minutes.';
  end if;

  select count(*) into v_global from public.otp_issue_log
   where channel = _channel and created_at > now() - interval '1 hour';
  if v_global >= (case when _channel = 'mobile' then 300 else 500 end) then
    raise exception 'OTP service is busy. Please try again shortly.';
  end if;

  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  insert into public.registration_otps (target, channel, code_hash, expires_at)
  values (_target, _channel, extensions.crypt(v_code, extensions.gen_salt('bf')),
          now() + interval '10 minutes');

  insert into public.otp_issue_log (channel, target_hash)
  values (_channel, encode(extensions.digest(lower(btrim(_target)), 'sha256'), 'hex'));

  return v_code;
end;
$fn$;

-- Only the send-otp edge function (service role) may mint codes.
revoke all on function public.issue_registration_otp(text, text) from public, anon, authenticated;
grant execute on function public.issue_registration_otp(text, text) to service_role;
