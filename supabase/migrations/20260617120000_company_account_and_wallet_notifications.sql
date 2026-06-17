-- Company main account (the float accountants disburse from)
create table if not exists public.company_account (
  id int primary key default 1, balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(), constraint company_single check (id=1));
insert into public.company_account(id, balance) values (1,0) on conflict (id) do nothing;
create table if not exists public.company_ledger (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12,2) not null, balance_after numeric(12,2) not null,
  reason text, ref_type text, ref_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now());
alter table public.company_account enable row level security;
alter table public.company_ledger enable row level security;
drop policy if exists ca_sel on public.company_account;
create policy ca_sel on public.company_account for select to authenticated using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));
drop policy if exists cl_sel on public.company_ledger;
create policy cl_sel on public.company_ledger for select to authenticated using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant'));

create or replace function public._company_move(p_dir text, p_amount numeric, p_reason text, p_ref_type text, p_ref_id uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_bal numeric;
begin
  select balance into v_bal from public.company_account where id=1 for update;
  if p_dir='debit' then
    if v_bal < p_amount then raise exception 'INSUFFICIENT_MAIN_BALANCE'; end if;
    v_bal := v_bal - p_amount;
  else v_bal := v_bal + p_amount; end if;
  update public.company_account set balance=v_bal, updated_at=now() where id=1;
  insert into public.company_ledger(direction,amount,balance_after,reason,ref_type,ref_id,created_by)
    values (p_dir,p_amount,v_bal,p_reason,p_ref_type,p_ref_id,auth.uid());
  return v_bal;
end $$;

create or replace function public.recharge_company_account(p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_bal numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Invalid amount'; end if;
  v_bal := public._company_move('credit', p_amount, 'Main account recharge'||coalesce(': '||p_note,''), 'recharge', null);
  return jsonb_build_object('ok', true, 'balance', v_bal);
end $$;
grant execute on function public.recharge_company_account(numeric,text) to authenticated;

create or replace function public.company_balance()
returns numeric language sql security definer set search_path=public as $$ select coalesce(balance,0) from public.company_account where id=1 $$;
grant execute on function public.company_balance() to authenticated;

-- Notify accountants + admins when a retailer requests a top-up
create or replace function public.request_wallet_topup(p_amount numeric, p_method text, p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  insert into public.wallet_topups(user_id, amount, method, reference) values (auth.uid(), p_amount, p_method, p_reference) returning id into v_id;
  select coalesce(display_name, 'Retailer') into v_name from public.profiles where id=auth.uid();
  perform public.notify_roles(array['accountant','admin'], 'wallet', 'New wallet top-up request',
    coalesce(v_name,'Retailer')||' requested '||to_char(p_amount,'FM999999990')||' via '||coalesce(p_method,'-'),
    '/accountant/wallet-requests', 'topup', v_id::text);
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;
grant execute on function public.request_wallet_topup(numeric,text,text) to authenticated;

-- Approve: debit company main account, credit retailer, notify retailer
create or replace function public.verify_wallet_topup(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.wallet_topups; v_bal numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  select * into t from public.wallet_topups where id=p_id for update;
  if not found then raise exception 'Top-up not found'; end if;
  if t.status <> 'pending' then return jsonb_build_object('ok', false, 'status', t.status); end if;
  if p_approve then
    perform public._company_move('debit', t.amount, 'Retailer wallet top-up', 'topup', t.id);
    v_bal := public._wallet_move(t.user_id, 'credit', t.amount, 'Wallet top-up'|| coalesce(' ('||t.method||')',''), 'topup', t.id);
    update public.wallet_topups set status='verified', verified_by=auth.uid(), verified_at=now() where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (t.user_id,'wallet','Wallet top-up approved','Your top-up of '||to_char(t.amount,'FM999999990')||' has been verified and credited. New balance: '||to_char(v_bal,'FM999999990')||'.','/wallet','topup',t.id::text);
    return jsonb_build_object('ok', true, 'status', 'verified', 'balance', v_bal);
  else
    update public.wallet_topups set status='rejected', verified_by=auth.uid(), verified_at=now() where id=p_id;
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (t.user_id,'wallet','Wallet top-up rejected','Your top-up request of '||to_char(t.amount,'FM999999990')||' was not approved. Please contact support.','/wallet','topup',t.id::text);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
end $$;
grant execute on function public.verify_wallet_topup(uuid, boolean) to authenticated;

-- Direct top-up: debit company main account, credit retailer, notify retailer
create or replace function public.accountant_topup_wallet(p_user uuid, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_bal numeric; v_id uuid;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  perform public._company_move('debit', p_amount, 'Direct retailer top-up', 'manual', null);
  v_bal := public._wallet_move(p_user, 'credit', p_amount, 'Top-up by staff'|| coalesce(': '||p_note,''), 'manual', null);
  insert into public.wallet_topups(user_id, amount, method, note, status, verified_by, verified_at)
    values (p_user, p_amount, 'Staff top-up', p_note, 'verified', auth.uid(), now()) returning id into v_id;
  insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
    values (p_user,'wallet','Wallet credited','Your wallet was topped up with '||to_char(p_amount,'FM999999990')||' by our team. New balance: '||to_char(v_bal,'FM999999990')||'.','/wallet','topup',v_id::text);
  return jsonb_build_object('ok', true, 'balance', v_bal, 'id', v_id);
end $$;
grant execute on function public.accountant_topup_wallet(uuid, numeric, text) to authenticated;
