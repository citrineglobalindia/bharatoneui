-- DLT template + trigger: welcome SMS with Customer ID when a retailer application
-- is submitted. Two variables: [1] name, [2] customer id (= application_id).
-- Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'welcome_customer_id',
  'Welcome + Customer ID on application submission',
  'BHRONE',
  '1177178411139359696',
  E'Dear {#var#},\nWelcome to BharatOne.\nYour Customer ID is {#var#}.\nThank you for choosing BharatOne Services.\nTeam BharatOne',
  2, true
) on conflict (template_key) do update set
  dlt_template_id=excluded.dlt_template_id, sender_id=excluded.sender_id, body=excluded.body,
  var_count=excluded.var_count, description=excluded.description, active=true, updated_at=now();

create or replace function public._tg_registration_welcome_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_mobile text; v_name text; v_cid text;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ2ZvZGlldmtja3dlZnVianlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODUxOTksImV4cCI6MjA5NzE2MTE5OX0.NZTUkQKWlgLyXbMbU_g1Wn1lgPEgPO72LS55DUBLSIg';
begin
  v_mobile := right(regexp_replace(coalesce(NEW.mobile,''),'\D','','g'), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then return null; end if;
  v_name := coalesce(nullif(trim(NEW.first_name),''),
                     nullif(trim(coalesce(NEW.first_name,'')||' '||coalesce(NEW.surname,'')),''), 'Customer');
  v_cid  := coalesce(nullif(NEW.application_id,''), '-');

  perform net.http_post(
    url := 'https://grgfodievkckwefubjyj.supabase.co/functions/v1/notify-dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer '||v_anon,'apikey',v_anon),
    body := jsonb_build_object('channel','sms','to',v_mobile,'template_key','welcome_customer_id',
                               'vars', jsonb_build_array(v_name, v_cid))
  );
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_registration_welcome_sms on public.retailer_registrations;
create trigger trg_registration_welcome_sms after insert on public.retailer_registrations
  for each row execute function public._tg_registration_welcome_sms();
