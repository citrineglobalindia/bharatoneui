-- Full registration-style fields on legacy JSKO records (edited by admin/QC or filled during onboarding)
alter table public.jsko_legacy_accounts
  add column if not exists first_name text, add column if not exists middle_name text, add column if not exists surname text,
  add column if not exists dob text, add column if not exists shop_name text, add column if not exists address_type text,
  add column if not exists building_shop_no text, add column if not exists street_area text, add column if not exists ward_number text,
  add column if not exists landmark text, add column if not exists village_name text, add column if not exists taluk text,
  add column if not exists city text, add column if not exists district text, add column if not exists state text, add column if not exists pincode text,
  add column if not exists bank_holder_name text, add column if not exists bank_name text, add column if not exists account_number text,
  add column if not exists ifsc text, add column if not exists account_type text,
  add column if not exists payment_amount numeric(12,2), add column if not exists payment_utr text, add column if not exists payment_method text;
