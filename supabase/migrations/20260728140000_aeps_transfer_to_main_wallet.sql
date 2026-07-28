-- Retailer moves their AEPS wallet balance into their main wallet for in-app use.
-- Debits the AEPS wallet and credits the main wallet in one atomic operation, so
-- both ledgers (AEPS history + main wallet transactions) show the movement.
-- Applied to prod via the MCP.
create or replace function public.aeps_transfer_to_main(p_amount numeric)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_avail numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid amount'; end if;

  select (public.aeps_wallet_summary()->>'available')::numeric into v_avail;
  if p_amount > coalesce(v_avail,0) then
    raise exception 'Amount exceeds your available AEPS balance (Rs %).', coalesce(v_avail,0);
  end if;

  perform public._aeps_wallet_move(v_uid, 'debit', p_amount,
    'Transfer to main wallet', 'aeps_to_main', null);
  perform public._wallet_move(v_uid, 'credit', p_amount,
    'Transfer from AEPS wallet', 'aeps_transfer', null);

  return json_build_object('ok', true, 'amount', p_amount);
end $$;
grant execute on function public.aeps_transfer_to_main(numeric) to authenticated;
