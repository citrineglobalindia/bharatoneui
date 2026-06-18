alter table public.retailer_registrations
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists assigned_name text;
drop policy if exists rr_assignee_sel on public.retailer_registrations;
create policy rr_assignee_sel on public.retailer_registrations for select to authenticated using (assigned_to = auth.uid());
drop policy if exists rr_assignee_upd on public.retailer_registrations;
create policy rr_assignee_upd on public.retailer_registrations for update to authenticated using (assigned_to = auth.uid());
create or replace function public.assign_registration(reg_id uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_name text; v_no text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  select coalesce(display_name,'User') into v_name from public.profiles where id=p_user;
  update public.retailer_registrations set assigned_to=p_user, assigned_name=v_name where id=reg_id returning application_id into v_no;
  insert into public.notifications(user_id,type,title,body,link,entity_type,entity_id)
    values (p_user,'kyc','Application assigned to you','KYC application '||coalesce(v_no,'')||' assigned for review.','/review/'||reg_id::text,'registration',reg_id::text);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.assign_registration(uuid, uuid) to authenticated;
