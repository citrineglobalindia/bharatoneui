-- Widen the two-factor requirement from three roles to every internal staff role.
--
-- It covered admin, accountant and hr_staff. That left operator, qc and
-- telecaller outside it — the three roles that spend all day in the KYC queue,
-- which is to say reading other people's Aadhaar and PAN documents. A password
-- alone is the wrong control for that.
--
-- Deliberately NOT included: retailer, distributor, master-distributor. Those
-- are 68 outside businesses, and forcing an authenticator app on every shop
-- owner turns each replaced phone into a support call. Their accounts are worth
-- protecting too, but that is a rollout with training attached, not a settings
-- change.
--
-- store_staff is listed although nobody holds it today, so whoever is given it
-- first arrives with the requirement already in force, rather than being added
-- to this list months later by somebody who happens to remember.
--
-- To lift the requirement in a hurry, set this value back — no deploy needed:
--   update public.app_settings set value = 'admin,accountant,hr_staff'
--    where key = 'mfa_required_roles';
--
-- Applied to grgfodievkckwefubjyj. After applying: 19 staff accounts required,
-- 68 retailer/distributor accounts untouched.
update public.app_settings
   set value = 'admin,accountant,hr_staff,operator,qc,telecaller,manager,employee,dro,tro,bde,store_staff'
 where key = 'mfa_required_roles';

insert into public.app_settings (key, value)
select 'mfa_required_roles', 'admin,accountant,hr_staff,operator,qc,telecaller,manager,employee,dro,tro,bde,store_staff'
where not exists (select 1 from public.app_settings where key = 'mfa_required_roles');
