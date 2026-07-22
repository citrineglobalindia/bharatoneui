-- AEPS Cashout (Eko fund settlement) — per-agent settlement accounts and
-- settlement transactions. Gated by app_settings.aeps_settlement_mode:
--   'off'      -> feature hidden (default; also correct for Eko "Self" config,
--                 where BharatOne receives the whole AePS float internally)
--   'merchant' -> agents settle their unsettled Eko fund to their own bank
--                 account ("My Merchant" config on the Eko account).

create table if not exists public.aeps_settlement_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id text not null,
  bank_id integer,
  account text not null,
  ifsc text not null,
  holder_name text,
  created_at timestamptz not null default now(),
  unique (user_id, recipient_id)
);

create table if not exists public.aeps_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_ref_id text not null unique,
  amount numeric not null,
  fee numeric,
  gst numeric,
  recipient_id text not null,
  payment_mode integer not null, -- 4 = NEFT, 5 = IMPS, 13 = RTGS
  status text not null default 'pending', -- pending | success | failed | pending_reconciliation
  tid text,
  bank_ref_num text,
  message text,
  response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aeps_settlement_accounts enable row level security;
alter table public.aeps_settlements enable row level security;

-- Agents read their own rows; admins read everything. All writes go through
-- the aeps edge function with the service role.
drop policy if exists "own settlement accounts" on public.aeps_settlement_accounts;
create policy "own settlement accounts" on public.aeps_settlement_accounts
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );

drop policy if exists "own settlements" on public.aeps_settlements;
create policy "own settlements" on public.aeps_settlements
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );

insert into public.app_settings (key, value)
values ('aeps_settlement_mode', 'off')
on conflict (key) do nothing;
