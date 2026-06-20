-- Distributor application review: approve (provisions a login account) + reject.

create sequence if not exists public.distributor_username_seq start 1;

-- Approve: create the auth user (role=distributor) so the on_auth_user_created
-- trigger provisions profile + user_roles, enrich the profile, and mark approved.
-- The distributor logs in with the password they set at registration (we reuse
-- the stored bcrypt hash); if none was stored, a temporary password is generated
-- and returned to the caller.
create or replace function public.approve_distributor_registration(reg_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  r        public.distributor_registrations;
  v_user   text;
  v_pass   text;
  v_hash   text;
  v_uid    uuid;
  v_email  text;
  v_gen    boolean := false;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Only administrators can approve';
  end if;

  select * into r from public.distributor_registrations where id = reg_id;
  if r.id is null then raise exception 'Distributor registration not found'; end if;
  if r.status = 'approved' then raise exception 'Already approved'; end if;

  v_email := lower(r.email);
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with email % already exists', v_email;
  end if;

  v_user := coalesce(r.username, 'DST' || lpad(nextval('public.distributor_username_seq')::text, 8, '0'));

  if r.password_hash is not null then
    v_hash := r.password_hash;
  else
    v_pass := 'Dst' || substr(md5(random()::text),1,6) || (floor(random()*90+10))::int::text || '@';
    v_hash := extensions.crypt(v_pass, extensions.gen_salt('bf'));
    v_gen  := true;
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
    raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous,
    confirmation_token,recovery_token,email_change,email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000',v_uid,'authenticated','authenticated',v_email,
    v_hash,now(),now(),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', r.distributor_name,
      'department','Distributor','designation','Distributor',
      'role','distributor','employee_code',v_user
    ),
    false,false,'','','',''
  );

  insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  values (v_uid::text,v_uid,jsonb_build_object('sub',v_uid::text,'email',v_email,'email_verified',true),'email',now(),now(),now());

  -- enrich the profile created by the on_auth_user_created trigger
  update public.profiles set
    phone = r.mobile,
    alt_phone = r.alt_mobile,
    gender = r.gender,
    dob = r.dob,
    street_address = r.address_line,
    district = r.district,
    state = r.state,
    pan_number = r.pan_number,
    bank_name = r.bank_name,
    account_number = r.account_number,
    ifsc = r.ifsc,
    updated_at = now()
  where id = v_uid;

  update public.distributor_registrations set
    status='approved', username=v_user, auth_user_id=v_uid,
    approved_by=auth.uid(), approved_at=now(),
    reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=null
  where id = reg_id;

  perform public.notify_roles(
    array['admin','accountant'],
    'distributor_approved','Distributor approved',
    r.distributor_name||' ('||r.application_id||') approved. Login ID '||v_user||'.',
    '/admin/users','distributor_registration', reg_id::text
  );

  insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
  values (v_uid,'approved','Welcome to BharatOne 🎉',
    'Your distributor account ('||v_user||') is approved and active. '||
    case when v_gen then 'A temporary password has been issued — please reset it after logging in.'
         else 'Log in with the email and password you registered with.' end,
    '/dashboard','distributor_registration', reg_id::text);

  return jsonb_build_object(
    'id', reg_id, 'status','approved', 'username', v_user, 'email', v_email,
    'password', case when v_gen then v_pass else null end
  );
end;
$function$;

grant execute on function public.approve_distributor_registration(uuid) to authenticated;

-- Reject: mark rejected with a required reason.
create or replace function public.reject_distributor_registration(reg_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rec public.distributor_registrations;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if coalesce(reason,'') = '' then
    raise exception 'a rejection reason is required';
  end if;

  update public.distributor_registrations
     set status = 'rejected',
         rejection_reason = reason,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = reg_id
   returning * into v_rec;

  if v_rec.id is null then
    raise exception 'distributor registration not found';
  end if;

  perform public.notify_roles(
    array['admin'],
    'distributor_rejected',
    'Distributor rejected',
    v_rec.distributor_name || ' (' || v_rec.application_id || ') was rejected.',
    '/admin/users',
    'distributor_registration', v_rec.id::text
  );

  return jsonb_build_object('id', v_rec.id, 'status', 'rejected');
end;
$function$;

grant execute on function public.reject_distributor_registration(uuid, text) to authenticated;
