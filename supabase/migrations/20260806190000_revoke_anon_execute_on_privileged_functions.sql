-- Take the public API surface from 323 functions down to what a logged-out
-- visitor actually needs.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so every RPC
-- ever written here became callable by `anon` — and the anon key ships in the
-- site's JavaScript. That included admin_reset_user_password, _wallet_move,
-- accountant_topup_wallet, create_staff_account and set_app_setting. They all
-- check the caller's role internally, so the calls fail; but "fails because of
-- a check inside the function" is one bug away from "does not fail". An
-- unauthenticated stranger should not be able to reach a wallet function at all.
--
-- The allowlist below was derived by reading every RPC call site in the
-- codebase — including one raw fetch() to log_access_batch that a search for
-- ".rpc(" would have missed, and resolve_retailer_login, which runs immediately
-- BEFORE signInWithPassword so that a JSKO ID can be mapped to an account
-- email. Missing either would have broken the site silently.

revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- has_role() is referenced inside 19 RLS policies that anon is evaluated
-- against. Without EXECUTE those policies error instead of returning false, and
-- anonymous reads of ordinary public tables break. It is a pure role predicate
-- and leaks nothing.
grant execute on function public.has_role(uuid, app_role) to anon;

-- Public marketing site and global instrumentation
grant execute on function public.record_site_visit(text, text)                       to anon;
grant execute on function public.log_access_batch(jsonb, text)                       to anon;
grant execute on function public.log_access_batch(jsonb, text, text, text)           to anon;
grant execute on function public.public_live_stats()                                 to anon;
grant execute on function public.site_footer_pages()                                 to anon;
grant execute on function public.site_page(text)                                     to anon;
grant execute on function public.subscribe_newsletter(text, text)                    to anon;

-- Registration (no account exists until QC approval)
grant execute on function public.verify_registration_otp(text, text, text)           to anon;
grant execute on function public.registration_resume_begin(text, text)               to anon;
grant execute on function public.registration_draft_save(uuid, integer, jsonb, text, text) to anon;
grant execute on function public.registration_draft_discard(uuid)                    to anon;
grant execute on function public.lookup_pincode(text)                                to anon;
grant execute on function public.check_retailer_location(double precision, double precision) to anon;
grant execute on function public.email_already_registered(text)                      to anon;
grant execute on function public.fetch_jsko_account(text)                            to anon;
grant execute on function public.fetch_jsko_account(text, text)                      to anon;
grant execute on function public.submit_retailer_registration(jsonb)                 to anon;
grant execute on function public.submit_distributor_registration(jsonb)              to anon;

-- Emailed token pages (opened by people with no login)
grant execute on function public.get_doc_request(uuid)                               to anon;
grant execute on function public.submit_doc_reupload(uuid, text, text)               to anon;

-- Public lookups
grant execute on function public.track_application(text, text)                       to anon;
grant execute on function public.id_card_verify(text)                                to anon;

-- Login and password recovery (run before a session exists)
grant execute on function public.resolve_retailer_login(text)                        to anon;
grant execute on function public.password_reset_account_exists(text)                 to anon;
grant execute on function public.reset_password_with_otp(text, text, text)           to anon;
