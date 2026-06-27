-- CR-BHO-15: only warn about a duplicate registration email when it is genuinely
-- already registered — a live BharatOne account (covers migrated old JSKO accounts)
-- or an approved/registered retailer. Pending / in-review rows no longer block.
create or replace function public.tg_reg_unique_email()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
begin
  if coalesce(NEW.email,'') <> '' then
    -- Already a live BharatOne account with this email (includes migrated old JSKO accounts).
    if exists (select 1 from auth.users where lower(email)=lower(NEW.email)) then
      raise exception 'An account with this email already exists. Please use a different email.';
    end if;
    -- Already an approved / registered retailer with this email.
    if exists (
      select 1 from public.retailer_registrations r
      where r.id <> NEW.id
        and lower(r.email)=lower(NEW.email)
        and r.status in ('approved','completed','active')
    ) then
      raise exception 'A registration with this email is already registered.';
    end if;
  end if;
  return NEW;
end $function$;
