-- Helper: list admin emails (for server-side email notifications).
create or replace function public.admin_emails()
returns setof text
language sql
security definer
set search_path to 'public', 'auth'
as $function$
  select u.email
  from auth.users u
  join public.user_roles r on r.user_id = u.id
  where r.role = 'admin' and coalesce(u.email,'') <> '';
$function$;
revoke all on function public.admin_emails() from public, anon;
grant execute on function public.admin_emails() to authenticated, service_role;

-- On every re-upload, notify Admin + QC + Accountant in-app (re-uploaded docs are
-- visible to all three in the review page). Returns app_id/retailer so the client
-- can trigger the admin email edge function.
create or replace function public.submit_doc_reupload(_token uuid, _key text, _path text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r public.retailer_registrations; v_col text; v_done text[]; v_all boolean; v_name text;
begin
  select * into r from public.retailer_registrations where doc_request_token=_token;
  if r.id is null then raise exception 'INVALID_OR_EXPIRED_LINK'; end if;
  if not (_key = any(r.doc_request_keys)) then raise exception 'Document not requested'; end if;
  v_col := case _key
    when 'selfie' then 'selfie_path' when 'shop' then 'shop_photo_path' when 'shop_inside' then 'shop_photo_inside_path'
    when 'passport' then 'passport_photo_path' when 'aadhaar' then 'aadhaar_doc_path'
    when 'pan' then 'pan_doc_path' when 'police' then 'police_verification_path' when 'video' then 'video_kyc_path' else null end;
  if v_col is null then raise exception 'Unknown document key'; end if;
  execute format('update public.retailer_registrations set %I=$1 where id=$2', v_col) using _path, r.id;
  update public.retailer_registrations
     set doc_reviews = coalesce(doc_reviews,'{}'::jsonb) || jsonb_build_object(_key, jsonb_build_object('status','pending')),
         doc_reuploaded_keys = (select array(select distinct unnest(doc_reuploaded_keys || array[_key])))
   where id=r.id
   returning doc_reuploaded_keys into v_done;
  insert into public.registration_events(registration_id,actor_name,actor_role,action,detail)
    values (r.id, trim(r.first_name||' '||coalesce(r.surname,'')), 'retailer', 'doc_reuploaded', 'Re-uploaded: '||_key);
  v_name := trim(r.first_name||' '||coalesce(r.surname,''));
  perform public.notify_roles(array['admin','qc','accountant'],'doc_reuploaded','Document re-uploaded',
    v_name||' ('||r.application_id||') re-uploaded '||_key||'.',
    '/qc/kyc-queue','retailer_registration', r.id::text);
  v_all := (select bool_and(k = any(v_done)) from unnest(r.doc_request_keys) k);
  if v_all then
    update public.retailer_registrations set status='qc_review', doc_request_token=null where id=r.id;
    insert into public.registration_events(registration_id,actor_name,actor_role,action,detail)
      values (r.id, v_name, 'retailer', 'resubmitted_to_qc', 'All requested documents re-uploaded — sent back for QC approval.');
    perform public.notify_roles(array['qc','admin','accountant'],'ready_for_approval','QC approval requested',
      v_name||' ('||r.application_id||') re-uploaded the requested documents and needs QC approval.',
      '/qc/kyc-queue','retailer_registration', r.id::text);
  end if;
  return jsonb_build_object('ok', true, 'all_done', v_all, 'app_id', r.application_id, 'retailer', v_name);
end $function$;
