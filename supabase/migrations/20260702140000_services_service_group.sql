-- Per-service Service Group (retailer menu grouping) for backend services.
alter table public.services add column if not exists service_group text;
