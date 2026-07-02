-- Razorpay hold-and-release: payments are marked 'paid' (received) on signature verify,
-- then an accountant cross-checks in the Razorpay dashboard and confirms, which generates
-- a Wallet Recharge ID (WRxxxxxx) and credits the retailer's wallet.

alter table public.razorpay_payments
  add column if not exists wallet_recharge_id text,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists verified_at timestamptz,
  add column if not exists credited boolean not null default false;

-- Allow the 'credited' status.
alter table public.razorpay_payments drop constraint if exists razorpay_payments_status_check;
alter table public.razorpay_payments
  add constraint razorpay_payments_status_check
  check (status in ('created','paid','credited','failed','not_configured'));

create sequence if not exists public.wallet_recharge_seq start 1;

create or replace function public.accountant_confirm_razorpay(p_payment uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r public.razorpay_payments; v_wr text; v_bal numeric; v_name text;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Only accountant or admin can confirm payments';
  end if;
  select * into r from public.razorpay_payments where id = p_payment for update;
  if r.id is null then raise exception 'Payment not found'; end if;
  if r.credited then
    return jsonb_build_object('wallet_recharge_id', r.wallet_recharge_id, 'already', true);
  end if;
  if r.status <> 'paid' or r.purpose <> 'wallet_topup' or r.user_id is null then
    raise exception 'This payment cannot be credited (must be a received wallet top-up).';
  end if;

  v_wr := 'WR' || lpad(nextval('public.wallet_recharge_seq')::text, 6, '0');
  v_bal := public._wallet_move(r.user_id, 'credit', r.amount,
    'Wallet recharge ' || v_wr || ' (Razorpay ' || coalesce(r.payment_id,'') || ')',
    'razorpay_payment', r.id);

  update public.razorpay_payments
    set status = 'credited', credited = true, wallet_recharge_id = v_wr,
        verified_by = auth.uid(), verified_at = now()
  where id = r.id;

  select display_name into v_name from public.profiles where id = r.user_id;

  -- reflect to the retailer
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'approved', 'Wallet recharged',
    'Your wallet has been recharged with ₹' || r.amount::text || '. Reference ' || v_wr || '.',
    '/wallet', 'razorpay_payment', r.id::text);

  -- reflect to admins
  perform public.notify_roles(array['admin'], 'wallet_recharge', 'Wallet recharge confirmed',
    coalesce(v_name,'Retailer') || ' recharged ₹' || r.amount::text || ' (' || v_wr || ') via Razorpay.',
    '/admin', 'razorpay_payment', r.id::text);

  return jsonb_build_object('wallet_recharge_id', v_wr, 'balance', v_bal);
end $function$;
