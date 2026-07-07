-- Distributor KYC documents: Bank copy, Aadhaar card, PAN card (mandatory at
-- registration). Paths are object keys in the private "retailer-kyc" bucket.
alter table public.distributor_registrations
  add column if not exists bank_copy_path text,
  add column if not exists aadhaar_doc_path text,
  add column if not exists pan_doc_path text;

create or replace function public.submit_distributor_registration(payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_app_id text; v_txn_id text; v_pwd text; v_hash text; v_id uuid;
begin
  if coalesce(payload->>'email','') = '' or coalesce(payload->>'mobile','') = '' then
    raise exception 'email and mobile are required';
  end if;
  if coalesce(payload->>'distributor_name','') = '' then
    raise exception 'distributor_name is required';
  end if;

  v_app_id := 'BD' || lpad(nextval('public.distributor_app_seq')::text, 8, '0');
  v_txn_id := 'TXN' || to_char(now(),'YYMMDD') || lpad((floor(random()*1000000))::int::text, 6, '0');

  v_pwd := nullif(payload->>'password','');
  if v_pwd is not null then
    v_hash := extensions.crypt(v_pwd, extensions.gen_salt('bf'));
  end if;

  insert into public.distributor_registrations (
    application_id, transaction_id, status,
    distributor_name, proprietor_name, company_name, gst_number, dob, gender,
    mobile, alt_mobile, email,
    pan_number, ifsc, bank_name, account_number,
    address_line, state, district, group_name,
    form_doc_path, bank_copy_path, aadhaar_doc_path, pan_doc_path, password_hash
  ) values (
    v_app_id, v_txn_id, 'under_review',
    payload->>'distributor_name', nullif(payload->>'proprietor_name',''),
    nullif(payload->>'company_name',''), nullif(payload->>'gst_number',''),
    nullif(payload->>'dob','')::date, nullif(payload->>'gender',''),
    payload->>'mobile', nullif(payload->>'alt_mobile',''), payload->>'email',
    nullif(payload->>'pan_number',''), nullif(payload->>'ifsc',''),
    nullif(payload->>'bank_name',''), nullif(payload->>'account_number',''),
    nullif(payload->>'address_line',''), nullif(payload->>'state',''),
    nullif(payload->>'district',''), nullif(payload->>'group_name',''),
    nullif(payload->>'form_doc_path',''), nullif(payload->>'bank_copy_path',''),
    nullif(payload->>'aadhaar_doc_path',''), nullif(payload->>'pan_doc_path',''),
    v_hash
  ) returning id into v_id;

  perform public.notify_roles(
    array['admin','accountant'], 'new_distributor_registration',
    'New distributor registration',
    (payload->>'distributor_name') || ' (' || v_app_id || ') submitted a distributor registration awaiting verification.',
    '/admin/users', 'distributor_registration', v_id::text
  );

  return jsonb_build_object('id', v_id, 'application_id', v_app_id, 'transaction_id', v_txn_id, 'status', 'under_review');
end;
$function$;
