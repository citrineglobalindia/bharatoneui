-- Public (status-board) log feed.  Applied to prod via the MCP.
--
-- The /status board is protected only by a browser-side password, so anything served
-- from these functions must be treated as fully public. Personal data is masked before
-- it leaves the database; the complete unmasked log stays behind auth in
-- Admin -> System Health (admin_health_log).
create or replace function private.mask_log(p text)
returns text language sql immutable as $$
  select
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
      coalesce(p, ''),
      '\m(\d{2})\d{6}(\d{2})\M', '\1xxxxxx\2', 'g'),          -- 10-digit mobile
      '\m\d{8}(\d{4})\M', 'XXXXXXXX\1', 'g'),                  -- 12-digit Aadhaar
      '([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+)', '\1***@\2', 'g'),
      '[A-Za-z][A-Za-z.\s]{1,60}\s\((BO\d+)\)', 'Retailer (\1)', 'g')
$$;

create or replace function public.public_health_log(
  p_limit integer default 150,
  p_module text default null,
  p_source text default null,
  p_level  text default null
)
returns table(
  at timestamptz, module_key text, module_label text,
  status text, level text, source text, message text, latency_ms integer
)
language sql stable security definer set search_path to 'public' as $$
  select l.created_at as at,
         l.module_key,
         coalesce(m.name, l.module_key) as module_label,
         l.status, l.level, l.source,
         private.mask_log(l.message) as message,
         l.latency_ms
  from public.system_health_log l
  left join public.system_modules m on m.key = l.module_key
  where (p_module is null or p_module = ''   or l.module_key = p_module)
    and (p_source is null or p_source = ''   or l.source     = p_source)
    and (p_level  is null or p_level  = ''   or l.level      = p_level)
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 150), 500));
$$;

revoke all on function public.public_health_log(integer, text, text, text) from public;
grant execute on function public.public_health_log(integer, text, text, text) to anon, authenticated;

create or replace function public.public_health_log_stats()
returns json language sql stable security definer set search_path to 'public' as $$
  select json_build_object(
    'total_24h',  count(*) filter (where created_at > now() - interval '24 hours'),
    'errors_24h', count(*) filter (where created_at > now() - interval '24 hours' and (status = 'down' or level = 'error')),
    'warns_24h',  count(*) filter (where created_at > now() - interval '24 hours' and (status = 'warn' or level = 'warn')),
    'last_event', max(created_at),
    'modules',    (select json_agg(json_build_object('key', s.module_key, 'n', s.n) order by s.n desc)
                   from (select module_key, count(*) n from public.system_health_log
                         where created_at > now() - interval '24 hours'
                         group by module_key) s)
  ) from public.system_health_log;
$$;
grant execute on function public.public_health_log_stats() to anon, authenticated;
