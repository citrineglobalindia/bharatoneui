-- Two more things anyone could read. Found by sweeping for the same pattern
-- that app_settings turned out to have.
--
-- 1. The support-attachments bucket is PUBLIC, and support-center.tsx called
--    getPublicUrl() on every upload. People attach whatever explains their
--    problem to a support ticket — a bank statement, a photo of an ID, a
--    screenshot of a wallet. Every one of those would have been readable by
--    anyone holding the URL, with no login.
--
--    It is empty today, so nothing has leaked. Every other attachment bucket on
--    the platform (chat-attachments, service-attachments) is private and uses
--    createSignedUrl. This one was the odd one out.
--
--    Nothing in the app renders these files yet, so closing the bucket breaks
--    no screen. Doing it now, while the count is zero, is free; doing it after
--    a customer attaches a passport is not.
--
-- 2. payment_gateways and payment_routing were SELECT to PUBLIC using (true).
--    Their contents today are harmless — config is {} for both gateways. But
--    payment_gateways HAS a jsonb `config` column that exists precisely to hold
--    gateway configuration, and the day somebody puts a merchant id or a key in
--    it, that value is world-readable the instant it is saved, silently. Only
--    admin screens, one signed-in helper and the edge functions read these
--    tables; no anonymous caller does.
--
-- Verified after applying:
--   support-attachments public?  false
--   anon reads payment_gateways  0 rows
--   anon reads payment_routing   0 rows
--   tables still readable by anyone: 3 — pincodes, social_links,
--   platform_modules, all of which the logged-out site genuinely needs.

update storage.buckets set public = false where id = 'support-attachments';

drop policy if exists "support attachments read" on storage.objects;
drop policy if exists "support attachments public read" on storage.objects;

-- The person who raised the ticket can fetch their own files back; the uploader
-- id is the first folder segment, set by support-center.tsx.
create policy support_attachments_own on storage.objects
  for select to authenticated
  using (bucket_id = 'support-attachments' and split_part(name, '/', 1) = auth.uid()::text);

-- The people who answer tickets can read any of them.
create policy support_attachments_staff on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      private.is_admin(auth.uid())
      or public.has_role(auth.uid(), 'qc')
      or public.has_role(auth.uid(), 'accountant')
      or public.has_role(auth.uid(), 'telecaller')
      or public.has_role(auth.uid(), 'operator')
    )
  );

-- Payment configuration: signed-in only.
drop policy if exists "read gateways" on public.payment_gateways;
create policy read_gateways on public.payment_gateways
  for select to authenticated using (true);

drop policy if exists "read routing" on public.payment_routing;
create policy read_routing on public.payment_routing
  for select to authenticated using (true);
