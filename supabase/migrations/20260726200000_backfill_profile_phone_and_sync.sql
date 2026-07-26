-- Root cause: retailer approval (_finalize_retailer) never copied the applicant's
-- mobile onto their profile, so old-JSKO (and other) retailers had no phone where
-- login OTP / profile-based SMS look. Fix = backfill existing + keep it in sync.
-- Applied to prod via the MCP.

-- 1) Backfill profiles.phone for anyone missing it, from their registration mobile
--    or their old-JSKO legacy mobile (matched by email). Store the bare 10 digits.
update public.profiles p
set phone = sub.mobile, updated_at = now()
from (
  select u.id as uid,
    coalesce(
      (select right(regexp_replace(r.mobile,'\D','','g'),10)
         from public.retailer_registrations r
         where r.auth_user_id = u.id and coalesce(r.mobile,'')<>''
         order by created_at desc limit 1),
      (select right(regexp_replace(l.mobile,'\D','','g'),10)
         from public.jsko_legacy_accounts l
         where lower(l.email)=lower(u.email) and coalesce(l.mobile,'')<>''
         limit 1)
    ) as mobile
  from auth.users u
) sub
where p.id = sub.uid
  and coalesce(p.phone,'') = ''
  and sub.mobile is not null
  and sub.mobile ~ '^[6-9][0-9]{9}$';

-- 2) Keep it in sync going forward: when a registration is linked to a login
--    (auth_user_id set at approval), copy the mobile onto the profile if blank.
create or replace function public._tg_sync_profile_phone()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_m text;
begin
  if NEW.auth_user_id is not null and NEW.auth_user_id is distinct from OLD.auth_user_id then
    v_m := right(regexp_replace(coalesce(NEW.mobile,''),'\D','','g'),10);
    if v_m ~ '^[6-9][0-9]{9}$' then
      update public.profiles set phone = v_m, updated_at = now()
      where id = NEW.auth_user_id and coalesce(phone,'') = '';
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_sync_profile_phone on public.retailer_registrations;
create trigger trg_sync_profile_phone after update on public.retailer_registrations
  for each row execute function public._tg_sync_profile_phone();
