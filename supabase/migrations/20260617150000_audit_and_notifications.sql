create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, actor_name text,
  action text not null, entity_type text, entity_id text, summary text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists al_sel on public.audit_log;
create policy al_sel on public.audit_log for select to authenticated using (private.is_admin(auth.uid()));

create or replace function public._actor_name() returns text language sql security definer set search_path=public as $$
  select coalesce(p.display_name, u.email, 'System') from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
$$;

create or replace function public._audit(p_action text, p_etype text, p_eid text, p_summary text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor_id, actor_name, action, entity_type, entity_id, summary)
  values (auth.uid(), public._actor_name(), p_action, p_etype, p_eid, p_summary);
end $$;

-- Service applications: notify operator on create; notify retailer on status/payment change
create or replace function public.tg_application() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='INSERT' then
    if NEW.assigned_operator is not null then
      insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (NEW.assigned_operator,'application','New application assigned',NEW.application_no||' - '||NEW.service_name||' from '||coalesce(NEW.submitter_name,'retailer'),'/operator','application',NEW.id::text);
    end if;
    perform public._audit('application.create','application',NEW.id::text, coalesce(NEW.submitter_name,'Retailer')||' submitted '||NEW.application_no||' ('||NEW.service_name||')');
  elsif TG_OP='UPDATE' then
    if NEW.status is distinct from OLD.status then
      insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (NEW.submitted_by,'application','Application '||replace(NEW.status,'_',' '),NEW.application_no||' is now '||replace(NEW.status,'_',' ')||'.','/applications','application',NEW.id::text);
      perform public._audit('application.status','application',NEW.id::text, NEW.application_no||' → '||NEW.status);
    end if;
    if NEW.payment_verified is distinct from OLD.payment_verified and NEW.payment_verified then
      perform public._audit('application.payment_verified','application',NEW.id::text, 'Payment verified for '||NEW.application_no);
    end if;
    if NEW.result_doc_path is distinct from OLD.result_doc_path and NEW.result_doc_path is not null then
      insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
      values (NEW.submitted_by,'application','Result document ready','A document is ready for '||NEW.application_no||'.','/applications','application',NEW.id::text);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_application on public.service_applications;
create trigger trg_application after insert or update on public.service_applications for each row execute function public.tg_application();

-- Application chat: notify the other party
create or replace function public.tg_app_message() returns trigger language plpgsql security definer set search_path=public as $$
declare v_sub uuid; v_op uuid; v_no text; v_recipient uuid;
begin
  select submitted_by, assigned_operator, application_no into v_sub, v_op, v_no from public.service_applications where id=NEW.application_id;
  v_recipient := case when NEW.sender_id = v_sub then v_op else v_sub end;
  if v_recipient is not null and v_recipient <> NEW.sender_id then
    insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
    values (v_recipient,'message','New message on '||coalesce(v_no,'application'),left(NEW.body,120),
      case when v_recipient=v_sub then '/applications' else '/operator' end,'application',NEW.application_id::text);
  end if;
  return null;
end $$;
drop trigger if exists trg_app_message on public.application_messages;
create trigger trg_app_message after insert on public.application_messages for each row execute function public.tg_app_message();

-- Generic audit for finance + catalog tables
create or replace function public.tg_audit_generic() returns trigger language plpgsql security definer set search_path=public as $$
declare eid text; lbl text;
begin
  eid := coalesce((case when TG_OP='DELETE' then OLD.id else NEW.id end)::text,'');
  lbl := TG_TABLE_NAME||' '||lower(TG_OP);
  perform public._audit(TG_TABLE_NAME||'.'||lower(TG_OP), TG_TABLE_NAME, eid, lbl);
  return null;
end $$;
do $$ declare t text;
begin
  foreach t in array array['wallet_topups','wallet_withdrawals','services','service_categories','jsko_legacy_accounts','retailer_registrations','company_ledger'] loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.tg_audit_generic()', t);
  end loop;
end $$;
select 'audit + notification triggers OK' as status;
