-- Retailers must keep at least Rs 1000 in their MAIN wallet to use the AEPS module.
-- The aeps edge function reads this setting and blocks daily-KYC / transactions when
-- the main wallet balance is below it. Applied to prod via the MCP.
update public.app_settings set value = '1000' where key = 'aeps_min_wallet_balance';
insert into public.app_settings (key, value)
select 'aeps_min_wallet_balance', '1000'
where not exists (select 1 from public.app_settings where key = 'aeps_min_wallet_balance');
