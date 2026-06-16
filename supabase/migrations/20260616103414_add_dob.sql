alter table public.retailer_registrations add column if not exists dob date;

create or replace function public.submit_retailer_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_app_id text;
  v_txn_id text;
  v_pwd    text;
  v_hash   text;
  v_id     uuid;
  v_name   text;
begin
  if coalesce(payload->>'email','') = '' or coalesce(payload->>'mobile','') = '' then
    raise exception 'email and mobile are required';
  end if;
  if coalesce(payload->>'first_name','') = '' or coalesce(payload->>'surname','') = '' then
    raise exception 'first_name and surname are required';
  end if;

  v_app_id := 'BO' || lpad(nextval('public.retailer_app_seq')::text, 8, '0');
  v_txn_id := 'TXN' || to_char(now(),'YYMMDD') || lpad((floor(random()*1000000))::int::text, 6, '0');

  v_pwd := nullif(payload->>'password','');
  if v_pwd is not null then
    v_hash := extensions.crypt(v_pwd, extensions.gen_salt('bf'));
  end if;

  insert into public.retailer_registrations (
    application_id, transaction_id, registration_type, status,
    email, mobile, email_verified, mobile_verified,
    first_name, middle_name, surname, password_hash, dob,
    shop_name, address_type,
    building_shop_no, street_area, ward_number, landmark,
    village_name, gram_panchayat, hobli_name, post_office, post_office_name, taluk,
    city, district, state, pincode, latitude, longitude,
    bank_holder_name, bank_name, account_number, ifsc, account_type,
    pan_number, aadhaar_number,
    pan_doc_path, aadhaar_doc_path, shop_photo_path, police_verification_path,
    video_kyc_path, video_kyc_lat, video_kyc_lng, declaration_agreed,
    selfie_path,
    payment_amount, payment_utr, payment_method, payment_paid_on,
    payer_name, payer_bank, payer_account, payment_remarks, payment_screenshot_path
  ) values (
    v_app_id, v_txn_id,
    coalesce(nullif(payload->>'registration_type',''),'new'),
    'under_review',
    payload->>'email', payload->>'mobile',
    coalesce((payload->>'email_verified')::boolean,false),
    coalesce((payload->>'mobile_verified')::boolean,false),
    payload->>'first_name', nullif(payload->>'middle_name',''), payload->>'surname', v_hash, nullif(payload->>'dob','')::date,
    payload->>'shop_name', nullif(payload->>'address_type',''),
    nullif(payload->>'building_shop_no',''), nullif(payload->>'street_area',''),
    nullif(payload->>'ward_number',''), nullif(payload->>'landmark',''),
    nullif(payload->>'village_name',''), nullif(payload->>'gram_panchayat',''),
    nullif(payload->>'hobli_name',''), nullif(payload->>'post_office',''),
    nullif(payload->>'post_office_name',''), nullif(payload->>'taluk',''),
    nullif(payload->>'city',''), nullif(payload->>'district',''),
    nullif(payload->>'state',''), nullif(payload->>'pincode',''),
    (payload->>'latitude')::double precision, (payload->>'longitude')::double precision,
    nullif(payload->>'bank_holder_name',''), nullif(payload->>'bank_name',''),
    nullif(payload->>'account_number',''), nullif(payload->>'ifsc',''),
    nullif(payload->>'account_type',''),
    nullif(payload->>'pan_number',''), nullif(payload->>'aadhaar_number',''),
    nullif(payload->>'pan_doc_path',''), nullif(payload->>'aadhaar_doc_path',''),
    nullif(payload->>'shop_photo_path',''), nullif(payload->>'police_verification_path',''),
    nullif(payload->>'video_kyc_path',''),
    (payload->>'video_kyc_lat')::double precision, (payload->>'video_kyc_lng')::double precision,
    coalesce((payload->>'declaration_agreed')::boolean,false),
    nullif(payload->>'selfie_path',''),
    (payload->>'payment_amount')::int, nullif(payload->>'payment_utr',''),
    nullif(payload->>'payment_method',''), nullif(payload->>'payment_paid_on','')::date,
    nullif(payload->>'payer_name',''), nullif(payload->>'payer_bank',''),
    nullif(payload->>'payer_account',''), nullif(payload->>'payment_remarks',''),
    nullif(payload->>'payment_screenshot_path','')
  )
  returning id into v_id;

  v_name := trim(both ' ' from (payload->>'first_name') || ' ' || coalesce(payload->>'surname',''));

  perform public.notify_roles(
    array['admin','accountant','qc'],
    'new_registration',
    'New retailer registration',
    v_name || ' (' || v_app_id || ') submitted a registration awaiting verification.',
    '/applications',
    'retailer_registration', v_id::text
  );

  return jsonb_build_object(
    'id', v_id, 'application_id', v_app_id,
    'transaction_id', v_txn_id, 'status', 'under_review'
  );
end;
$$;

revoke all on function public.submit_retailer_registration(jsonb) from public;
grant execute on function public.submit_retailer_registration(jsonb) to anon, authenticated;
