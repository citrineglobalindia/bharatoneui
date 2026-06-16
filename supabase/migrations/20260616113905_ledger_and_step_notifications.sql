-- ============================================================
-- Phase Two add-ons: ledger + step notifications to admin
-- ============================================================

-- ---------- Ledger ----------
create table if not exists public.ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  entry_type      text not null default 'registration_fee',
  registration_id uuid references public.retailer_registrations(id) on delete set null,
  application_id  text,
  retailer_name   text,
  amount          integer not null default 0,
  direction       text not null default 'credit' check (direction in ('credit','debit')),
  utr             text,
  payment_method  text,
  recorded_by     uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index if not exists ledger_entries_created_idx on public.ledger_entries (created_at desc);
alter table public.ledger_entries enable row level security;
drop policy if exists "Staff can view ledger" on public.ledger_entries;
create policy "Staff can view ledger" on public.ledger_entries
  for select to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc'));
grant select on public.ledger_entries to authenticated;
grant all on public.ledger_entries to service_role;

-- ---------- Accountant payment verify -> notify admin ----------
create or replace function public.verify_retailer_payment(reg_id uuid, received boolean, notes text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can verify payment';
  end if;
  update public.retailer_registrations
    set payment_verified = received, payment_verified_by = auth.uid(),
        payment_verified_at = now(), payment_verification_notes = notes
  where id = reg_id returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;

  perform public.notify_roles(array['admin'],
    'payment_' || (case when received then 'verified' else 'flagged' end),
    (case when received then 'Payment verified by accountant' else 'Payment flagged by accountant' end),
    'Accountant ' || (case when received then 'confirmed payment for ' else 'flagged payment for ' end)
      || r.first_name || ' ' || r.surname || ' (' || r.application_id || ').',
    '/admin/registrations','retailer_registration', reg_id::text);

  if r.payment_verified and r.qc_verified and r.status = 'under_review' then
    update public.retailer_registrations set status = 'verified' where id = reg_id;
    perform public.notify_roles(array['admin'],'ready_for_approval','Ready for approval',
      r.first_name||' '||r.surname||' ('||r.application_id||') passed payment + QC checks.',
      '/admin/registrations','retailer_registration', reg_id::text);
  end if;
  return jsonb_build_object('id', reg_id, 'payment_verified', received);
end;
$$;

-- ---------- QC verify -> notify admin ----------
create or replace function public.verify_retailer_qc(reg_id uuid, verified boolean, notes text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare r public.retailer_registrations;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')) then
    raise exception 'Only QC or admin can verify retailer';
  end if;
  update public.retailer_registrations
    set qc_verified = verified, qc_verified_by = auth.uid(),
        qc_verified_at = now(), qc_notes = notes
  where id = reg_id returning * into r;
  if r.id is null then raise exception 'Registration not found'; end if;

  perform public.notify_roles(array['admin'],
    'qc_' || (case when verified then 'verified' else 'flagged' end),
    (case when verified then 'QC verified by reviewer' else 'QC flagged by reviewer' end),
    'QC ' || (case when verified then 'verified ' else 'flagged ' end)
      || r.first_name || ' ' || r.surname || ' (' || r.application_id || ').',
    '/admin/registrations','retailer_registration', reg_id::text);

  if r.payment_verified and r.qc_verified and r.status = 'under_review' then
    update public.retailer_registrations set status = 'verified' where id = reg_id;
    perform public.notify_roles(array['admin'],'ready_for_approval','Ready for approval',
      r.first_name||' '||r.surname||' ('||r.application_id||') passed payment + QC checks.',
      '/admin/registrations','retailer_registration', reg_id::text);
  end if;
  return jsonb_build_object('id', reg_id, 'qc_verified', verified);
end;
$$;
create or replace function public.approve_retailer_registration(reg_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','extensions'
as $function$
declare
  r        public.retailer_registrations;
  v_user   text; v_pass text; v_uid uuid; v_email text; v_name text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only administrators can approve registrations'; end if;
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

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', v_name, 'department', 'Retailer','designation','Retailer','role','retailer','employee_code', v_user),
    false, false, '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  update public.retailer_registrations
    set status = 'approved', username = v_user, auth_user_id = v_uid,
        approved_by = auth.uid(), approved_at = now(), reviewed_by = auth.uid(), reviewed_at = now()
  where id = reg_id;

  -- Ledger entry for the registration fee
  insert into public.ledger_entries (entry_type, registration_id, application_id, retailer_name, amount, direction, utr, payment_method, recorded_by)
  values ('registration_fee', reg_id, r.application_id, v_name, coalesce(r.payment_amount,0), 'credit', r.payment_utr, r.payment_method, auth.uid());

  perform public.notify_roles(array['admin','accountant','qc'],'approved','Retailer approved',
    v_name||' ('||r.application_id||') approved. ID '||v_user||'.',
    '/admin/registrations','retailer_registration', reg_id::text);

  return jsonb_build_object('id', reg_id, 'status','approved','username', v_user, 'email', v_email, 'password', v_pass);
end;
$function$;
