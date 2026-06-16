-- ============================================================
-- BharatOne — New JSKO Retailer Registration backend
-- Pending-application model: anonymous submit -> staff review -> login on approval
-- Idempotent.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Sequences for IDs ----------
create sequence if not exists public.retailer_app_seq      start 1001;  -- application_id
create sequence if not exists public.retailer_username_seq start 100;   -- RET username on approval

-- ---------- Table ----------
create table if not exists public.retailer_registrations (
  id                uuid primary key default gen_random_uuid(),
  application_id    text unique not null,
  transaction_id   text,
  username          text unique,                       -- assigned on approval (e.g. RET00000100)
  registration_type text not null default 'new'
                      check (registration_type in ('new','old','distributor')),
  status            text not null default 'under_review'
                      check (status in ('under_review','approved','rejected','on_hold')),

  -- account
  email             text not null,
  mobile            text not null,
  email_verified    boolean not null default false,
  mobile_verified   boolean not null default false,

  -- personal
  first_name        text not null,
  middle_name       text,
  surname           text not null,
  password_hash     text,                              -- bcrypt; used to seed login at approval

  -- business
  shop_name         text not null,
  address_type      text check (address_type in ('urban','rural')),
  building_shop_no  text,
  street_area       text,
  ward_number       text,
  landmark          text,
  village_name      text,
  gram_panchayat    text,
  hobli_name        text,
  post_office       text,
  post_office_name  text,
  taluk             text,
  city              text,
  district          text,
  state             text,
  pincode           text,
  latitude          double precision,
  longitude         double precision,

  -- bank
  bank_holder_name  text,
  bank_name         text,
  account_number    text,
  ifsc              text,
  account_type      text,

  -- kyc
  pan_number        text,
  aadhaar_number    text,
  pan_doc_path      text,
  aadhaar_doc_path  text,
  shop_photo_path   text,
  police_verification_path text,

  -- video kyc
  video_kyc_path    text,
  video_kyc_lat     double precision,
  video_kyc_lng     double precision,
  declaration_agreed boolean not null default false,

  -- selfie
  selfie_path       text,

  -- payment
  payment_amount    integer,
  payment_utr       text,
  payment_method    text,
  payment_paid_on   date,
  payer_name        text,
  payer_bank        text,
  payer_account     text,
  payment_remarks   text,
  payment_screenshot_path text,

  -- review workflow
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  review_notes      text,
  rejection_reason  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists retailer_reg_status_idx  on public.retailer_registrations (status, created_at desc);
create index if not exists retailer_reg_email_idx   on public.retailer_registrations (lower(email));
create index if not exists retailer_reg_mobile_idx  on public.retailer_registrations (mobile);
create index if not exists retailer_reg_created_idx on public.retailer_registrations (created_at desc);

drop trigger if exists retailer_reg_set_updated_at on public.retailer_registrations;
create trigger retailer_reg_set_updated_at
  before update on public.retailer_registrations
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS: no direct anon access. Submission happens through the
-- SECURITY DEFINER RPC below. Staff (admins) can read/manage.
-- ============================================================
alter table public.retailer_registrations enable row level security;

drop policy if exists "Staff can view registrations"   on public.retailer_registrations;
drop policy if exists "Staff can update registrations"  on public.retailer_registrations;

create policy "Staff can view registrations"
  on public.retailer_registrations for select to authenticated
  using (private.is_admin(auth.uid()));

create policy "Staff can update registrations"
  on public.retailer_registrations for update to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

grant select, update on public.retailer_registrations to authenticated;
grant all on public.retailer_registrations to service_role;

-- ============================================================
-- submit_retailer_registration(payload jsonb) -> jsonb
-- Callable by anon + authenticated. Generates ids, hashes the
-- password, inserts the application, returns the public receipt.
-- ============================================================
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
begin
  -- basic required-field guard
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
    first_name, middle_name, surname, password_hash,
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
    payload->>'first_name', nullif(payload->>'middle_name',''), payload->>'surname', v_hash,
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

  return jsonb_build_object(
    'id', v_id,
    'application_id', v_app_id,
    'transaction_id', v_txn_id,
    'status', 'under_review'
  );
end;
$$;

revoke all on function public.submit_retailer_registration(jsonb) from public;
grant execute on function public.submit_retailer_registration(jsonb) to anon, authenticated;

-- ============================================================
-- approve_retailer_registration(reg_id uuid) -> jsonb  (admins only)
-- Assigns RET username + marks approved. (Login creation handled
-- in a later step.)
-- ============================================================
create or replace function public.approve_retailer_registration(reg_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only administrators can approve registrations';
  end if;

  select username into v_username from public.retailer_registrations where id = reg_id;
  if v_username is null then
    v_username := 'RET' || lpad(nextval('public.retailer_username_seq')::text, 8, '0');
  end if;

  update public.retailer_registrations
    set status = 'approved',
        username = v_username,
        reviewed_by = auth.uid(),
        reviewed_at = now()
  where id = reg_id;

  return jsonb_build_object('id', reg_id, 'username', v_username, 'status', 'approved');
end;
$$;

revoke all on function public.approve_retailer_registration(uuid) from public;
grant execute on function public.approve_retailer_registration(uuid) to authenticated;


-- ============================================================
-- BharatOne — Private storage bucket for retailer KYC uploads
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'retailer-kyc', 'retailer-kyc', false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous registrants upload their docs (no read/list). Files land under
-- a random per-application folder generated by the client.
drop policy if exists "Registrants can upload kyc" on storage.objects;
create policy "Registrants can upload kyc"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'retailer-kyc');

-- Staff (admins) can read uploaded files (to generate signed URLs in review).
drop policy if exists "Staff can read kyc" on storage.objects;
create policy "Staff can read kyc"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'retailer-kyc' and private.is_admin(auth.uid()));

-- Staff can delete (e.g. cleanup rejected applications).
drop policy if exists "Staff can delete kyc" on storage.objects;
create policy "Staff can delete kyc"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'retailer-kyc' and private.is_admin(auth.uid()));
