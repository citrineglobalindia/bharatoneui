-- Per-document requests for live retailers: link a request to one of the
-- registration's document slots (doc_key) so QC can compare old vs new, and
-- approving replaces the document of record on the registration.
-- Applied via Supabase MCP on 2026-07-21; kept here for traceability.
alter table public.kyc_doc_requests add column if not exists doc_key text;

drop function if exists public.qc_request_kyc_doc(uuid, text, text);
create or replace function public.qc_request_kyc_doc(_user_id uuid, _doc_label text, _note text default null, _doc_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_qc uuid := auth.uid();
  v_id uuid;
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_qc and ur.role::text in ('qc','admin')) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  if btrim(coalesce(_doc_label,'')) = '' then return jsonb_build_object('ok', false, 'reason', 'no_label'); end if;
  insert into public.kyc_doc_requests (user_id, doc_label, note, requested_by, doc_key)
  values (_user_id, btrim(_doc_label), nullif(btrim(coalesce(_note,'')),''), v_qc, nullif(btrim(coalesce(_doc_key,'')),''))
  returning id into v_id;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (_user_id, 'kyc_doc_requested', 'Document required',
          format('The QC team has asked you to upload: %s.%s Open KYC Docs to upload it.',
                 btrim(_doc_label),
                 case when coalesce(btrim(_note),'') <> '' then ' Note: ' || btrim(_note) || '.' else '' end),
          '/video-kyc', 'kyc_doc_request', v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- The retailer's current documents, so QC can request a re-upload per document.
create or replace function public.qc_retailer_docs(_user_id uuid)
returns table (doc_key text, doc_label text, path text)
language sql security definer set search_path = public as $$
  with reg as (
    select * from public.retailer_registrations
    where auth_user_id = _user_id order by created_at desc limit 1
  )
  select d.doc_key, d.doc_label, d.path
  from reg, lateral (values
    ('pan', 'PAN Card', reg.pan_doc_path),
    ('aadhaar', 'Aadhaar Card', reg.aadhaar_doc_path),
    ('passport_photo', 'Passport Photo', reg.passport_photo_path),
    ('selfie', 'Selfie', reg.selfie_path),
    ('shop_photo', 'Shop Photo (outside)', reg.shop_photo_path),
    ('shop_photo_inside', 'Shop Photo (inside)', reg.shop_photo_inside_path),
    ('video_kyc', 'Video KYC', reg.video_kyc_path),
    ('police', 'Police Verification', reg.police_verification_path)
  ) as d(doc_key, doc_label, path)
  where exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin'));
$$;

drop function if exists public.qc_list_kyc_doc_requests(text);
create or replace function public.qc_list_kyc_doc_requests(_status text default null)
returns table (id uuid, user_id uuid, doc_key text, doc_label text, note text, status text, file_path text, old_path text, uploaded_at timestamptz, remarks text, created_at timestamptz, requester_name text, requester_email text, requester_phone text, application_id text, jsko_id text)
language sql security definer set search_path = public as $$
  select r.id, r.user_id, r.doc_key, r.doc_label, r.note, r.status, r.file_path,
         case r.doc_key
           when 'pan' then reg.pan_doc_path
           when 'aadhaar' then reg.aadhaar_doc_path
           when 'passport_photo' then reg.passport_photo_path
           when 'selfie' then reg.selfie_path
           when 'shop_photo' then reg.shop_photo_path
           when 'shop_photo_inside' then reg.shop_photo_inside_path
           when 'video_kyc' then reg.video_kyc_path
           when 'police' then reg.police_verification_path
         end as old_path,
         r.uploaded_at, r.remarks, r.created_at,
         p.display_name, u.email, p.phone, reg.application_id,
         coalesce(
           nullif(btrim(reg.username), ''),
           case when upper(btrim(coalesce(reg.jsko_id,''))) not in ('', 'DEMO') then btrim(reg.jsko_id) end
         ) as jsko_id
  from public.kyc_doc_requests r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  left join lateral (
    select rr.* from public.retailer_registrations rr
    where rr.auth_user_id = r.user_id order by rr.created_at desc limit 1
  ) reg on true
  where (_status is null or r.status = _status)
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin'))
  order by r.created_at desc;
$$;

-- Approving a keyed request replaces the registration's document of record.
create or replace function public.qc_review_kyc_doc_request(_id uuid, _approve boolean, _remarks text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_qc uuid := auth.uid();
  r record;
  v_reg_id uuid;
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_qc and ur.role::text in ('qc','admin')) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  select * into r from public.kyc_doc_requests where id = _id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'uploaded' then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  if _approve and r.doc_key is not null then
    select id into v_reg_id from public.retailer_registrations
    where auth_user_id = r.user_id order by created_at desc limit 1;
    if v_reg_id is not null then
      update public.retailer_registrations set
        pan_doc_path = case when r.doc_key = 'pan' then r.file_path else pan_doc_path end,
        aadhaar_doc_path = case when r.doc_key = 'aadhaar' then r.file_path else aadhaar_doc_path end,
        passport_photo_path = case when r.doc_key = 'passport_photo' then r.file_path else passport_photo_path end,
        selfie_path = case when r.doc_key = 'selfie' then r.file_path else selfie_path end,
        shop_photo_path = case when r.doc_key = 'shop_photo' then r.file_path else shop_photo_path end,
        shop_photo_inside_path = case when r.doc_key = 'shop_photo_inside' then r.file_path else shop_photo_inside_path end,
        video_kyc_path = case when r.doc_key = 'video_kyc' then r.file_path else video_kyc_path end,
        police_verification_path = case when r.doc_key = 'police' then r.file_path else police_verification_path end
      where id = v_reg_id;
    end if;
  end if;
  update public.kyc_doc_requests
     set status = case when _approve then 'verified' else 'rejected' end,
         remarks = _remarks, reviewed_by = v_qc, reviewed_at = now()
   where id = _id;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id,
          case when _approve then 'kyc_doc_verified' else 'kyc_doc_rejected' end,
          case when _approve then 'Document verified' else 'Document rejected — re-upload needed' end,
          format('Your %s was %s.%s', r.doc_label,
                 case when _approve then 'verified by the QC team' else 'rejected — please upload it again' end,
                 case when coalesce(btrim(_remarks),'') <> '' then ' Remarks: ' || btrim(_remarks) end),
          '/video-kyc', 'kyc_doc_request', _id::text);
  return jsonb_build_object('ok', true);
end $$;
