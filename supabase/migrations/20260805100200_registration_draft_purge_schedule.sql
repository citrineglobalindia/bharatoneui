-- Drafts hold names, dates of birth, addresses, bank details and ID numbers for
-- people who never became customers. They do not get to sit here indefinitely.
create or replace function public.purge_registration_drafts()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_drafts int;
  v_sess   int;
  v_otps   int;
begin
  delete from public.registration_drafts
   where last_seen_at < now() - interval '30 days';
  get diagnostics v_drafts = row_count;

  delete from public.registration_sessions where expires_at < now() - interval '1 day';
  get diagnostics v_sess = row_count;

  -- Spent OTPs were never being cleaned up either.
  delete from public.registration_otps where created_at < now() - interval '7 days';
  get diagnostics v_otps = row_count;

  return jsonb_build_object('drafts', v_drafts, 'sessions', v_sess, 'otps', v_otps);
end;
$$;

revoke all on function public.purge_registration_drafts() from public;

select cron.schedule(
  'purge-registration-drafts',
  '25 3 * * *',
  $$select public.purge_registration_drafts();$$
);
