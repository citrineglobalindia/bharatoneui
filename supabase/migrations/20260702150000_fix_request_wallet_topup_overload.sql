-- Remove the ambiguous 3-arg overload so retailer top-up requests resolve to a
-- single function (the 5-arg version already defaults txn_date/receipt_path to null).
-- PostgREST was throwing PGRST203 "could not choose the best candidate function"
-- on 3-arg calls, so requests never inserted into wallet_topups and never appeared
-- in the accountant's Wallet Requests list.
drop function if exists public.request_wallet_topup(numeric, text, text);
