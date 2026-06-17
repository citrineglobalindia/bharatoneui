create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0, updated_at timestamptz not null default now());
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12,2) not null, balance_after numeric(12,2) not null,
  reason text, ref_type text, ref_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists wallet_tx_user_idx on public.wallet_transactions(user_id, created_at desc);
create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null, method text, reference text, note text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null, verified_at timestamptz);
create index if not exists wallet_topups_status_idx on public.wallet_topups(status, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_topups enable row level security;
drop policy if exists w_sel on public.wallets;
create policy w_sel on public.wallets for select to authenticated using (user_id=auth.uid() or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));
drop policy if exists wt_sel on public.wallet_transactions;
create policy wt_sel on public.wallet_transactions for select to authenticated using (user_id=auth.uid() or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));
drop policy if exists tp_sel on public.wallet_topups;
create policy tp_sel on public.wallet_topups for select to authenticated using (user_id=auth.uid() or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));
drop policy if exists tp_ins on public.wallet_topups;
create policy tp_ins on public.wallet_topups for insert to authenticated with check (user_id=auth.uid());

create or replace function public._wallet_move(p_user uuid, p_dir text, p_amount numeric, p_reason text, p_ref_type text, p_ref_id uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_bal numeric;
begin
  insert into public.wallets(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  select balance into v_bal from public.wallets where user_id=p_user for update;
  if p_dir='debit' then
    if v_bal < p_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
    v_bal := v_bal - p_amount;
  else v_bal := v_bal + p_amount; end if;
  update public.wallets set balance=v_bal, updated_at=now() where user_id=p_user;
  insert into public.wallet_transactions(user_id,direction,amount,balance_after,reason,ref_type,ref_id,created_by)
    values (p_user,p_dir,p_amount,v_bal,p_reason,p_ref_type,p_ref_id,auth.uid());
  return v_bal;
end $$;

create or replace function public.request_wallet_topup(p_amount numeric, p_method text, p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  insert into public.wallet_topups(user_id, amount, method, reference) values (auth.uid(), p_amount, p_method, p_reference) returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;
grant execute on function public.request_wallet_topup(numeric,text,text) to authenticated;

create or replace function public.verify_wallet_topup(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.wallet_topups; v_bal numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  select * into t from public.wallet_topups where id=p_id for update;
  if not found then raise exception 'Top-up not found'; end if;
  if t.status <> 'pending' then return jsonb_build_object('ok', false, 'status', t.status); end if;
  if p_approve then
    v_bal := public._wallet_move(t.user_id, 'credit', t.amount, 'Wallet top-up'|| coalesce(' ('||t.method||')',''), 'topup', t.id);
    update public.wallet_topups set status='verified', verified_by=auth.uid(), verified_at=now() where id=p_id;
    return jsonb_build_object('ok', true, 'status', 'verified', 'balance', v_bal);
  else
    update public.wallet_topups set status='rejected', verified_by=auth.uid(), verified_at=now() where id=p_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
end $$;
grant execute on function public.verify_wallet_topup(uuid, boolean) to authenticated;

create or replace function public.accountant_topup_wallet(p_user uuid, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_bal numeric; v_id uuid;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  v_bal := public._wallet_move(p_user, 'credit', p_amount, 'Top-up by staff'|| coalesce(': '||p_note,''), 'manual', null);
  insert into public.wallet_topups(user_id, amount, method, note, status, verified_by, verified_at)
    values (p_user, p_amount, 'Staff top-up', p_note, 'verified', auth.uid(), now()) returning id into v_id;
  return jsonb_build_object('ok', true, 'balance', v_bal, 'id', v_id);
end $$;
grant execute on function public.accountant_topup_wallet(uuid, numeric, text) to authenticated;
create or replace function public.submit_service_application(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_name text; v_comm numeric(12,2); v_bal numeric;
begin
  select * into v_svc from public.services where id = (payload->>'service_id')::uuid and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  -- wallet check
  if coalesce(v_svc.service_charge,0) > 0 then
    if coalesce((select balance from public.wallets where user_id=auth.uid()),0) < v_svc.service_charge then
      raise exception 'INSUFFICIENT_FUNDS';
    end if;
  end if;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email) into v_name from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    payload->>'full_name', payload->>'father_name', payload->>'gender', payload->>'email',
    payload->>'phone', payload->>'address', payload->>'aadhaar_number', payload->>'pan_number',
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_name, v_cat.operator_id
  ) returning id into v_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    perform public._wallet_move(auth.uid(), 'debit', v_svc.service_charge, 'Application '||v_no||' - '||v_svc.name, 'application', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted', 'commission_price', v_comm);
end $$;
grant execute on function public.submit_service_application(jsonb) to authenticated;

create or replace function public.submit_backend_application(p_service_id uuid, p_form jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_svc public.services; v_cat public.service_categories;
  v_no text; v_id uuid; v_rname text; v_comm numeric(12,2);
  k text; v text; lk text;
  v_full text; v_phone text; v_addr text; v_aadhaar text; v_email text; v_pan text; v_father text; v_gender text;
begin
  select * into v_svc from public.services where id = p_service_id and is_active;
  if not found then raise exception 'Invalid or inactive service'; end if;
  select * into v_cat from public.service_categories where id = v_svc.category_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    if coalesce((select balance from public.wallets where user_id=auth.uid()),0) < v_svc.service_charge then
      raise exception 'INSUFFICIENT_FUNDS';
    end if;
  end if;
  v_no := 'APP' || lpad(nextval('public.service_app_seq')::text, 7, '0');
  select coalesce(p.display_name, u.email) into v_rname from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
  v_comm := round(coalesce(v_svc.service_charge,0) * coalesce(v_svc.retailer_commission,0) / 100.0, 2);
  for k, v in select key, value from jsonb_each_text(coalesce(p_form,'{}'::jsonb)) loop
    lk := lower(k);
    if v is null or left(v,1) = '{' then continue; end if;
    if v_father is null and lk like '%father%' then v_father := v;
    elsif v_full is null and lk like '%name%' then v_full := v; end if;
    if v_phone is null and (lk like '%phone%' or lk like '%mobile%') then v_phone := v; end if;
    if v_addr is null and lk like '%address%' then v_addr := v; end if;
    if v_aadhaar is null and (lk like '%aadhaar%' or lk like '%aadhar%') then v_aadhaar := v; end if;
    if v_email is null and lk like '%email%' then v_email := v; end if;
    if v_pan is null and lk like '%pan%' then v_pan := v; end if;
    if v_gender is null and lk like '%gender%' then v_gender := v; end if;
  end loop;
  insert into public.service_applications (
    application_no, category_id, service_id, category_name, service_name,
    full_name, father_name, gender, email, phone, address, aadhaar_number, pan_number,
    service_charge, commission_price, status, submitted_by, submitter_name, assigned_operator, form_data
  ) values (
    v_no, v_svc.category_id, v_svc.id, coalesce(v_cat.name, v_svc.category), v_svc.name,
    coalesce(v_full, v_rname), v_father, v_gender, v_email, v_phone, v_addr, v_aadhaar, v_pan,
    v_svc.service_charge, v_comm, 'submitted', auth.uid(), v_rname, v_cat.operator_id, p_form
  ) returning id into v_id;
  if coalesce(v_svc.service_charge,0) > 0 then
    perform public._wallet_move(auth.uid(), 'debit', v_svc.service_charge, 'Application '||v_no||' - '||v_svc.name, 'application', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'application_no', v_no, 'status', 'submitted');
end $$;
grant execute on function public.submit_backend_application(uuid, jsonb) to authenticated;
