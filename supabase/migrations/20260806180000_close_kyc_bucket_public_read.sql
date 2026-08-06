-- CLOSE THE KYC BUCKET.
--
-- retailer_kyc_select_any granted SELECT on the whole retailer-kyc bucket to
-- `anon`. The anon key ships in the site's JavaScript, so every Aadhaar card,
-- PAN card, selfie and KYC video in the bucket (2,429 objects) was readable by
-- anyone on the internet. retailer_kyc_update_any let anyone OVERWRITE them.
-- Neither policy exists in any migration file — both were added out-of-band,
-- which is why nothing in the repo ever showed the hole.
--
-- Removing them is not enough on its own. The surviving retailer_read_own_kyc
-- policy compared the object's folder against the folder of ONE coalesced path
-- column, but registration documents live in a random per-submission UUID
-- folder, later uploads live under the user's own id, and re-uploads live under
-- reupload/<token>/. Measured against live data, that policy fully covered only
-- 15 of 59 retailers — dropping the blanket read without fixing it would have
-- blinded the other 44 on their own KYC Documents screen.
--
-- The replacement admits a retailer to exactly three things, all their own:
-- any folder holding a document recorded on their registration, anything under
-- their own user-id prefix (police and QC re-request uploads), and re-uploads
-- addressed to their own document-request token.

create or replace function private.owns_kyc_object(_name text)
returns boolean
language sql stable security definer
set search_path = public, storage, pg_temp
as $$
  select
    -- Uploads made after login always sit under the user's own id.
    split_part(_name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.retailer_registrations r
      where r.auth_user_id = auth.uid()
        and (
          -- Any folder that one of THIS registration's documents lives in.
          split_part(_name, '/', 1) = any (
            select distinct split_part(p, '/', 1)
            from unnest(array[
              r.selfie_path, r.pan_doc_path, r.aadhaar_doc_path,
              r.shop_photo_path, r.shop_photo_inside_path, r.video_kyc_path,
              r.police_verification_path, r.passport_photo_path,
              r.payment_screenshot_path
            ]) p
            where p is not null and p <> ''
          )
          -- Documents re-uploaded through this registration's own token link.
          or (r.doc_request_token is not null
              and _name like 'reupload/' || r.doc_request_token || '/%')
        )
    )
$$;

revoke all on function private.owns_kyc_object(text) from public, anon;
-- The policy is evaluated as the CALLING role, so a signed-in user needs
-- EXECUTE for their own-document check to run at all. The function is SECURITY
-- DEFINER, so this grants no data access — the body only ever answers
-- "is this object yours?". anon is deliberately excluded: anonymous callers
-- have no read policy on this bucket any more.
grant execute on function private.owns_kyc_object(text) to authenticated;

drop policy if exists retailer_read_own_kyc on storage.objects;
create policy retailer_read_own_kyc on storage.objects for select to authenticated
  using (bucket_id = 'retailer-kyc' and private.owns_kyc_object(name));

-- The two policies that made the bucket public. Gone.
drop policy if exists retailer_kyc_select_any on storage.objects;
drop policy if exists retailer_kyc_update_any on storage.objects;

-- Uploads: registration and the token re-upload happen while logged OUT, so a
-- policy covering anon must remain — but only one, and only INSERT. Anyone can
-- write a new object; nobody anonymous can read or change one.
drop policy if exists retailer_kyc_insert_any on storage.objects;
-- ("Registrants can upload kyc" — INSERT to anon, authenticated — is kept.)
--
-- Verified against live data after applying:
--   anonymous visitor:            0 of 2429 files
--   a retailer:                   7 of 2429 — exactly their own
--   admin/accountant/qc/telecaller: 2429 — full review access kept
--   operator, hr_staff:           0
--   all 59 retailers still reach every one of their own documents; 0 lost access.
