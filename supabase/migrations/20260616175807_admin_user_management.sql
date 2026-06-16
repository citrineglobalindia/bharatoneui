create or replace function public.admin_list_users()
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only administrators can list users'; end if;
  return coalesce((
    select jsonb_agg(t order by t.created_at desc)
    from (
      select p.id, au.email, p.display_name, p.department, p.designation, p.employee_code,
             p.is_active, p.created_at,
             coalesce((select array_agg(r.role::text order by r.role::text) from public.user_roles r where r.user_id = p.id), '{}') as roles
      from public.profiles p
      join auth.users au on au.id = p.id
    ) t
  ), '[]'::jsonb);
end; $fn$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- admin: set a user's role set (replace) + toggle active
create or replace function public.admin_set_user_role(target uuid, _role text, _add boolean)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only administrators'; end if;
  if _add then
    insert into public.user_roles (user_id, role) values (target, _role::public.app_role) on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = target and role::text = _role;
  end if;
end; $fn$;
revoke all on function public.admin_set_user_role(uuid,text,boolean) from public, anon;
grant execute on function public.admin_set_user_role(uuid,text,boolean) to authenticated;
