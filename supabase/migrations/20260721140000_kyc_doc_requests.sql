-- QC requests a document from a live (approved) retailer; the retailer uploads
-- it on the KYC Docs page and QC verifies the upload. Status flow:
-- requested -> uploaded -> verified | rejected (rejected allows re-upload).
-- Applied via Supabase MCP on 2026-07-21; kept here for traceability.
create table if not exists public.kyc_doc_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_label text not null,
  note text,
  status text not null default 'requested' check (status in ('requested','uploaded','verified','rejected')),
  file_path text,
  uploaded_at timestamptz,
  requested_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  remarks text,
  created_at timestamptz not null default now()
);
alter table public.kyc_doc_requests enable row level security;
create policy "Own doc requests visible" on public.kyc_doc_requests
  for select to authenticated using (user_id = auth.uid());
create policy "Staff see all doc requests" on public.kyc_doc_requests
  for select to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin')));
grant select on public.kyc_doc_requests to authenticated;
grant all on public.kyc_doc_requests to service_role;

-- QC creates a request and the retailer is notified on their bell + KYC Docs page.
create or replace function public.qc_request_kyc_doc(_user_id uuid, _doc_label text, _note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_qc uuid := auth.uid();
  v_id uuid;
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_qc and ur.role::text in ('qc','admin')) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  if btrim(coalesce(_doc_label,'')) = '' then return jsonb_build_object('ok', false, 'reason', 'no_label'); end if;
  insert into public.kyc_doc_requests (user_id, doc_label, note, requested_by)
  values (_user_id, btrim(_doc_label), nullif(btrim(coalesce(_note,'')),''), v_qc)
  returning id into v_id;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (_user_id, 'kyc_doc_requested', 'Document required',
          format('The QC team has asked you to upload: %s.%s Open KYC Docs to upload it.',
                 btrim(_doc_label),
                 case when coalesce(btrim(_note),'') <> '' then ' Note: ' || btrim(_note) || '.' else '' end),
          '/video-kyc', 'kyc_doc_request', v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Retailer attaches the uploaded file; QC/admin get notified to review.
create or replace function public.submit_kyc_doc_request(_id uuid, _path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  select * into r from public.kyc_doc_requests where id = _id and user_id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status not in ('requested','rejected') then return jsonb_build_object('ok', false, 'reason', 'not_awaiting_upload'); end if;
  if btrim(coalesce(_path,'')) = '' then return jsonb_build_object('ok', false, 'reason', 'no_file'); end if;
  update public.kyc_doc_requests
     set file_path = _path, uploaded_at = now(), status = 'uploaded', remarks = null
   where id = _id;
  perform public.notify_roles(
    array['qc','admin'], 'kyc_doc_uploaded', 'Document uploaded for review',
    format('%s has been uploaded by the retailer and awaits verification.', r.doc_label),
    '/qc/doc-requests', 'kyc_doc_request', _id::text);
  return jsonb_build_object('ok', true);
end $$;

-- QC verifies or rejects the uploaded document; retailer is notified either way.
create or replace function public.qc_review_kyc_doc_request(_id uuid, _approve boolean, _remarks text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_qc uuid := auth.uid();
  r record;
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_qc and ur.role::text in ('qc','admin')) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  select * into r from public.kyc_doc_requests where id = _id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'uploaded' then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
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
                 case when coalesce(btrim(_remarks),'') <> '' then ' Remarks: ' || btrim(_remarks) else '' end),
          '/video-kyc', 'kyc_doc_request', _id::text);
  return jsonb_build_object('ok', true);
end $$;

-- QC listing with retailer identity for the review table.
create or replace function public.qc_list_kyc_doc_requests(_status text default null)
returns table (id uuid, user_id uuid, doc_label text, note text, status text, file_path text, uploaded_at timestamptz, remarks text, created_at timestamptz, requester_name text, requester_email text, requester_phone text, application_id text, jsko_id text)
language sql security definer set search_path = public as $$
  select r.id, r.user_id, r.doc_label, r.note, r.status, r.file_path, r.uploaded_at, r.remarks, r.created_at,
         p.display_name, u.email, p.phone, reg.application_id,
         coalesce(
           nullif(btrim(reg.username), ''),
           case when upper(btrim(coalesce(reg.jsko_id,''))) not in ('', 'DEMO') then btrim(reg.jsko_id) end
         ) as jsko_id
  from public.kyc_doc_requests r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  left join lateral (
    select rr.application_id, rr.username, rr.jsko_id from public.retailer_registrations rr
    where rr.auth_user_id = r.user_id order by rr.created_at desc limit 1
  ) reg on true
  where (_status is null or r.status = _status)
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin'))
  order by r.created_at desc;
$$;

-- Search live retailers (linked auth account) to pick who to request from.
create or replace function public.qc_search_live_retailers(_q text)
returns table (user_id uuid, full_name text, application_id text, jsko_id text, email text, mobile text, reg_status text)
language sql security definer set search_path = public as $$
  select rr.auth_user_id,
         btrim(concat_ws(' ', nullif(btrim(rr.first_name),''), nullif(btrim(rr.middle_name),''), nullif(btrim(rr.surname),''))),
         rr.application_id,
         coalesce(nullif(btrim(rr.username),''),
                  case when upper(btrim(coalesce(rr.jsko_id,''))) not in ('','DEMO') then btrim(rr.jsko_id) end),
         rr.email, rr.mobile, rr.status
  from public.retailer_registrations rr
  where rr.auth_user_id is not null
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('qc','admin'))
    and (
      coalesce(_q,'') = '' or
      rr.application_id ilike '%'||_q||'%' or rr.username ilike '%'||_q||'%' or rr.jsko_id ilike '%'||_q||'%' or
      rr.email ilike '%'||_q||'%' or rr.mobile ilike '%'||_q||'%' or
      concat_ws(' ', rr.first_name, rr.middle_name, rr.surname) ilike '%'||_q||'%'
    )
  order by rr.created_at desc
  limit 10;
$$;
