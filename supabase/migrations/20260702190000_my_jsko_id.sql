-- Return the logged-in user's JSKO ID (from their latest retailer registration).
-- SECURITY DEFINER so it works regardless of RLS on retailer_registrations.
create or replace function public.my_jsko_id()
returns text
language sql
security definer
set search_path to 'public'
as $function$
  select coalesce(jsko_id, application_id)
  from public.retailer_registrations
  where auth_user_id = auth.uid()
  order by created_at desc
  limit 1;
$function$;

revoke all on function public.my_jsko_id() from public, anon;
grant execute on function public.my_jsko_id() to authenticated;
