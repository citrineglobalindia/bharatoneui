-- =====================================================================
-- Service Catalog — inspect & correct category "kind" (frontend/backend)
-- Run in Supabase Dashboard -> SQL Editor.
--
-- Background: the Admin UI already shows Frontend list = kind 'frontend'
-- and Backend list = kind 'backend'. A category only appears in the wrong
-- module if its `kind` value is wrong in the data. Use this to see and fix it.
-- =====================================================================

-- 1) See how every category is currently tagged:
select id, name, kind, is_active
from public.service_categories
order by kind, name;

-- 2) Any categories with a missing/unknown kind? (these would show in NEITHER list)
--    Fix them by setting the correct kind below.
select id, name, kind
from public.service_categories
where kind is null or kind not in ('frontend','backend');

-- 3) RE-TAG: move specific categories to BACKEND (edit the name list).
--    Only run for categories that should be backend.
-- update public.service_categories
--   set kind = 'backend'
-- where name in ('Nadakacheri Applications', 'GENERAL GOVERNMENT APPLICATIONS');

-- 4) RE-TAG: move specific categories to FRONTEND (edit the name list).
-- update public.service_categories
--   set kind = 'frontend'
-- where name in ('BANKING SERVICES', 'Loans');

-- 5) Verify after re-tagging:
-- select kind, count(*), string_agg(name, ', ' order by name) as names
-- from public.service_categories group by kind order by kind;
