-- Distributor self-registration: table + public submission RPC.
-- Mirrors the retailer_registrations pattern but with distributor-specific fields
-- (GST / proprietor / company, no shop/Aadhaar/video-KYC/payment columns).

create sequence if not exists public.distributor_app_seq start 1;

create table if not exists public.distributor_registrations (
  id                uuid primary key default gen_random_uuid(),
  application_id    text not null,
  transaction_id    text,
  status            text not null default 'under_review',
  -- entity
  distributor_name  text not null,
  proprietor_name   text,
  company_name      text,
  gst_number        text,
  dob               date,
  gender            text,
  -- contact
  mobile            text not null,
  alt_mobile        text,
  email             text not null,
  -- identity & bank
  pan_number        text,
  ifsc              text,
  bank_name         text,
  account_number    text,
  -- address
  address_line      text,
  state             text,
  district          text,
  group_name        text,
  -- docs & auth
  form_doc_path     text,
  password_hash     text,
  -- account provisioned on approval
  username          text,
  auth_user_id      uuid,
  -- review trail
  reviewed_by       uuid,
  reviewed_at       timestamptz,
  review_notes      text,
  rejection_reason  text,
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists distributor_registrations_application_id_key
  on public.distributor_registrations (application_id);

-- keep updated_at fresh (search_path pinned per linter 0011)
create or replace function public.tg_distributor_registrations_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_distributor_registrations_updated_at on public.distributor_registrations;
create trigger trg_distributor_registrations_updated_at
  before update on public.distributor_registrations
  for each row execute function public.tg_distributor_registrations_updated_at();

-- RLS: staff read, admin update; the public insert goes through the SECURITY DEFINER RPC below.
alter table public.distributor_registrations enable row level security;

drop policy if exists dr_staff_view on public.distributor_registrations;
create policy dr_staff_view on public.distributor_registrations
  for select using (
    private.is_admin(auth.uid())
    or has_role(auth.uid(), 'accountant'::app_role)
    or has_role(auth.uid(), 'qc'::app_role)
  );

drop policy if exists dr_admin_update on public.distributor_registrations;
create policy dr_admin_update on public.distributor_registrations
  for update using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

drop policy if exists dr_owner_sel on public.distributor_registrations;
create policy dr_owner_sel on public.distributor_registrations
  for select using (auth_user_id = auth.uid());

-- Public submission RPC (SECURITY DEFINER so anon can insert).
create or replace function public.submit_distributor_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_app_id text;
  v_txn_id text;
  v_pwd    text;
  v_hash   text;
  v_id     uuid;
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
    form_doc_path, password_hash
  ) values (
    v_app_id, v_txn_id, 'under_review',
    payload->>'distributor_name',
    nullif(payload->>'proprietor_name',''),
    nullif(payload->>'company_name',''),
    nullif(payload->>'gst_number',''),
    nullif(payload->>'dob','')::date,
    nullif(payload->>'gender',''),
    payload->>'mobile',
    nullif(payload->>'alt_mobile',''),
    payload->>'email',
    nullif(payload->>'pan_number',''),
    nullif(payload->>'ifsc',''),
    nullif(payload->>'bank_name',''),
    nullif(payload->>'account_number',''),
    nullif(payload->>'address_line',''),
    nullif(payload->>'state',''),
    nullif(payload->>'district',''),
    nullif(payload->>'group_name',''),
    nullif(payload->>'form_doc_path',''),
    v_hash
  )
  returning id into v_id;

  perform public.notify_roles(
    array['admin','accountant'],
    'new_distributor_registration',
    'New distributor registration',
    (payload->>'distributor_name') || ' (' || v_app_id || ') submitted a distributor registration awaiting verification.',
    '/admin/users',
    'distributor_registration', v_id::text
  );

  return jsonb_build_object(
    'id', v_id, 'application_id', v_app_id,
    'transaction_id', v_txn_id, 'status', 'under_review'
  );
end;
$function$;

grant execute on function public.submit_distributor_registration(jsonb) to anon, authenticated;
