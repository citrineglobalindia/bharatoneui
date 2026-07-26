-- qc_request_doc_reupload: also return the applicant's mobile so the caller can
-- send the KYC-rejected / re-upload SMS (DLT 'kyc_rejected'). Applied via the MCP.
create or replace function public.qc_request_doc_reupload(reg_id uuid, _keys text[], _note text)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
declare r public.retailer_registrations; v_tok uuid; v_name text; v_actor text; v_role text;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'accountant'))
    then raise exception 'Only QC, accountant or admin'; end if;
  select * into r from public.retailer_registrations where id=reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if coalesce(array_length(_keys,1),0)=0 then raise exception 'Select at least one document'; end if;

  v_role := case when public.has_role(auth.uid(),'qc') then 'qc'
                 when public.has_role(auth.uid(),'accountant') then 'accountant'
                 else 'admin' end;

  v_tok := gen_random_uuid();
  update public.retailer_registrations
    set doc_request_token=v_tok, doc_request_keys=_keys, doc_request_note=nullif(trim(_note),''),
        doc_request_at=now(), doc_reuploaded_keys='{}', status='docs_requested',
        qc_verified=false, qc_notes=coalesce(nullif(trim(_note),''), qc_notes)
    where id=reg_id;
  select coalesce(display_name, email) into v_actor from public.profiles p left join auth.users u on u.id=p.id where p.id=auth.uid();
  v_name := trim(r.first_name||' '||coalesce(r.surname,''));

  insert into public.retailer_doc_requests(registration_id, keys, note, token, requested_by, requested_by_name, requested_role)
    values (reg_id, _keys, nullif(trim(_note),''), v_tok, auth.uid(), coalesce(v_actor, upper(v_role)), v_role);

  insert into public.registration_events(registration_id,actor,actor_name,actor_role,action,detail)
    values (reg_id, auth.uid(), coalesce(v_actor, upper(v_role)), v_role, 'docs_requested',
            'Requested re-upload: '||array_to_string(_keys,', ')||coalesce(' — '||nullif(trim(_note),''),''));
  perform public.notify_roles(array['admin','qc','accountant'],'docs_requested','Documents re-requested',
    v_name||' ('||r.application_id||') — '||initcap(v_role)||' asked the retailer to re-upload documents.','/admin/registrations','retailer_registration',reg_id::text);
  return jsonb_build_object('token',v_tok,'email',r.email,'name',v_name,'mobile',r.mobile,'application_id',r.application_id,'keys',to_jsonb(_keys));
end $function$;
