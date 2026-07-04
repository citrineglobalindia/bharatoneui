-- Early duplicate-email check for the Old JSKO Portal step. Mirrors the
-- tg_reg_unique_email trigger: an email is "already registered" if a live
-- account exists (includes migrated JSKO accounts) or an approved/active
-- retailer registration exists with that email.
create or replace function public.email_already_registered(p_email text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
begin
  if coalesce(p_email, '') = '' then
    return false;
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    return true;
  end if;
  if exists (
    select 1 from public.retailer_registrations r
    where lower(r.email) = lower(p_email)
      and r.status in ('approved', 'completed', 'active')
  ) then
    return true;
  end if;
  return false;
end $function$;

revoke all on function public.email_already_registered(text) from public;
grant execute on function public.email_already_registered(text) to anon, authenticated;
