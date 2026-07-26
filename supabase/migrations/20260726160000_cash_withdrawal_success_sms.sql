-- DLT template + trigger: SMS the customer when an AEPS cash withdrawal succeeds.
-- Four variables: [1] name, [2] amount, [3] transaction id, [4] available balance.
-- Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'cash_withdrawal_success',
  'AEPS cash withdrawal success receipt (to customer)',
  'BHRONE',
  '1177178426363532021',
  E'Dear {#var#},\nCash Withdrawal of Rs.{#var#} completed successfully.\nTransaction ID: {#var#}\nAvailable Balance:Rs.{#var#}\nTeam BharatOne',
  4, true
) on conflict (template_key) do update set
  dlt_template_id = excluded.dlt_template_id, sender_id = excluded.sender_id,
  body = excluded.body, var_count = excluded.var_count,
  description = excluded.description, active = true, updated_at = now();

-- Fire once, when a cash-withdrawal row reaches 'success'. Delivery via pg_net ->
-- notify-dispatch; best-effort so it never blocks the transaction write.
create or replace function public._tg_aeps_cashout_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_mobile text; v_amt text; v_tid text; v_bal text; v_bal_num numeric;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ2ZvZGlldmtja3dlZnVianlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODUxOTksImV4cCI6MjA5NzE2MTE5OX0.NZTUkQKWlgLyXbMbU_g1Wn1lgPEgPO72LS55DUBLSIg';
begin
  if NEW.service_type <> 2 or NEW.operation <> 'cash_withdrawal' or NEW.status <> 'success' then
    return null;
  end if;
  if TG_OP = 'UPDATE' and OLD.status is not distinct from NEW.status then
    return null;
  end if;

  v_mobile := right(regexp_replace(coalesce(NEW.customer_mobile,''), '\D','','g'), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then return null; end if;

  v_amt := rtrim(rtrim(to_char(round(coalesce(NEW.amount,0),2), 'FM999999990.00'), '0'), '.');
  v_tid := coalesce(nullif(NEW.rrn,''), nullif(NEW.tid,''), nullif(NEW.client_ref_id,''), '-');
  v_bal_num := coalesce(nullif(NEW.response->'data'->>'balance','')::numeric, NEW.balance);
  v_bal := case when v_bal_num is null then '-'
                else rtrim(rtrim(to_char(round(v_bal_num,2), 'FM999999990.00'), '0'), '.') end;

  perform net.http_post(
    url := 'https://grgfodievkckwefubjyj.supabase.co/functions/v1/notify-dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer '||v_anon, 'apikey', v_anon),
    body := jsonb_build_object('channel','sms','to',v_mobile,'template_key','cash_withdrawal_success',
                               'vars', jsonb_build_array('Customer', v_amt, v_tid, v_bal))
  );
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_aeps_cashout_sms on public.aeps_transactions;
create trigger trg_aeps_cashout_sms after insert or update on public.aeps_transactions
  for each row execute function public._tg_aeps_cashout_sms();
