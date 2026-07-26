-- SMS the earner when commission is credited to their wallet (DLT 'commission_credited').
-- Registered template (2 vars: name, amount):
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'commission_credited',
  'Commission credited to BharatOne wallet',
  'BHRONE',
  '1177178426387458640',
  E'Dear {#var#},\nCommission of Rs.{#var#} has been credited to your BharatOne Wallet.\nThank you for your valuable business.\nTeam BharatOne',
  2, true
) on conflict (template_key) do update set
  dlt_template_id = excluded.dlt_template_id, sender_id = excluded.sender_id,
  body = excluded.body, var_count = excluded.var_count,
  description = excluded.description, active = true, updated_at = now();

-- Fires from the wallet ledgers so every commission source is covered in one place:
--   main wallet_transactions: bbps_commission, estore_order
--   aeps_wallet_transactions: aeps_transaction
-- Delivery is via pg_net -> notify-dispatch (anon key is public; the function uses
-- the service role internally). Best-effort: never break the wallet write.
create or replace function public._sms_commission_credit(p_user uuid, p_amount numeric)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_name text; v_mobile text; v_amt text;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ2ZvZGlldmtja3dlZnVianlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODUxOTksImV4cCI6MjA5NzE2MTE5OX0.NZTUkQKWlgLyXbMbU_g1Wn1lgPEgPO72LS55DUBLSIg';
begin
  if p_user is null or coalesce(p_amount,0) <= 0 then return; end if;

  select coalesce(nullif(trim(pr.display_name),''),
                  nullif(trim(coalesce(r.first_name,'')||' '||coalesce(r.surname,'')),''),
                  'Customer'),
         coalesce(nullif(regexp_replace(coalesce(pr.phone,''), '\D','','g'),''),
                  nullif(regexp_replace(coalesce(r.mobile,''), '\D','','g'),''))
    into v_name, v_mobile
  from public.profiles pr
  left join lateral (
    select first_name, surname, mobile from public.retailer_registrations
    where auth_user_id = p_user order by created_at desc limit 1
  ) r on true
  where pr.id = p_user;

  if v_mobile is null then
    select nullif(regexp_replace(coalesce(mobile,''), '\D','','g'),''),
           nullif(trim(coalesce(first_name,'')||' '||coalesce(surname,'')),'')
      into v_mobile, v_name
    from public.retailer_registrations where auth_user_id = p_user order by created_at desc limit 1;
  end if;

  v_mobile := right(coalesce(v_mobile,''), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then return; end if;

  v_amt := rtrim(rtrim(to_char(round(p_amount,2), 'FM999999990.00'), '0'), '.');

  perform net.http_post(
    url := 'https://grgfodievkckwefubjyj.supabase.co/functions/v1/notify-dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer '||v_anon, 'apikey', v_anon),
    body := jsonb_build_object('channel','sms','to',v_mobile,'template_key','commission_credited',
                               'vars', jsonb_build_array(coalesce(v_name,'Customer'), v_amt))
  );
exception when others then
  return;
end $$;

create or replace function public._tg_wallet_commission_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if NEW.direction = 'credit' and NEW.ref_type in ('bbps_commission','estore_order') then
    perform public._sms_commission_credit(NEW.user_id, NEW.amount);
  end if;
  return null;
end $$;

create or replace function public._tg_aeps_wallet_commission_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if NEW.direction = 'credit' and NEW.ref_type = 'aeps_transaction' then
    perform public._sms_commission_credit(NEW.user_id, NEW.amount);
  end if;
  return null;
end $$;

drop trigger if exists trg_wallet_commission_sms on public.wallet_transactions;
create trigger trg_wallet_commission_sms after insert on public.wallet_transactions
  for each row execute function public._tg_wallet_commission_sms();

drop trigger if exists trg_aeps_wallet_commission_sms on public.aeps_wallet_transactions;
create trigger trg_aeps_wallet_commission_sms after insert on public.aeps_wallet_transactions
  for each row execute function public._tg_aeps_wallet_commission_sms();
