-- DLT template + trigger: SMS the distributor when their franchise is approved.
-- Two variables: [1] name, [2] login id. Fires when distributor_registrations.status
-- transitions to 'approved' (set by approve_distributor_registration, which also
-- fills username). Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'franchise_approved',
  'Distributor / franchise application approved',
  'BHRONE',
  '1177178419636947849',
  E'Dear {#var#}\nCongratulations!\nYour BharatOne Franchise has been approved.\nLogin ID:{#var#}\nVisit your dashboard for more details.\nTeam BharatOne',
  2, true
) on conflict (template_key) do update set
  dlt_template_id=excluded.dlt_template_id, sender_id=excluded.sender_id, body=excluded.body,
  var_count=excluded.var_count, description=excluded.description, active=true, updated_at=now();

create or replace function public._tg_franchise_approved_sms()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_mobile text; v_name text; v_login text;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ2ZvZGlldmtja3dlZnVianlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODUxOTksImV4cCI6MjA5NzE2MTE5OX0.NZTUkQKWlgLyXbMbU_g1Wn1lgPEgPO72LS55DUBLSIg';
begin
  if NEW.status <> 'approved' or OLD.status is not distinct from NEW.status then
    return null;
  end if;
  v_mobile := right(regexp_replace(coalesce(NEW.mobile,''),'\D','','g'), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then return null; end if;
  v_name  := coalesce(nullif(trim(NEW.distributor_name),''), 'Partner');
  v_login := coalesce(nullif(NEW.username,''), '-');

  perform net.http_post(
    url := 'https://grgfodievkckwefubjyj.supabase.co/functions/v1/notify-dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer '||v_anon,'apikey',v_anon),
    body := jsonb_build_object('channel','sms','to',v_mobile,'template_key','franchise_approved',
                               'vars', jsonb_build_array(v_name, v_login))
  );
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_franchise_approved_sms on public.distributor_registrations;
create trigger trg_franchise_approved_sms after update on public.distributor_registrations
  for each row execute function public._tg_franchise_approved_sms();
