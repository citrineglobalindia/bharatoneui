-- Crediting a confirmed online payment, now that more than one gateway exists.
-- Applied to prod via the MCP.
--
-- The wording was hardcoded to "Razorpay", so an ICICI payment appeared in the wallet
-- ledger and in the retailer's notification as a Razorpay one. That is a bookkeeping
-- error, not a cosmetic one — the ledger is what an accountant reads back months later
-- when reconciling a bank statement.
--
-- Verified end to end: an ICICI UPI top-up credited the FULL amount (Razorpay credits
-- net of its fee; ICICI UPI has no fee, so net_amount is null) and the ledger line
-- read "Wallet recharge WR000007 (ICICI 7700229325431 UPI)".
create or replace function public.accountant_confirm_razorpay(p_payment uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  r public.razorpay_payments;
  v_wr text; v_bal numeric; v_name text; v_credit numeric; v_gw text;
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

  v_gw := case lower(coalesce(r.gateway, 'razorpay')) when 'icici' then 'ICICI' else 'Razorpay' end;
  v_credit := coalesce(r.net_amount, r.amount);

  v_wr := 'WR' || lpad(nextval('public.wallet_recharge_seq')::text, 6, '0');
  v_bal := public._wallet_move(r.user_id, 'credit', v_credit,
    'Wallet recharge ' || v_wr || ' (' || v_gw || ' ' || coalesce(r.payment_id,'')
      || case when r.payment_mode is not null then ' ' || r.payment_mode else '' end
      || case when r.fee is not null
              then ', gross ₹' || r.amount::text || ' - fee ₹' || r.fee::text else '' end || ')',
    'razorpay_payment', r.id);

  update public.razorpay_payments
    set status = 'credited', credited = true, wallet_recharge_id = v_wr,
        verified_by = auth.uid(), verified_at = now()
  where id = r.id;

  select display_name into v_name from public.profiles where id = r.user_id;

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'approved', 'Wallet recharged',
    'Your wallet has been recharged with ₹' || v_credit::text
      || case when r.fee is not null
              then ' (₹' || r.amount::text || ' paid - ₹' || r.fee::text || ' gateway charges)' else '' end
      || '. Reference ' || v_wr || '.',
    '/wallet', 'razorpay_payment', r.id::text);

  perform public.notify_roles(array['admin'], 'wallet_recharge', 'Wallet recharge confirmed',
    coalesce(v_name,'Retailer') || ' recharged ₹' || v_credit::text || ' via ' || v_gw || ' (' || v_wr || ').',
    '/admin', 'razorpay_payment', r.id::text);

  return jsonb_build_object('wallet_recharge_id', v_wr, 'balance', v_bal,
                            'credited', v_credit, 'fee', r.fee, 'gateway', v_gw);
end $fn$;
