-- app_settings was readable by anyone on the internet: policy "as_read", SELECT,
-- USING (true). Twenty-eight rows, and among them:
--
--   tracker_passphrase_sha256  a bare unsalted SHA-256 of a human-chosen
--                              passphrase. Unsalted SHA-256 of a phrase like
--                              this falls to an offline dictionary in seconds,
--                              so publishing it is close to publishing the
--                              passphrase. Nothing in the application reads
--                              this key any more.
--   health_owner_email,        internal addresses, useful for phishing the
--   health_alert_emails        people who receive the alerts.
--   icici_test_accounts        includes a real staff login name.
--   aeps_merchant_share_percent, registration_fee, dmt_* — the commercial
--                              terms of the business, readable by a competitor.
--
-- Only ONE key is genuinely needed by a logged-out visitor: registration_fee,
-- which the registration page quotes. The company name, address and support
-- contacts are on the public website anyway, so they stay readable rather than
-- pretending otherwise.
--
-- Verified after applying:
--   anon                  7 of 28 keys
--   registration_fee      still 5999 (registration page unaffected)
--   tracker hash          hidden
--   aeps/dmt terms        hidden
--   signed-in retailer    27 keys, everything their screens read

drop policy if exists as_read on public.app_settings;

create policy as_public_read on public.app_settings
  for select to anon
  using (key in (
    'registration_fee',
    'platform_name',
    'company_legal_name',
    'company_address',
    'company_office_contact',
    'support_email',
    'support_phone'
  ));

-- Signed-in users get the operational configuration their screens need. The
-- tracker hash is excluded outright: no screen wants it, and a secret nobody
-- reads should not be sitting where anybody can.
create policy as_authenticated_read on public.app_settings
  for select to authenticated
  using (key <> 'tracker_passphrase_sha256');

-- ("as_admin" ALL USING private.is_admin(auth.uid()) is unchanged, and now
--  additionally requires the admin to have presented their second factor.)
