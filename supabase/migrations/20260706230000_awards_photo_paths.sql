-- Each award can hold multiple photos (a small gallery shown on click).
-- photo_paths are object keys in the public "gallery" bucket (awards/ prefix).
alter table public.awards
  add column if not exists photo_paths text[] not null default '{}';
