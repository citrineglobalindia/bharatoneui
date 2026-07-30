-- BharatOne — platform access log ("server log")
-- Applied to prod via the MCP as three migrations:
--   20260730111036 platform_access_log
--   20260730111105 platform_access_log_readers
--   20260730111245 log_access_batch
-- Consolidated here as the source-of-truth record.
--
-- Records every movement on the platform: who, from which IP and device, on which
-- page, doing what, with what outcome. The IP, user agent and user identity are read
-- server-side out of the PostgREST request headers inside a SECURITY DEFINER
-- function — they are never accepted from the browser, so they cannot be spoofed.
--
-- Readable only by admins. Surfaced at /logs behind a real login.

-- ============================================================ 1. table

create table if not exists public.platform_access_log (
  id           bigserial primary key,
  at           timestamptz not null default now(),

  -- who
  user_id      uuid references auth.users(id) on delete set null,
  actor        text,                 -- display name resolved at write time
  actor_ref    text,                 -- BharatOne application id / login id
  role         text,

  -- where from
  ip           text,
  forwarded    text,                 -- full x-forwarded-for chain
  user_agent   text,
  session_id   text,                 -- groups one browser visit

  -- what
  kind         text not null default 'action'
                 check (kind in ('page','action','auth','api','error')),
  module       text,
  route        text,
  action       text not null,
  entity       text,
  status       text not null default 'ok' check (status in ('ok','fail','warn')),
  latency_ms   integer,
  detail       jsonb
);

create index if not exists pal_at_idx      on public.platform_access_log(at desc);
create index if not exists pal_user_idx    on public.platform_access_log(user_id, at desc);
create index if not exists pal_ip_idx      on public.platform_access_log(ip, at desc);
create index if not exists pal_kind_idx    on public.platform_access_log(kind, at desc);
create index if not exists pal_module_idx  on public.platform_access_log(module, at desc);
create index if not exists pal_session_idx on public.platform_access_log(session_id, at desc);
create index if not exists pal_status_idx  on public.platform_access_log(status, at desc) where status <> 'ok';

alter table public.platform_access_log enable row level security;

drop policy if exists "admins read access log" on public.platform_access_log;
create policy "admins read access log" on public.platform_access_log
  for select to authenticated using (private.is_admin(auth.uid()));

-- ============================================================ 2. header helpers

create or replace function private.request_ip()
returns text language sql stable as $fn$
  select nullif(trim(split_part(
    coalesce(
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
      current_setting('request.headers', true)::json ->> 'x-real-ip',
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ''),
    ',', 1)), '')
$fn$;

create or replace function private.request_header(h text)
returns text language sql stable as $fn$
  select nullif(current_setting('request.headers', true)::json ->> h, '')
$fn$;

-- ============================================================ 3. single-event writer

create or replace function public.log_access(
  p_action   text,
  p_kind     text    default 'action',
  p_module   text    default null,
  p_route    text    default null,
  p_entity   text    default null,
  p_status   text    default 'ok',
  p_latency  integer default null,
  p_detail   jsonb   default null,
  p_session  text    default null,
  p_ip       text    default null,   -- only honoured for the service role (edge functions)
  p_user     uuid    default null    -- ditto
)
returns void
language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_uid   uuid;
  v_ip    text;
  v_ua    text;
  v_name  text;
  v_ref   text;
  v_role  text;
  v_svc   boolean := (coalesce(current_setting('request.jwt.claim.role', true),
                               current_setting('role', true)) = 'service_role');
begin
  if coalesce(trim(p_action), '') = '' then return; end if;

  v_uid := coalesce(auth.uid(), case when v_svc then p_user end);
  v_ip  := coalesce(private.request_ip(), case when v_svc then p_ip end);
  v_ua  := private.request_header('user-agent');

  if v_uid is not null then
    select coalesce(
             nullif(trim(p.display_name), ''),
             nullif(trim(concat_ws(' ', r.first_name, r.surname)), ''),
             u.email),
           coalesce(r.application_id, r.username, u.email)
      into v_name, v_ref
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join lateral (
        select rr.application_id, rr.username, rr.first_name, rr.surname
        from public.retailer_registrations rr
        where rr.auth_user_id = u.id
        order by rr.created_at desc limit 1
      ) r on true
     where u.id = v_uid;

    select string_agg(ur.role::text, ',' order by ur.role::text)
      into v_role from public.user_roles ur where ur.user_id = v_uid;
  end if;

  insert into public.platform_access_log(
    user_id, actor, actor_ref, role,
    ip, forwarded, user_agent, session_id,
    kind, module, route, action, entity, status, latency_ms, detail)
  values (
    v_uid, v_name, v_ref, v_role,
    v_ip, private.request_header('x-forwarded-for'), left(coalesce(v_ua,''), 400),
    left(coalesce(p_session,''), 60),
    case when p_kind in ('page','action','auth','api','error') then p_kind else 'action' end,
    left(coalesce(p_module,''), 60), left(coalesce(p_route,''), 300),
    left(p_action, 400), left(coalesce(p_entity,''), 120),
    case when p_status in ('ok','fail','warn') then p_status else 'ok' end,
    p_latency, p_detail);
exception when others then
  null;   -- logging must never break the request it is describing
end $fn$;

grant execute on function public.log_access(text,text,text,text,text,text,integer,jsonb,text,text,uuid)
  to anon, authenticated, service_role;

-- ============================================================ 4. batched writer
-- The browser buffers events for a few seconds and flushes them in one call, so full
-- request logging costs roughly one extra round trip every few seconds rather than
-- one per API call. IP / user-agent / user are still resolved server-side.

create or replace function public.log_access_batch(p_events jsonb, p_session text default null)
returns integer
language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_uid  uuid;
  v_ip   text;
  v_ua   text;
  v_name text;
  v_ref  text;
  v_role text;
  v_n    integer := 0;
  e      jsonb;
  v_at   timestamptz;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then return 0; end if;
  if jsonb_array_length(p_events) > 200 then return 0; end if;  -- flood guard

  v_uid := auth.uid();
  v_ip  := private.request_ip();
  v_ua  := left(coalesce(private.request_header('user-agent'), ''), 400);

  if v_uid is not null then
    select coalesce(
             nullif(trim(p.display_name), ''),
             nullif(trim(concat_ws(' ', r.first_name, r.surname)), ''),
             u.email),
           coalesce(r.application_id, r.username, u.email)
      into v_name, v_ref
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join lateral (
        select rr.application_id, rr.username, rr.first_name, rr.surname
        from public.retailer_registrations rr
        where rr.auth_user_id = u.id
        order by rr.created_at desc limit 1
      ) r on true
     where u.id = v_uid;

    select string_agg(ur.role::text, ',' order by ur.role::text)
      into v_role from public.user_roles ur where ur.user_id = v_uid;
  end if;

  for e in select * from jsonb_array_elements(p_events) loop
    begin
      if coalesce(trim(e ->> 'action'), '') = '' then continue; end if;

      v_at := coalesce((e ->> 'at')::timestamptz, now());
      if v_at > now() + interval '5 minutes' or v_at < now() - interval '1 hour' then
        v_at := now();
      end if;

      insert into public.platform_access_log(
        at, user_id, actor, actor_ref, role,
        ip, forwarded, user_agent, session_id,
        kind, module, route, action, entity, status, latency_ms, detail)
      values (
        v_at, v_uid, v_name, v_ref, v_role,
        v_ip, private.request_header('x-forwarded-for'), v_ua, left(coalesce(p_session, ''), 60),
        case when (e ->> 'kind') in ('page','action','auth','api','error') then e ->> 'kind' else 'api' end,
        left(coalesce(e ->> 'module', ''), 60),
        left(coalesce(e ->> 'route', ''), 300),
        left(e ->> 'action', 400),
        left(coalesce(e ->> 'entity', ''), 120),
        case when (e ->> 'status') in ('ok','fail','warn') then e ->> 'status' else 'ok' end,
        nullif(e ->> 'latency', '')::integer,
        case when jsonb_typeof(e -> 'detail') = 'object' then e -> 'detail' else null end);
      v_n := v_n + 1;
    exception when others then
      continue;   -- one bad event must not lose the rest of the batch
    end;
  end loop;

  return v_n;
end $fn$;

grant execute on function public.log_access_batch(jsonb, text) to anon, authenticated, service_role;

-- ============================================================ 5. readers (admin only)

create or replace function public.admin_access_log(
  p_limit  integer default 200,
  p_kind   text    default null,
  p_module text    default null,
  p_status text    default null,
  p_user   uuid    default null,
  p_ip     text    default null,
  p_q      text    default null,
  p_since  timestamptz default null
)
returns table(
  id bigint, at timestamptz, user_id uuid, actor text, actor_ref text, role text,
  ip text, user_agent text, session_id text, kind text, module text, route text,
  action text, entity text, status text, latency_ms integer, detail jsonb
)
language sql stable security definer set search_path to 'public' as $fn$
  select l.id, l.at, l.user_id, l.actor, l.actor_ref, l.role,
         l.ip, l.user_agent, l.session_id, l.kind, l.module, l.route,
         l.action, l.entity, l.status, l.latency_ms, l.detail
  from public.platform_access_log l
  where private.is_admin(auth.uid())
    and (p_kind   is null or p_kind   = '' or l.kind   = p_kind)
    and (p_module is null or p_module = '' or l.module = p_module)
    and (p_status is null or p_status = '' or l.status = p_status)
    and (p_user   is null or l.user_id = p_user)
    and (p_ip     is null or p_ip = '' or l.ip = p_ip)
    and (p_since  is null or l.at >= p_since)
    and (p_q is null or p_q = '' or
         (coalesce(l.action,'') || ' ' || coalesce(l.actor,'') || ' ' || coalesce(l.actor_ref,'') || ' ' ||
          coalesce(l.route,'')  || ' ' || coalesce(l.ip,'')    || ' ' || coalesce(l.entity,'') || ' ' ||
          coalesce(l.module,'')) ilike '%' || p_q || '%')
  order by l.at desc
  limit greatest(1, least(coalesce(p_limit, 200), 2000));
$fn$;
grant execute on function public.admin_access_log(integer,text,text,text,uuid,text,text,timestamptz) to authenticated;

create or replace function public.admin_access_stats()
returns json language sql stable security definer set search_path to 'public' as $fn$
  select case when not private.is_admin(auth.uid()) then null else json_build_object(
    'events_24h',   (select count(*) from public.platform_access_log where at > now() - interval '24 hours'),
    'events_1h',    (select count(*) from public.platform_access_log where at > now() - interval '1 hour'),
    'failures_24h', (select count(*) from public.platform_access_log where at > now() - interval '24 hours' and status <> 'ok'),
    'users_24h',    (select count(distinct user_id) from public.platform_access_log where at > now() - interval '24 hours' and user_id is not null),
    'ips_24h',      (select count(distinct ip) from public.platform_access_log where at > now() - interval '24 hours' and ip is not null),
    'last_event',   (select max(at) from public.platform_access_log),
    'by_kind',      (select json_agg(json_build_object('kind', k, 'n', n) order by n desc)
                     from (select kind k, count(*) n from public.platform_access_log
                           where at > now() - interval '24 hours' group by kind) s),
    'by_module',    (select json_agg(json_build_object('module', m, 'n', n) order by n desc)
                     from (select coalesce(nullif(module,''),'-') m, count(*) n from public.platform_access_log
                           where at > now() - interval '24 hours' group by 1 order by 2 desc limit 20) s),
    'top_routes',   (select json_agg(json_build_object('route', r, 'n', n) order by n desc)
                     from (select coalesce(nullif(route,''),'-') r, count(*) n from public.platform_access_log
                           where at > now() - interval '24 hours' and kind = 'page' group by 1 order by 2 desc limit 10) s)
  ) end
$fn$;
grant execute on function public.admin_access_stats() to authenticated;

-- "Who is on the platform" — one row per browser session / IP.
create or replace function public.admin_access_sessions(p_hours integer default 24, p_limit integer default 100)
returns table(
  session_id text, ip text, user_id uuid, actor text, actor_ref text, role text,
  user_agent text, first_seen timestamptz, last_seen timestamptz,
  events bigint, pages bigint, failures bigint, routes text
)
language sql stable security definer set search_path to 'public' as $fn$
  with base as (
    select coalesce(nullif(l.session_id,''), 'ip:' || coalesce(l.ip,'?')) as sid, l.*
    from public.platform_access_log l
    where private.is_admin(auth.uid())
      and l.at > now() - (greatest(1, least(coalesce(p_hours, 24), 720))::text || ' hours')::interval
  )
  select b.sid as session_id,
         max(b.ip) as ip,
         (array_agg(b.user_id   order by b.at desc) filter (where b.user_id is not null))[1],
         (array_agg(b.actor     order by b.at desc) filter (where b.actor is not null))[1],
         (array_agg(b.actor_ref order by b.at desc) filter (where b.actor_ref is not null))[1],
         (array_agg(b.role      order by b.at desc) filter (where b.role is not null))[1],
         (array_agg(b.user_agent order by b.at desc) filter (where b.user_agent is not null))[1],
         min(b.at), max(b.at),
         count(*),
         count(*) filter (where b.kind = 'page'),
         count(*) filter (where b.status <> 'ok'),
         string_agg(distinct b.route, ' > ') filter (where b.kind = 'page' and coalesce(b.route,'') <> '')
  from base b
  group by b.sid
  order by max(b.at) desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$fn$;
grant execute on function public.admin_access_sessions(integer,integer) to authenticated;

create or replace function public.admin_access_facets()
returns json language sql stable security definer set search_path to 'public' as $fn$
  select case when not private.is_admin(auth.uid()) then null else json_build_object(
    'modules', (select coalesce(json_agg(distinct module), '[]'::json) from public.platform_access_log
                where module is not null and module <> '' and at > now() - interval '30 days'),
    'kinds',   (select coalesce(json_agg(distinct kind), '[]'::json) from public.platform_access_log
                where at > now() - interval '30 days')
  ) end
$fn$;
grant execute on function public.admin_access_facets() to authenticated;

-- ============================================================ 6. retention (90 days)

create or replace function public.prune_platform_access_log()
returns void language sql security definer set search_path to 'public' as $fn$
  delete from public.platform_access_log where at < now() - interval '90 days';
$fn$;

select cron.unschedule('prune-access-log') where exists (
  select 1 from cron.job where jobname = 'prune-access-log');
select cron.schedule('prune-access-log', '30 3 * * *', $cron$select public.prune_platform_access_log();$cron$);
