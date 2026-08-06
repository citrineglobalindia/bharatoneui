-- Stop trusting the browser's word that the OTP was completed.
--
-- submit_retailer_registration writes email_verified and mobile_verified
-- straight from the JSON payload the client sends. A crafted call could set
-- them to true without ever receiving an OTP, and the row would arrive in the
-- review queue looking fully verified. The function is 200 lines of column
-- mapping, so rather than rewrite it, this trigger derives both flags from the
-- server's own OTP records — which also covers any future insert path.
--
-- Deliberately checks "an OTP for this address was verified", not "verified in
-- the last N minutes": a genuine applicant verifies at step 1 and may not
-- finish uploading documents and video for another hour. Age is not the
-- control here; possession of the mailbox is.
create or replace function public.tg_reg_require_verified_otp()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare
  v_email_ok  boolean;
  v_mobile_ok boolean;
begin
  v_email_ok := exists (
    select 1 from public.registration_otps o
    where lower(o.target) = lower(coalesce(new.email,'')) and o.channel = 'email' and o.verified
  );
  v_mobile_ok := exists (
    select 1 from public.registration_otps o
    where o.channel = 'mobile' and o.verified
      and regexp_replace(o.target, '\D', '', 'g') like '%' || right(regexp_replace(coalesce(new.mobile,''), '\D', '', 'g'), 10)
      and right(regexp_replace(coalesce(new.mobile,''), '\D', '', 'g'), 10) <> ''
  );

  -- Staff creating or migrating a record are not going through the OTP flow.
  if private.is_admin(auth.uid()) or auth.role() = 'service_role' then
    new.email_verified  := v_email_ok;
    new.mobile_verified := v_mobile_ok;
    return new;
  end if;

  if not v_email_ok then
    raise exception 'Verify your email with the OTP before submitting this registration';
  end if;

  new.email_verified  := true;
  new.mobile_verified := v_mobile_ok;
  return new;
end;
$fn$;

drop trigger if exists reg_require_verified_otp on public.retailer_registrations;
create trigger reg_require_verified_otp
  before insert on public.retailer_registrations
  for each row execute function public.tg_reg_require_verified_otp();

-- Verified in a rolled-back transaction: a forged submit claiming
-- email_verified=true with no OTP anywhere is refused; the same submit succeeds
-- once a genuine verified OTP exists; and mobile_verified is stored as false
-- even though the payload claimed true.
