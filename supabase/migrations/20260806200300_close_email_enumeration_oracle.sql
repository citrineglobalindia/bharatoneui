-- email_already_registered answered any anonymous caller about any address, so
-- it could be walked to learn who is a BharatOne retailer. It exists for one
-- honest purpose: telling somebody part-way through registration that their
-- address is already taken. That purpose is served just as well AFTER they have
-- proved the address is theirs with an OTP — which the registration flow makes
-- them do first anyway.
create or replace function public.email_already_registered(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $fn$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  if v_email = '' then return false; end if;

  if private.is_admin(auth.uid())
     or public.has_role(auth.uid(),'accountant')
     or public.has_role(auth.uid(),'qc')
     or public.has_role(auth.uid(),'telecaller') then
    return exists (select 1 from public.retailer_registrations r
                   where lower(r.email) = v_email and r.status <> 'rejected');
  end if;

  if not exists (
    select 1 from public.registration_otps o
    where lower(o.target) = v_email and o.channel = 'email' and o.verified
      and o.created_at > now() - interval '30 minutes'
  ) then
    raise exception 'Verify this email address first';
  end if;

  return exists (select 1 from public.retailer_registrations r
                 where lower(r.email) = v_email and r.status <> 'rejected');
end;
$fn$;
