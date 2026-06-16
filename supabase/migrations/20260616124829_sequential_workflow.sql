alter type public.app_role add value if not exists 'telecaller';

-- ============================================================
-- Phase Three: sequential workflow
-- accountant_review -> (approve) qc_review -> (approve) approved [login created]
-- reject at accountant or QC -> telecaller ; admin sees/acts on all
-- ============================================================

-- status values for the stage machine
alter table public.retailer_registrations drop constraint if exists retailer_registrations_status_check;

-- migrate any old values FIRST
update public.retailer_registrations set status='accountant_review' where status in ('under_review');
update public.retailer_registrations set status='qc_review'        where status in ('verified');

alter table public.retailer_registrations add constraint retailer_registrations_status_check
  check (status in ('accountant_review','qc_review','telecaller','approved','rejected','on_hold'));

-- SELECT visibility incl. telecaller
drop policy if exists "Staff can view registrations" on public.retailer_registrations;
create policy "Staff can view registrations" on public.retailer_registrations for select to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')
         or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));

-- storage read incl. telecaller
drop policy if exists "Staff can read kyc" on storage.objects;
create policy "Staff can read kyc" on storage.objects for select to authenticated
  using (bucket_id='retailer-kyc' and (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')
         or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller')));

-- ledger view incl. telecaller (so they have context) - keep admin/accountant/qc; add telecaller read
drop policy if exists "Staff can view ledger" on public.ledger_entries;
create policy "Staff can view ledger" on public.ledger_entries for select to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')
         or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));

-- ---------- internal: finalize (create login + ledger) ----------
create or replace function public._finalize_retailer(reg_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.retailer_registrations; v_user text; v_pass text; v_uid uuid; v_email text; v_name text;
begin
  select * into r from public.retailer_registrations where id = reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if r.status = 'approved' then raise exception 'Already approved'; end if;
  v_email := lower(r.email);
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with email % already exists', v_email; end if;
  v_user := coalesce(r.username, 'RET' || lpad(nextval('public.retailer_username_seq')::text, 8, '0'));
  v_pass := 'Rtl' || substr(md5(random()::text),1,6) || (floor(random()*90+10))::int::text || '@';
  v_name := trim(both ' ' from r.first_name || ' ' || coalesce(r.surname,''));
  v_uid  := gen_random_uuid();
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
    raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous,confirmation_token,recovery_token,email_change,email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000',v_uid,'authenticated','authenticated',v_email,
    extensions.crypt(v_pass, extensions.gen_salt('bf')),now(),now(),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name',v_name,'department','Retailer','designation','Retailer','role','retailer','employee_code',v_user),
    false,false,'','','','');
  insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  values (v_uid::text,v_uid,jsonb_build_object('sub',v_uid::text,'email',v_email,'email_verified',true),'email',now(),now(),now());
  update public.retailer_registrations
    set status='approved', username=v_user, auth_user_id=v_uid, approved_by=auth.uid(), approved_at=now(), reviewed_by=auth.uid(), reviewed_at=now()
  where id=reg_id;
  insert into public.ledger_entries (entry_type,registration_id,application_id,retailer_name,amount,direction,utr,payment_method,recorded_by)
  values ('registration_fee',reg_id,r.application_id,v_name,coalesce(r.payment_amount,0),'credit',r.payment_utr,r.payment_method,auth.uid());
  perform public.notify_roles(array['admin','accountant','qc'],'approved','Retailer approved',
    v_name||' ('||r.application_id||') approved. ID '||v_user||'.', '/admin/registrations','retailer_registration', reg_id::text);
  return jsonb_build_object('id',reg_id,'status','approved','username',v_user,'email',v_email,'password',v_pass);
end; $fn$;
revoke all on function public._finalize_retailer(uuid) from public, anon, authenticated;

-- ---------- accountant: approve -> QC ; reject -> telecaller ----------
create or replace function public.verify_retailer_payment(reg_id uuid, received boolean, notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can verify payment'; end if;
  select * into r from public.retailer_registrations where id=reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if received then
    update public.retailer_registrations set payment_verified=true, payment_verified_by=auth.uid(),
      payment_verified_at=now(), payment_verification_notes=notes, status='qc_review' where id=reg_id;
    perform public.notify_roles(array['qc','admin'],'forwarded_to_qc','Forwarded to QC',
      r.first_name||' '||r.surname||' ('||r.application_id||') payment verified by accountant — awaiting QC.',
      '/qc/kyc-queue','retailer_registration', reg_id::text);
    return jsonb_build_object('id',reg_id,'status','qc_review');
  else
    update public.retailer_registrations set payment_verified=false, payment_verified_by=auth.uid(),
      payment_verified_at=now(), payment_verification_notes=notes, status='telecaller',
      rejection_reason=coalesce(notes,'Payment not received') where id=reg_id;
    perform public.notify_roles(array['telecaller','admin'],'sent_to_telecaller','Sent to Telecaller',
      r.first_name||' '||r.surname||' ('||r.application_id||') rejected by accountant — needs follow-up.',
      '/telecaller/registrations','retailer_registration', reg_id::text);
    return jsonb_build_object('id',reg_id,'status','telecaller');
  end if;
end; $fn$;

-- ---------- QC: approve = FINAL (login) ; reject -> telecaller ----------
create or replace function public.verify_retailer_qc(reg_id uuid, verified boolean, notes text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')) then
    raise exception 'Only QC or admin can verify retailer'; end if;
  select * into r from public.retailer_registrations where id=reg_id;
  if r.id is null then raise exception 'Registration not found'; end if;
  if verified then
    update public.retailer_registrations set qc_verified=true, qc_verified_by=auth.uid(), qc_verified_at=now(), qc_notes=notes where id=reg_id;
    return public._finalize_retailer(reg_id);
  else
    update public.retailer_registrations set qc_verified=false, qc_verified_by=auth.uid(), qc_verified_at=now(),
      qc_notes=notes, status='telecaller', rejection_reason=coalesce(notes,'Rejected by QC') where id=reg_id;
    perform public.notify_roles(array['telecaller','admin'],'sent_to_telecaller','Sent to Telecaller',
      r.first_name||' '||r.surname||' ('||r.application_id||') rejected by QC — needs follow-up.',
      '/telecaller/registrations','retailer_registration', reg_id::text);
    return jsonb_build_object('id',reg_id,'status','telecaller');
  end if;
end; $fn$;

-- ---------- admin override approve ----------
create or replace function public.approve_retailer_registration(reg_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only administrators can approve'; end if;
  return public._finalize_retailer(reg_id);
end; $fn$;

-- ---------- telecaller: re-send to accountant ----------
create or replace function public.route_to_accountant(reg_id uuid, notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'telecaller')) then
    raise exception 'Only telecaller or admin can re-route'; end if;
  update public.retailer_registrations set status='accountant_review', rejection_reason=null where id=reg_id returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;
  perform public.notify_roles(array['accountant','admin'],'reopened','Re-sent to Accountant',
    r.first_name||' '||r.surname||' ('||r.application_id||') re-submitted by telecaller after follow-up.',
    '/accountant/registrations','retailer_registration', reg_id::text);
  return jsonb_build_object('id',reg_id,'status','accountant_review');
end; $fn$;
revoke all on function public.route_to_accountant(uuid,text) from public;
grant execute on function public.route_to_accountant(uuid,text) to authenticated;
