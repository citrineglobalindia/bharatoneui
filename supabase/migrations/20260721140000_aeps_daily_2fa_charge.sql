-- AePS daily-2FA charge: admin-configurable, default 0 (inert until set).
-- On a successful daily 2FA the agent's wallet is debited by the configured
-- charge and the company account is credited. Deploying at 0 changes nothing.
-- (Applied to prod via the Supabase MCP on 21 Jul 2026; mirrored here for repo parity.)

insert into public.app_settings(key, value, updated_at)
values ('aeps_daily_2fa_charge', '0', now())
on conflict (key) do nothing;

create or replace function public.settle_aeps_2fa_charge(p_agent uuid, p_ref uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_charge numeric;
begin
  if p_agent is null then
    return jsonb_build_object('charged', false, 'reason', 'no agent');
  end if;

  select coalesce(nullif(value, '')::numeric, 0)
    into v_charge
    from public.app_settings
   where key = 'aeps_daily_2fa_charge';
  v_charge := coalesce(v_charge, 0);

  if v_charge <= 0 then
    return jsonb_build_object('charged', false, 'reason', 'no charge configured', 'amount', 0);
  end if;

  -- Debit the agent's wallet (raises INSUFFICIENT_FUNDS if it can't cover it),
  -- then book the charge as company revenue. Both writes append ledger rows.
  perform public._wallet_move(p_agent, 'debit', v_charge,
    'AePS daily 2FA charge', 'aeps_2fa_charge', p_ref);
  perform public._company_move('credit', v_charge,
    'AePS daily 2FA charge', 'aeps_2fa_charge', p_ref);

  return jsonb_build_object('charged', true, 'amount', v_charge);
end $function$;

revoke all on function public.settle_aeps_2fa_charge(uuid, uuid) from public, anon, authenticated;
