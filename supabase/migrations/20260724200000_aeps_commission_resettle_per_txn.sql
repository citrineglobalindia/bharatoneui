-- Fix: commission was only a migrated lump (old-slab amounts), not tied to
-- transactions. Reverse the lump and credit each successful money-moving txn's
-- Eko-based merchant (and distributor) commission per transaction, so it
-- reflects per transaction on the wallet and matches what Eko actually paid.
-- Applied to prod via the Supabase MCP.
do $$
declare
  r record;
  v_merch numeric; v_dist numeric; v_admin numeric; v_net numeric;
  v_mpct numeric; v_dpct numeric; v_distributor uuid;
begin
  v_mpct := coalesce(nullif((select value from public.app_settings where key='aeps_merchant_share_percent'),'')::numeric, 70);
  v_dpct := coalesce(nullif((select value from public.app_settings where key='aeps_distributor_share_percent'),'')::numeric, 0);

  for r in
    select user_id, sum(amount) as amt
    from public.aeps_wallet_transactions
    where ref_type = 'aeps_wallet_migration' and direction = 'credit'
    group by user_id having sum(amount) > 0
  loop
    perform public._aeps_wallet_move(r.user_id, 'debit', r.amt,
      'Reverse migrated commission (re-settled per Eko)', 'aeps_reconcile', null);
  end loop;

  for r in
    select t.id, t.agent_id, t.operation, t.amount,
           coalesce(nullif(t.eko_commission,0),0) as eko, coalesce(t.eko_tds,0) as tds
    from public.aeps_transactions t
    where t.status='success' and t.service_type in (2,5) and coalesce(t.eko_commission,0) > 0
      and not exists (select 1 from public.aeps_wallet_transactions w where w.ref_id=t.id and w.ref_type='aeps_transaction')
  loop
    v_net := round(r.eko - r.tds, 2);
    v_distributor := public.aeps_resolve_distributor(r.agent_id);
    v_merch := round(v_net * v_mpct/100.0, 2);
    v_dist  := case when v_distributor is null then 0 else round(v_net * v_dpct/100.0, 2) end;
    v_admin := round(v_net - v_merch - v_dist, 2);
    update public.aeps_transactions set
      merchant_commission = v_merch, admin_commission = v_admin,
      commission = v_merch, commission_company = v_admin, commission_distributor = v_dist,
      commission_gross = r.eko, distributor_id = v_distributor, updated_at = now()
    where id = r.id;
    if v_merch > 0 then
      perform public._aeps_wallet_move(r.agent_id, 'credit', v_merch,
        'AEPS commission — ' || replace(r.operation,'_',' ') || ' Rs ' || r.amount::text, 'aeps_transaction', r.id);
    end if;
    if v_distributor is not null and v_dist > 0 then
      perform public._aeps_wallet_move(v_distributor, 'credit', v_dist,
        'AEPS distributor commission — ' || replace(r.operation,'_',' '), 'aeps_transaction', r.id);
    end if;
  end loop;
end $$;
