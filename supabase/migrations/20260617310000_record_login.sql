alter table public.profiles add column if not exists login_count int not null default 0, add column if not exists last_login_at timestamptz;
-- record_login() RPC notifies QC+admin on retailer's 1st and 2nd login (body as deployed)
