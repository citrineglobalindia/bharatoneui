-- Capture Eko's actual per-transaction commission and split it admin/merchant.
-- Eko returns `commission`, `tds`, `totalfee` in every AePS transaction response;
-- previously these were stored only inside the raw `response` blob and ignored.
-- We now extract them, split the NET (commission - TDS) between the merchant
-- (agent) and admin (company), and credit the merchant's wallet instantly.
--
-- settle_aeps_commission keeps its name, so the `aeps` edge function calls it
-- unchanged — no function redeploy required.

alter table public.aeps_transactions
  add column if not exists eko_commission numeric,
  add column if not exists eko_tds numeric,
  add column if not exists eko_total_fee numeric,
  add column if not exists merchant_commission numeric,
  add column if not exists admin_commission numeric;

-- Split config (% of NET Eko commission). Admin keeps whatever remains.
-- !! REVIEW before real volume — 70/0 is a placeholder split. !!
insert into public.app_settings (key, value) values
  ('aeps_merchant_share_percent', '70'),
  ('aeps_distributor_share_percent', '0')
on conflict (key) do nothing;

create or replace function public.settle_aeps_commission(p_txn_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
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

  -- Commission is only earned on money-moving ops (2 = cash withdrawal, 5 = aadhaar pay).
  if t.service_type not in (2, 5) then
    update public.aeps_transactions set commission_settled = true, updated_at = now() where id = t.id;
    return jsonb_build_object('settled', false, 'reason', 'non-financial operation');
  end if;

  v_comm := nullif(t.response->'data'->>'commission', '')::numeric;
  v_tds  := coalesce(nullif(t.response->'data'->>'tds', '')::numeric, 0);
  v_fee  := coalesce(nullif(t.response->'data'->>'totalfee', '')::numeric, 0);

  if coalesce(v_comm, 0) <= 0 then
    update public.aeps_transactions
       set commission_settled = true, eko_commission = coalesce(v_comm, 0),
           eko_tds = v_tds, eko_total_fee = v_fee, updated_at = now()
     where id = t.id;
    return jsonb_build_object('settled', false, 'reason', 'no commission returned by Eko');
  end if;

  -- Net = what BharatOne actually received (gross commission minus TDS).
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
    perform public._wallet_move(t.agent_id, 'credit', v_merchant,
      'AEPS commission — ' || replace(t.operation, '_', ' ') || ' Rs ' || t.amount::text,
      'aeps_transaction', t.id);
  end if;

  if v_distributor is not null and v_dist > 0 then
    perform public._wallet_move(v_distributor, 'credit', v_dist,
      'AEPS distributor commission — ' || replace(t.operation, '_', ' '),
      'aeps_transaction', t.id);
  end if;

  return jsonb_build_object('settled', true, 'eko_commission', v_comm, 'tds', v_tds,
    'net', v_net, 'merchant', v_merchant, 'distributor', v_dist, 'admin', v_admin);
end $$;

-- Backfill Eko commission on past successful withdrawals (visibility only).
update public.aeps_transactions set
  eko_commission = nullif(response->'data'->>'commission', '')::numeric,
  eko_tds        = coalesce(nullif(response->'data'->>'tds', '')::numeric, 0),
  eko_total_fee  = coalesce(nullif(response->'data'->>'totalfee', '')::numeric, 0)
where status = 'success'
  and response->'data'->>'commission' is not null
  and eko_commission is null;
