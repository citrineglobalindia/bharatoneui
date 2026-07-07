-- Distinguish homepage partner testimonials ('partner') from the Careers
-- "Life at BharatOne" team testimonials ('team').
alter table public.testimonials
  add column if not exists kind text not null default 'partner';
alter table public.testimonials
  drop constraint if exists testimonials_kind_chk;
alter table public.testimonials
  add constraint testimonials_kind_chk check (kind in ('partner','team'));
