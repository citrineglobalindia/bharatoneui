-- Early duplicate-email check for the Old JSKO Portal step. Mirrors
-- tg_reg_unique_email exactly so the portal step catches the SAME duplicates the
-- final-submit trigger blocks on: a live auth account (includes migrated JSKO
-- accounts), or any non-rejected retailer registration with the same email.
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
  -- 1) already a live auth account
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    return true;
  end if;
  -- 2) any existing non-rejected registration with this email
  if exists (
    select 1 from public.retailer_registrations r
    where lower(r.email) = lower(p_email)
      and coalesce(r.status, '') <> 'rejected'
  ) then
    return true;
  end if;
  return false;
end $function$;

revoke all on function public.email_already_registered(text) from public;
grant execute on function public.email_already_registered(text) to anon, authenticated;
