-- Standalone accountant-driven retailer wallet recharge with a generated Wallet Recharge ID.
create table if not exists public.wallet_recharges (
  id uuid primary key default gen_random_uuid(),
  wallet_recharge_id text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null default 'manual',
  note text,
  source text not null default 'accountant',
  razorpay_payment_id uuid references public.razorpay_payments(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists wallet_recharges_user_idx on public.wallet_recharges(user_id);
create index if not exists wallet_recharges_created_idx on public.wallet_recharges(created_at desc);

alter table public.wallet_recharges enable row level security;

drop policy if exists wallet_recharges_read on public.wallet_recharges;
create policy wallet_recharges_read on public.wallet_recharges
  for select using (
    user_id = auth.uid()
    or private.is_admin(auth.uid())
    or public.has_role(auth.uid(), 'accountant')
  );

create or replace function public.accountant_recharge_wallet(
  p_user uuid, p_amount numeric, p_note text default null, p_method text default 'manual'
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_wr text; v_bal numeric; v_name text; v_id uuid;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can recharge wallets';
  end if;
  if p_user is null then raise exception 'Select a retailer'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid amount'; end if;

  v_wr := 'WR' || lpad(nextval('public.wallet_recharge_seq')::text, 6, '0');

  -- Deduct from the company/main account, then credit the retailer wallet.
  perform public._company_move('debit', p_amount, 'Wallet recharge ' || v_wr, 'wallet_recharge', null);
  v_bal := public._wallet_move(p_user, 'credit', p_amount,
    'Wallet recharge ' || v_wr || coalesce(' — ' || p_note, ''), 'wallet_recharge', null);

  insert into public.wallet_recharges (wallet_recharge_id, user_id, amount, method, note, source, created_by)
    values (v_wr, p_user, p_amount, coalesce(nullif(p_method,''),'manual'), p_note, 'accountant', auth.uid())
    returning id into v_id;

  select display_name into v_name from public.profiles where id = p_user;

  -- reflect to the retailer
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (p_user, 'wallet', 'Wallet recharged',
    'Your wallet has been recharged with ₹' || p_amount::text || '. Reference ' || v_wr || '. New balance ₹' || v_bal::text || '.',
    '/wallet', 'wallet_recharge', v_id::text);

  -- reflect to admins
  perform public.notify_roles(array['admin'], 'wallet_recharge', 'Wallet recharge confirmed',
    coalesce(v_name,'Retailer') || ' recharged ₹' || p_amount::text || ' (' || v_wr || ').',
    '/admin', 'wallet_recharge', v_id::text);

  return jsonb_build_object('wallet_recharge_id', v_wr, 'balance', v_bal, 'id', v_id);
end $function$;
