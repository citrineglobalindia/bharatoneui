-- SMS the retailer when money is credited to their wallet (recharge / top-up),
-- DLT 'wallet_credited'. Covers: accountant recharge (wallet_recharge), approved
-- top-up request (topup), staff top-up (manual), online payment (razorpay_payment).
-- Commission credits are intentionally excluded (they have their own SMS).
-- Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'wallet_credited',
  'Amount credited to BharatOne wallet (recharge/top-up)',
  'BHRONE',
  '1177178419660546829',
  E'Dear {#var#},\nRs.{#var#} has been credited to your BharatOne Wallet.\nAvailable Balance: Rs.{#var#}\nThank you.\nTeam BharatOne',
  3, true
) on conflict (template_key) do update set
  dlt_template_id=excluded.dlt_template_id, sender_id=excluded.sender_id, body=excluded.body,
  var_count=excluded.var_count, description=excluded.description, active=true, updated_at=now();

create or replace function public._sms_wallet_credited(p_user uuid, p_amount numeric, p_balance numeric)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_name text; v_mobile text; v_amt text; v_bal text;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ2ZvZGlldmtja3dlZnVianlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODUxOTksImV4cCI6MjA5NzE2MTE5OX0.NZTUkQKWlgLyXbMbU_g1Wn1lgPEgPO72LS55DUBLSIg';
begin
  if p_user is null or coalesce(p_amount,0) <= 0 then return; end if;

  select coalesce(nullif(trim(pr.display_name),''),
                  nullif(trim(coalesce(r.first_name,'')||' '||coalesce(r.surname,'')),''), 'Customer'),
         coalesce(nullif(regexp_replace(coalesce(pr.phone,''),'\D','','g'),''),
                  nullif(regexp_replace(coalesce(r.mobile,''),'\D','','g'),''))
    into v_name, v_mobile
  from public.profiles pr
  left join lateral (select first_name, surname, mobile from public.retailer_registrations
                     where auth_user_id=p_user order by created_at desc limit 1) r on true
  where pr.id=p_user;

  if v_mobile is null then
    select nullif(regexp_replace(coalesce(mobile,''),'\D','','g'),''),
           nullif(trim(coalesce(first_name,'')||' '||coalesce(surname,'')),'')
      into v_mobile, v_name
    from public.retailer_registrations where auth_user_id=p_user order by created_at desc limit 1;
  end if;

  v_mobile := right(coalesce(v_mobile,''), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then return; end if;

  v_amt := rtrim(rtrim(to_char(round(p_amount,2),'FM999999990.00'),'0'),'.');
  v_bal := case when p_balance is null then '-'
                else rtrim(rtrim(to_char(round(p_balance,2),'FM999999990.00'),'0'),'.') end;

  perform net.http_post(
    url := 'https://grgfodievkckwefubjyj.supabase.co/functions/v1/notify-dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer '||v_anon,'apikey',v_anon),
    body := jsonb_build_object('channel','sms','to',v_mobile,'template_key','wallet_credited',
                               'vars', jsonb_build_array(coalesce(v_name,'Customer'), v_amt, v_bal))
  );
exception when others then
  return;
end $$;

create or replace function public._tg_wallet_recharge_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if NEW.direction = 'credit' and NEW.ref_type in ('wallet_recharge','topup','manual','razorpay_payment') then
    perform public._sms_wallet_credited(NEW.user_id, NEW.amount, NEW.balance_after);
  end if;
  return null;
end $$;

drop trigger if exists trg_wallet_recharge_sms on public.wallet_transactions;
create trigger trg_wallet_recharge_sms after insert on public.wallet_transactions
  for each row execute function public._tg_wallet_recharge_sms();
