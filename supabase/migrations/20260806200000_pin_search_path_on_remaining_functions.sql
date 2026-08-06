-- Pin search_path on the 13 functions that lacked it.
--
-- A function without a fixed search_path resolves unqualified names using
-- whatever schema list the CALLER has set. Several of these are SECURITY
-- DEFINER or run inside triggers, so a caller able to create objects in a
-- schema earlier on the path could shadow a table or operator the function
-- relies on and have it execute against their version. Fixing resolution at
-- definition time changes no behaviour otherwise.
alter function private.colo_city(text)        set search_path = public, private, pg_temp;
alter function private.is_staff_role(text)    set search_path = public, private, pg_temp;
alter function private.mask_log(text)         set search_path = public, private, pg_temp;
alter function private.norm_email(text)       set search_path = public, private, pg_temp;
alter function private.request_colo()         set search_path = public, private, pg_temp;
alter function private.request_header(text)   set search_path = public, private, pg_temp;
alter function private.request_ip()           set search_path = public, private, pg_temp;
alter function public._km(double precision, double precision, double precision, double precision)
                                              set search_path = public, pg_temp;
alter function public.is_aeps_staff()                   set search_path = public, private, pg_temp;
alter function public.next_merchant_txn_no()            set search_path = public, pg_temp;
alter function public.tg_lock_completed_application()   set search_path = public, pg_temp;
alter function public.tg_site_pages_touch()             set search_path = public, pg_temp;
alter function public.tg_stamp_application_completed()  set search_path = public, pg_temp;
