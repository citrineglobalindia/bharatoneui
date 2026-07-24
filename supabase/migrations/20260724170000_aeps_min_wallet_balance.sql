-- Admin-set minimum main-wallet balance required to use AEPS (0 = no gate).
-- Enforced in the aeps edge function on daily KYC and transactions so a retailer
-- can always cover the daily-2FA charge and any AEPS fees. Applied to prod via MCP.
insert into public.app_settings (key, value)
values ('aeps_min_wallet_balance', '0')
on conflict (key) do nothing;
