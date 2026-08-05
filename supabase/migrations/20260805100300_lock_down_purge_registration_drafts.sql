-- `revoke ... from public` was not enough: this project carries a default
-- privilege that grants EXECUTE on new public functions to anon and
-- authenticated, so the purge function came out callable by any anonymous
-- visitor. It only deletes rows older than 30 days, but a maintenance routine
-- has no business being reachable from the internet. Only the cron job (which
-- runs as the table owner) needs it.
revoke execute on function public.purge_registration_drafts() from anon, authenticated;
