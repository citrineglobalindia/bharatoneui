-- Retailer's AEPS settlement bank: shown on file, changeable via an
-- accountant-approved request. On approval the agent's settlement bank updates.
-- Applied to prod via the Supabase MCP.

alter table public.aeps_agents add column if not exists settlement_holder text;

create table if not exists public.aeps_bank_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account text not null,
  ifsc text not null,
  holder text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected')),
  remarks text,
  requested_at timestamptz not null default now(),
  processed_by uuid references auth.users(id),
  processed_at timestamptz
);
create index if not exists aeps_bankchg_status_idx on public.aeps_bank_change_requests(status, requested_at desc);
create unique index if not exists aeps_bankchg_one_pending on public.aeps_bank_change_requests(user_id) where status='requested';

alter table public.aeps_bank_change_requests enable row level security;
drop policy if exists "own bank change read" on public.aeps_bank_change_requests;
create policy "own bank change read" on public.aeps_bank_change_requests for select to authenticated
  using (auth.uid() = user_id or public.is_aeps_staff());
drop policy if exists "own bank change insert" on public.aeps_bank_change_requests;
create policy "own bank change insert" on public.aeps_bank_change_requests for insert to authenticated
  with check (auth.uid() = user_id and status = 'requested');

create or replace function public.aeps_my_bank()
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_acc text; v_ifsc text; v_holder text; v_pending json;
begin
  select settlement_account, settlement_ifsc, settlement_holder into v_acc, v_ifsc, v_holder
    from public.aeps_agents where user_id = v_uid;
  select coalesce(v_holder, bank_holder_name, trim(coalesce(first_name,'')||' '||coalesce(surname,''))),
         coalesce(v_acc, account_number), coalesce(v_ifsc, ifsc)
    into v_holder, v_acc, v_ifsc
    from public.retailer_registrations where auth_user_id = v_uid limit 1;
  select json_build_object('account', account, 'ifsc', ifsc, 'holder', holder, 'requested_at', requested_at)
    into v_pending
    from public.aeps_bank_change_requests where user_id = v_uid and status = 'requested'
    order by requested_at desc limit 1;
  return json_build_object('account', v_acc, 'ifsc', v_ifsc, 'holder', v_holder, 'pending', v_pending);
end; $$;
grant execute on function public.aeps_my_bank() to authenticated;

create or replace function public.request_aeps_bank_change(p_account text, p_ifsc text, p_holder text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_account is null or p_account !~ '^[0-9]{6,20}$' then raise exception 'Enter a valid bank account number'; end if;
  if p_ifsc is null or upper(p_ifsc) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'Enter a valid IFSC code'; end if;
  if coalesce(trim(p_holder),'') = '' then raise exception 'Enter the account holder name'; end if;
  if exists (select 1 from public.aeps_bank_change_requests where user_id = v_uid and status = 'requested') then
    raise exception 'You already have a pending bank change request';
  end if;
  insert into public.aeps_bank_change_requests(user_id, account, ifsc, holder)
    values (v_uid, p_account, upper(p_ifsc), trim(p_holder)) returning id into v_id;
  select coalesce(display_name,'Retailer') into v_name from public.profiles where id = v_uid;
  perform public.notify_roles(array['accountant','admin'],'bank_change','AEPS bank change request',
    coalesce(v_name,'Retailer')||' requested a settlement bank change','/accountant/aeps-payouts','bank_change', v_id::text);
  return json_build_object('ok', true, 'id', v_id, 'status', 'requested');
end; $$;
grant execute on function public.request_aeps_bank_change(text,text,text) to authenticated;

create or replace function public.admin_list_aeps_bank_changes(p_status text default null)
returns table(id uuid, user_id uuid, retailer_name text, jsko_id text, mobile text, account text, ifsc text, holder text, status text, remarks text, requested_at timestamptz, processed_at timestamptz)
language sql security definer set search_path to 'public' as $$
  select c.id, c.user_id,
    trim(coalesce(rr.first_name,'')||' '||coalesce(rr.surname,'')), rr.jsko_id, rr.mobile,
    c.account, c.ifsc, c.holder, c.status, c.remarks, c.requested_at, c.processed_at
  from public.aeps_bank_change_requests c
  left join public.retailer_registrations rr on rr.auth_user_id = c.user_id
  where public.is_aeps_staff() and (p_status is null or c.status = p_status)
  order by c.requested_at desc;
$$;
grant execute on function public.admin_list_aeps_bank_changes(text) to authenticated;

create or replace function public.admin_process_aeps_bank_change(p_id uuid, p_action text, p_remarks text default null)
returns json language plpgsql security definer set search_path to 'public' as $$
declare c public.aeps_bank_change_requests; v_new text;
begin
  if not public.is_aeps_staff() then raise exception 'Not permitted'; end if;
  select * into c from public.aeps_bank_change_requests where id = p_id for update;
  if c.id is null or c.status <> 'requested' then raise exception 'Request not found or already processed'; end if;
  if p_action = 'approve' then
    insert into public.aeps_agents(user_id, settlement_account, settlement_ifsc, settlement_holder)
      values (c.user_id, c.account, c.ifsc, c.holder)
      on conflict (user_id) do update set settlement_account = c.account, settlement_ifsc = c.ifsc, settlement_holder = c.holder, updated_at = now();
    v_new := 'approved';
  elsif p_action = 'reject' then
    v_new := 'rejected';
  else
    raise exception 'Unknown action';
  end if;
  update public.aeps_bank_change_requests set status = v_new, remarks = coalesce(p_remarks, remarks), processed_by = auth.uid(), processed_at = now() where id = p_id;
  insert into public.notifications(user_id, type, title, body, link, entity_type, entity_id)
    values (c.user_id, 'bank_change',
      case when v_new='approved' then 'Bank account updated' else 'Bank change rejected' end,
      case when v_new='approved' then 'Your AEPS settlement bank was updated.' else 'Your bank change request was not approved.' end,
      '/aeps', 'bank_change', c.id::text);
  return json_build_object('ok', true, 'status', v_new);
end; $$;
grant execute on function public.admin_process_aeps_bank_change(uuid,text,text) to authenticated;

-- Payout uses the approved settlement holder when present.
create or replace function public.request_aeps_payout(p_amount numeric)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid(); v_avail numeric;
  v_acc text; v_ifsc text; v_holder text; v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid amount'; end if;
  select (aeps_wallet_summary()->>'available')::numeric into v_avail;
  if p_amount > v_avail then raise exception 'Amount exceeds your available balance (₹%).', v_avail; end if;

  select settlement_account, settlement_ifsc, settlement_holder into v_acc, v_ifsc, v_holder
    from public.aeps_agents where user_id = v_uid;
  select coalesce(v_holder, bank_holder_name, trim(coalesce(first_name,'')||' '||coalesce(surname,''))),
         coalesce(v_acc, account_number), coalesce(v_ifsc, ifsc)
    into v_holder, v_acc, v_ifsc
    from public.retailer_registrations where auth_user_id = v_uid limit 1;

  insert into public.aeps_payouts (agent_id, amount, bank_account, ifsc, account_holder)
  values (v_uid, p_amount, v_acc, v_ifsc, v_holder)
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'amount', p_amount, 'status', 'requested');
end; $$;
