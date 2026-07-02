-- Razorpay: config + payments ledger + RLS + wallet-credit RPC (superseded by verify flow).

create table if not exists public.razorpay_config (
  id int primary key default 1,
  key_id text,
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint razorpay_config_singleton check (id = 1)
);
insert into public.razorpay_config (id, active) values (1, false) on conflict (id) do nothing;

create table if not exists public.razorpay_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null check (purpose in ('wallet_topup','registration_fee','service_payment')),
  ref_id text,
  amount numeric not null,
  currency text not null default 'INR',
  order_id text,
  payment_id text,
  signature text,
  status text not null default 'created' check (status in ('created','paid','failed','not_configured')),
  notes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists razorpay_payments_user_idx on public.razorpay_payments(user_id);
create index if not exists razorpay_payments_order_idx on public.razorpay_payments(order_id);

alter table public.razorpay_config enable row level security;
alter table public.razorpay_payments enable row level security;

-- Users read their own payments; admin/accountant read all.
drop policy if exists razorpay_payments_own on public.razorpay_payments;
create policy razorpay_payments_own on public.razorpay_payments
  for select using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'accountant')
  );

drop policy if exists razorpay_config_read on public.razorpay_config;
create policy razorpay_config_read on public.razorpay_config for select using (true);
drop policy if exists razorpay_config_write on public.razorpay_config;
create policy razorpay_config_write on public.razorpay_config
  for update using (public.has_role(auth.uid(), 'admin'));
