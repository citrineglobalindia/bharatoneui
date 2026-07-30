-- Newsletter signups from the website footer ("Stay in the loop").
-- Applied to prod via the MCP.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  source text default 'footer',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create index if not exists newsletter_status_idx on public.newsletter_subscribers(status, created_at desc);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "admins read subscribers" on public.newsletter_subscribers;
create policy "admins read subscribers" on public.newsletter_subscribers
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists "admins manage subscribers" on public.newsletter_subscribers;
create policy "admins manage subscribers" on public.newsletter_subscribers
  for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Public subscribe endpoint: validates, idempotent, re-activates unsubscribed addresses.
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'footer')
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(trim(coalesce(p_email,'')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'message', 'Please enter a valid email address.');
  end if;
  insert into public.newsletter_subscribers(email, source)
  values (v_email, coalesce(nullif(trim(p_source),''),'footer'))
  on conflict (email) do update
    set status='subscribed', unsubscribed_at=null
  where public.newsletter_subscribers.status='unsubscribed';
  return json_build_object('ok', true, 'message', 'Subscribed');
end $$;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

create or replace function public.admin_newsletter_subscribers(_limit integer default 500)
returns table(email text, status text, source text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select email, status, source, created_at
  from public.newsletter_subscribers
  where private.is_admin(auth.uid())
  order by created_at desc
  limit greatest(1, least(coalesce(_limit,500), 5000));
$$;
grant execute on function public.admin_newsletter_subscribers(integer) to authenticated;
