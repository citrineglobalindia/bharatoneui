-- Optional per-language text for testimonials so admin-entered quotes/roles can
-- be shown in Kannada / Hindi. Falls back to the English quote/place when blank.
alter table public.testimonials
  add column if not exists quote_kn text,
  add column if not exists quote_hi text,
  add column if not exists place_kn text,
  add column if not exists place_hi text;
