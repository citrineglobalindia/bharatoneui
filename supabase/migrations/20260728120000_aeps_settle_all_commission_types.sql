-- Settle commission for ANY successful AEPS transaction that Eko paid a commission
-- on (cash withdrawal, mini statement, balance enquiry, ...) instead of only
-- service_type in (2,5). Mini statement (service_type 4) pays ~Rs 1 and was being
-- dropped. Principal is still credited only for cash withdrawals (service_type 2).
-- Plus an idempotent auto-settle trigger so commission is never missed again.
-- Applied to prod via the MCP; existing unsettled successful txns were backfilled.
create or replace function public.settle_aeps_commission(p_txn_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  t public.aeps_transactions;
  v_comm numeric; v_tds numeric; v_fee numeric; v_net numeric;
  v_mpct numeric; v_dpct numeric;
  v_merchant numeric; v_dist numeric; v_admin numeric;
  v_distributor uuid;
begin
  select * into t from public.aeps_transactions where id = p_txn_id for update;
  if t.id is null then raise exception 'AEPS_TXN_NOT_FOUND'; end if;
  if t.status <> 'success' or t.commission_settled or t.agent_id is null then
    return jsonb_build_object('settled', false, 'reason', 'not eligible');
  end if;

  if t.service_type = 2 and coalesce(t.amount,0) > 0 then
    perform public._aeps_wallet_move(t.agent_id, 'credit', t.amount,
      'AEPS cash deposit — Rs ' || t.amount::text, 'aeps_principal', t.id);
  end if;

  v_comm := nullif(t.response->'data'->>'commission', '')::numeric;
  v_tds  := coalesce(nullif(t.response->'data'->>'tds', '')::numeric, 0);
  v_fee  := coalesce(nullif(t.response->'data'->>'totalfee', '')::numeric, 0);
  if coalesce(v_comm, 0) <= 0 then
    update public.aeps_transactions
       set commission_settled = true, eko_commission = coalesce(v_comm, 0),
           eko_tds = v_tds, eko_total_fee = v_fee, updated_at = now()
     where id = t.id;
    return jsonb_build_object('settled', true, 'reason', 'no commission on this operation');
  end if;

  v_net := round(v_comm - v_tds, 2);
  v_mpct := coalesce(nullif((select value from public.app_settings where key = 'aeps_merchant_share_percent'), '')::numeric, 70);
  v_dpct := coalesce(nullif((select value from public.app_settings where key = 'aeps_distributor_share_percent'), '')::numeric, 0);
  v_distributor := public.aeps_resolve_distributor(t.agent_id);
  v_merchant := round(v_net * v_mpct / 100.0, 2);
  v_dist     := case when v_distributor is null then 0 else round(v_net * v_dpct / 100.0, 2) end;
  v_admin    := round(v_net - v_merchant - v_dist, 2);
  update public.aeps_transactions set
    eko_commission = v_comm, eko_tds = v_tds, eko_total_fee = v_fee,
    merchant_commission = v_merchant, admin_commission = v_admin,
    commission_gross = v_comm, commission = v_merchant,
    commission_distributor = v_dist, commission_company = v_admin,
    distributor_id = v_distributor, commission_settled = true, updated_at = now()
  where id = t.id;
  if v_merchant > 0 then
    perform public._aeps_wallet_move(t.agent_id, 'credit', v_merchant,
      'AEPS commission — ' || replace(t.operation, '_', ' ') || case when t.service_type=2 then ' Rs ' || t.amount::text else '' end,
      'aeps_transaction', t.id);
  end if;
  if v_distributor is not null and v_dist > 0 then
    perform public._aeps_wallet_move(v_distributor, 'credit', v_dist,
      'AEPS distributor commission — ' || replace(t.operation, '_', ' '),
      'aeps_transaction', t.id);
  end if;
  return jsonb_build_object('settled', true, 'principal', case when t.service_type=2 then t.amount else 0 end,
    'merchant', v_merchant, 'distributor', v_dist, 'admin', v_admin);
end $function$;

create or replace function public._tg_aeps_autosettle()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if NEW.status = 'success' and coalesce(NEW.commission_settled,false) = false and NEW.agent_id is not null then
    perform public.settle_aeps_commission(NEW.id);
  end if;
  return null;
end $$;

drop trigger if exists trg_aeps_autosettle on public.aeps_transactions;
create trigger trg_aeps_autosettle after insert or update on public.aeps_transactions
  for each row execute function public._tg_aeps_autosettle();

-- Backfill any already-successful, unsettled transactions.
do $$
declare r record;
begin
  for r in select id from public.aeps_transactions
           where status='success' and coalesce(commission_settled,false)=false and agent_id is not null
  loop
    perform public.settle_aeps_commission(r.id);
  end loop;
end $$;
