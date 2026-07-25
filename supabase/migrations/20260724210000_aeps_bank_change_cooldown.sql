-- 72-hour cooldown between AEPS settlement-bank changes (from the last APPROVED
-- change). First change is free; rejected requests don't start the clock.
-- Applied to prod via the Supabase MCP.
insert into public.app_settings (key, value)
values ('aeps_bank_change_cooldown_hours', '72')
on conflict (key) do nothing;

create or replace function public.request_aeps_bank_change(p_account text, p_ifsc text, p_holder text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text; v_cooldown int; v_last timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_account is null or p_account !~ '^[0-9]{6,20}$' then raise exception 'Enter a valid bank account number'; end if;
  if p_ifsc is null or upper(p_ifsc) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'Enter a valid IFSC code'; end if;
  if coalesce(trim(p_holder),'') = '' then raise exception 'Enter the account holder name'; end if;
  if exists (select 1 from public.aeps_bank_change_requests where user_id = v_uid and status = 'requested') then
    raise exception 'You already have a pending bank change request';
  end if;
  v_cooldown := coalesce(nullif((select value from public.app_settings where key='aeps_bank_change_cooldown_hours'),'')::int, 72);
  select max(processed_at) into v_last from public.aeps_bank_change_requests where user_id = v_uid and status = 'approved';
  if v_last is not null and v_last > now() - make_interval(hours => v_cooldown) then
    raise exception 'You can change your bank again after %',
      to_char((v_last + make_interval(hours => v_cooldown)) at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM');
  end if;
  insert into public.aeps_bank_change_requests(user_id, account, ifsc, holder)
    values (v_uid, p_account, upper(p_ifsc), trim(p_holder)) returning id into v_id;
  select coalesce(display_name,'Retailer') into v_name from public.profiles where id = v_uid;
  perform public.notify_roles(array['accountant','admin'],'bank_change','AEPS bank change request',
    coalesce(v_name,'Retailer')||' requested a settlement bank change','/accountant/aeps-payouts','bank_change', v_id::text);
  return json_build_object('ok', true, 'id', v_id, 'status', 'requested');
end; $$;

create or replace function public.aeps_my_bank()
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_acc text; v_ifsc text; v_holder text; v_pending json;
  v_cooldown int; v_last timestamptz; v_next timestamptz;
begin
  select settlement_account, settlement_ifsc, settlement_holder into v_acc, v_ifsc, v_holder
    from public.aeps_agents where user_id = v_uid;
  select coalesce(v_holder, bank_holder_name, trim(coalesce(first_name,'')||' '||coalesce(surname,''))),
         coalesce(v_acc, account_number), coalesce(v_ifsc, ifsc)
    into v_holder, v_acc, v_ifsc
    from public.retailer_registrations where auth_user_id = v_uid limit 1;
  select json_build_object('account', account, 'ifsc', ifsc, 'holder', holder, 'requested_at', requested_at)
    into v_pending
    from public.aeps_bank_change_requests where user_id = v_uid and status = 'requested'
    order by requested_at desc limit 1;
  v_cooldown := coalesce(nullif((select value from public.app_settings where key='aeps_bank_change_cooldown_hours'),'')::int, 72);
  select max(processed_at) into v_last from public.aeps_bank_change_requests where user_id = v_uid and status = 'approved';
  if v_last is not null and v_last > now() - make_interval(hours => v_cooldown) then
    v_next := v_last + make_interval(hours => v_cooldown);
  end if;
  return json_build_object('account', v_acc, 'ifsc', v_ifsc, 'holder', v_holder, 'pending', v_pending,
    'next_change_at', v_next, 'cooldown_hours', v_cooldown);
end; $$;
