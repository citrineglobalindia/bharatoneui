-- Legacy JSKO password field (from source sheet)
alter table public.jsko_legacy_accounts add column if not exists legacy_password text;
