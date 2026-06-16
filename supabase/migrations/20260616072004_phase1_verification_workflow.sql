-- ============================================================
-- BharatOne — Phase One: Retailer verification & approval workflow
-- new registration -> notify admin/accountant/qc
--   -> accountant verifies payment + QC verifies retailer
--   -> admin final approval -> generate RET id + password + retailer login
-- Idempotent.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 1. Roles ----------
alter type public.app_role add value if not exists 'accountant';
alter type public.app_role add value if not exists 'qc';
alter type public.app_role add value if not exists 'retailer';

-- ---------- 2. Workflow columns ----------
alter table public.retailer_registrations
  add column if not exists payment_verified boolean not null default false,
  add column if not exists payment_verified_by uuid references auth.users(id),
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verification_notes text,
  add column if not exists qc_verified boolean not null default false,
  add column if not exists qc_verified_by uuid references auth.users(id),
  add column if not exists qc_verified_at timestamptz,
  add column if not exists qc_notes text,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists auth_user_id uuid references auth.users(id);

-- status now includes 'verified' (both checks done, awaiting admin approval)
alter table public.retailer_registrations
  drop constraint if exists retailer_registrations_status_check;
alter table public.retailer_registrations
  add constraint retailer_registrations_status_check
  check (status in ('under_review','verified','approved','rejected','on_hold'));

-- ---------- 3. Notifications ----------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  entity_type text,
  entity_id   text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users see own notifications"    on public.notifications;
drop policy if exists "Users update own notifications"  on public.notifications;
create policy "Users see own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- ---------- 4. Notification fan-out helper ----------
create or replace function public.notify_roles(
  _roles text[], _type text, _title text, _body text, _link text,
  _entity_type text, _entity_id text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select distinct ur.user_id, _type, _title, _body, _link, _entity_type, _entity_id
  from public.user_roles ur
  where ur.role::text = any(_roles);
$$;

-- ---------- 5. Recreate submit RPC with notification fan-out ----------
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

-- ---------- 6. Accountant: verify payment ----------
create or replace function public.verify_retailer_payment(reg_id uuid, received boolean, notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can verify payment';
  end if;

  update public.retailer_registrations
    set payment_verified = received,
        payment_verified_by = auth.uid(),
        payment_verified_at = now(),
        payment_verification_notes = notes
  where id = reg_id
  returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;

  if r.payment_verified and r.qc_verified and r.status = 'under_review' then
    update public.retailer_registrations set status = 'verified' where id = reg_id;
    perform public.notify_roles(array['admin'],'ready_for_approval','Ready for approval',
      r.first_name||' '||r.surname||' ('||r.application_id||') passed payment + QC checks.',
      '/admin','retailer_registration', reg_id::text);
  end if;

  return jsonb_build_object('id', reg_id, 'payment_verified', received);
end;
$$;
revoke all on function public.verify_retailer_payment(uuid, boolean, text) from public;
grant execute on function public.verify_retailer_payment(uuid, boolean, text) to authenticated;

-- ---------- 7. QC: verify retailer ----------
create or replace function public.verify_retailer_qc(reg_id uuid, verified boolean, notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')) then
    raise exception 'Only QC or admin can verify retailer';
  end if;

  update public.retailer_registrations
    set qc_verified = verified,
        qc_verified_by = auth.uid(),
        qc_verified_at = now(),
        qc_notes = notes
  where id = reg_id
  returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;

  if r.payment_verified and r.qc_verified and r.status = 'under_review' then
    update public.retailer_registrations set status = 'verified' where id = reg_id;
    perform public.notify_roles(array['admin'],'ready_for_approval','Ready for approval',
      r.first_name||' '||r.surname||' ('||r.application_id||') passed payment + QC checks.',
      '/admin','retailer_registration', reg_id::text);
  end if;

  return jsonb_build_object('id', reg_id, 'qc_verified', verified);
end;
$$;
revoke all on function public.verify_retailer_qc(uuid, boolean, text) from public;
grant execute on function public.verify_retailer_qc(uuid, boolean, text) to authenticated;

-- ---------- 8. Admin: final approve -> generate id + password + login ----------
create or replace function public.approve_retailer_registration(reg_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r        public.retailer_registrations;
  v_user   text;
  v_pass   text;
  v_uid    uuid;
  v_email  text;
  v_name   text;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only administrators can approve registrations';
  end if;

  select * into r from public.retailer_registrations where id = reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if not r.payment_verified then raise exception 'Payment not yet verified by accountant'; end if;
  if not r.qc_verified then raise exception 'Retailer not yet verified by QC'; end if;
  if r.status = 'approved' then raise exception 'Already approved'; end if;

  v_email := lower(r.email);
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with email % already exists', v_email;
  end if;

  v_user := coalesce(r.username, 'RET' || lpad(nextval('public.retailer_username_seq')::text, 8, '0'));
  v_pass := 'Rtl' || substr(md5(random()::text),1,6) || (floor(random()*90+10))::int::text || '@';
  v_name := trim(both ' ' from r.first_name || ' ' || coalesce(r.surname,''));
  v_uid  := gen_random_uuid();

  -- create the auth user (handle_new_user trigger creates profile + retailer role from metadata)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', v_name, 'department', 'Retailer',
                       'designation', 'Retailer', 'role', 'retailer', 'employee_code', v_user),
    false, false,
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  update public.retailer_registrations
    set status = 'approved', username = v_user, auth_user_id = v_uid,
        approved_by = auth.uid(), approved_at = now(),
        reviewed_by = auth.uid(), reviewed_at = now()
  where id = reg_id;

  perform public.notify_roles(array['admin','accountant','qc'],'approved','Retailer approved',
    v_name||' ('||r.application_id||') approved. ID '||v_user||'.',
    '/admin','retailer_registration', reg_id::text);

  return jsonb_build_object(
    'id', reg_id, 'status', 'approved',
    'username', v_user, 'email', v_email, 'password', v_pass
  );
end;
$$;
revoke all on function public.approve_retailer_registration(uuid) from public;
grant execute on function public.approve_retailer_registration(uuid) to authenticated;

-- ---------- 9. Reject ----------
create or replace function public.reject_retailer_registration(reg_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Not authorised to reject';
  end if;
  update public.retailer_registrations
    set status='rejected', rejection_reason=reason, reviewed_by=auth.uid(), reviewed_at=now()
  where id=reg_id returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;
  return jsonb_build_object('id', reg_id, 'status', 'rejected');
end;
$$;
revoke all on function public.reject_retailer_registration(uuid, text) from public;
grant execute on function public.reject_retailer_registration(uuid, text) to authenticated;

-- ---------- 10. Admin: create staff accounts (for admin UI) ----------
create or replace function public.create_staff_account(_email text, _password text, _name text, _role text, _department text default null)
returns jsonb language plpgsql security definer set search_path=public, extensions as $fn$
declare v_uid uuid; v_email text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only administrators can create staff'; end if;
  v_email := lower(_email);
  if exists (select 1 from auth.users where lower(email)=v_email) then raise exception 'User % already exists', v_email; end if;
  v_uid := gen_random_uuid();
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
    raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous,confirmation_token,recovery_token,email_change,email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000',v_uid,'authenticated','authenticated',v_email,
    extensions.crypt(_password, extensions.gen_salt('bf')),now(),now(),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name',_name,'department',coalesce(_department,initcap(_role)),'role',_role),
    false,false,'','','','');
  insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  values (v_uid::text,v_uid,jsonb_build_object('sub',v_uid::text,'email',v_email,'email_verified',true),'email',now(),now(),now());
  return jsonb_build_object('id',v_uid,'email',v_email,'role',_role);
end;$fn$;
revoke all on function public.create_staff_account(text,text,text,text,text) from public;
grant execute on function public.create_staff_account(text,text,text,text,text) to authenticated;
