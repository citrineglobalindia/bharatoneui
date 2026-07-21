-- Resolve display names for any set of users (staff or retailers) for
-- back-office screens. Accessible to admin/accountant/qc/operator.
-- Applied via Supabase MCP on 2026-07-21; kept here for traceability.
create or replace function public.staff_user_names(_ids uuid[])
returns table (id uuid, name text)
language sql security definer set search_path = public as $$
  select u.id,
         coalesce(
           nullif(btrim(p.display_name), ''),
           nullif(btrim(concat_ws(' ', rr.first_name, rr.middle_name, rr.surname)), ''),
           u.email
         ) as name
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join lateral (
    select r.first_name, r.middle_name, r.surname from public.retailer_registrations r
    where r.auth_user_id = u.id order by r.created_at desc limit 1
  ) rr on true
  where u.id = any(_ids)
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text in ('admin','accountant','qc','operator'));
$$;
