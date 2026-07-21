-- Razorpay gateway fees are NOT passed on to the wallet: the wallet is credited
-- only with the net amount actually received (gross - Razorpay fee incl. GST).
-- fee/net_amount are captured by the razorpay-verify edge function from the
-- Razorpay payments API at verification time.
-- Applied via Supabase MCP on 2026-07-21; kept here for traceability.
alter table public.razorpay_payments add column if not exists fee numeric;
alter table public.razorpay_payments add column if not exists net_amount numeric;

create or replace function public.accountant_confirm_razorpay(p_payment uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare r public.razorpay_payments; v_wr text; v_bal numeric; v_name text; v_credit numeric;
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

  -- Credit only what was actually received after Razorpay's fee.
  v_credit := coalesce(r.net_amount, r.amount);

  v_wr := 'WR' || lpad(nextval('public.wallet_recharge_seq')::text, 6, '0');
  v_bal := public._wallet_move(r.user_id, 'credit', v_credit,
    'Wallet recharge ' || v_wr || ' (Razorpay ' || coalesce(r.payment_id,'')
      || case when r.fee is not null then ', gross ₹' || r.amount::text || ' - fee ₹' || r.fee::text else '' end || ')',
    'razorpay_payment', r.id);

  update public.razorpay_payments
    set status = 'credited', credited = true, wallet_recharge_id = v_wr,
        verified_by = auth.uid(), verified_at = now()
  where id = r.id;

  select display_name into v_name from public.profiles where id = r.user_id;

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'approved', 'Wallet recharged',
    'Your wallet has been recharged with ₹' || v_credit::text
      || case when r.fee is not null then ' (₹' || r.amount::text || ' paid - ₹' || r.fee::text || ' gateway charges)' else '' end
      || '. Reference ' || v_wr || '.',
    '/wallet', 'razorpay_payment', r.id::text);

  perform public.notify_roles(array['admin'], 'wallet_recharge', 'Wallet recharge confirmed',
    coalesce(v_name,'Retailer') || ' recharged ₹' || v_credit::text || ' net (' || v_wr || ') via Razorpay.',
    '/admin', 'razorpay_payment', r.id::text);

  return jsonb_build_object('wallet_recharge_id', v_wr, 'balance', v_bal, 'credited', v_credit, 'fee', r.fee);
end $function$;
