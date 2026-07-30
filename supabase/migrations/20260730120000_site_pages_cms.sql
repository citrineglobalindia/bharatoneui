-- Admin-managed website pages (Terms, Privacy, Refund, and any new page).
-- Public visitors read only published pages; admins manage everything.
-- Rendered publicly at /p/<slug>; footer links are driven by site_footer_pages().
-- Applied to prod via the MCP.
create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  content text not null default '',
  footer_group text not null default 'Company',
  show_in_footer boolean not null default true,
  show_in_bottom_bar boolean not null default false,
  sort_order int not null default 100,
  published boolean not null default true,
  meta_description text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_pages_footer_idx on public.site_pages(published, show_in_footer, sort_order);

alter table public.site_pages enable row level security;

drop policy if exists "public reads published pages" on public.site_pages;
create policy "public reads published pages" on public.site_pages
  for select to anon, authenticated using (published = true or private.is_admin(auth.uid()));

drop policy if exists "admins manage pages" on public.site_pages;
create policy "admins manage pages" on public.site_pages
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create or replace function public.tg_site_pages_touch() returns trigger
language plpgsql as $$
begin
  NEW.slug := lower(regexp_replace(trim(NEW.slug), '[^a-zA-Z0-9]+', '-', 'g'));
  NEW.slug := trim(both '-' from NEW.slug);
  NEW.updated_at := now();
  return NEW;
end $$;
drop trigger if exists trg_site_pages_touch on public.site_pages;
create trigger trg_site_pages_touch before insert or update on public.site_pages
  for each row execute function public.tg_site_pages_touch();

create or replace function public.site_footer_pages()
returns table(slug text, title text, footer_group text, show_in_bottom_bar boolean, sort_order int)
language sql stable security definer set search_path to 'public' as $$
  select slug, title, footer_group, show_in_bottom_bar, sort_order
  from public.site_pages
  where published and show_in_footer
  order by footer_group, sort_order, title;
$$;
grant execute on function public.site_footer_pages() to anon, authenticated;

create or replace function public.site_page(p_slug text)
returns json language sql stable security definer set search_path to 'public' as $$
  select case when p.id is null then null else json_build_object(
    'slug',p.slug,'title',p.title,'subtitle',p.subtitle,'content',p.content,
    'meta_description',p.meta_description,'updated_at',p.updated_at) end
  from (select * from public.site_pages where slug = lower(trim(p_slug)) and published limit 1) p;
$$;
grant execute on function public.site_page(text) to anon, authenticated;

-- The three existing legal pages are seeded in production so admin can edit them
-- immediately (content omitted here for brevity; see the site_pages table).
