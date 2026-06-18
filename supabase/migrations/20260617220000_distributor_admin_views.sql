-- Admin: list distributors with network stats
create or replace function public.admin_distributors()
returns table(id uuid, name text, email text, is_active boolean, retailers bigint, applications bigint, commission numeric, wallet numeric)
language sql security definer set search_path=public as $$
  select d.id, coalesce(p.display_name, u.email), u.email, p.is_active,
    (select count(*) from public.profiles r where r.distributor_id = d.id),
    (select count(*) from public.service_applications sa where sa.distributor_id = d.id),
    (select coalesce(sum(distributor_commission_amount),0) from public.service_applications sa where sa.distributor_id = d.id and sa.status in ('approved','completed')),
    coalesce(w.balance,0)
  from public.user_roles d
  join auth.users u on u.id = d.user_id
  left join public.profiles p on p.id = d.user_id
  left join public.wallets w on w.user_id = d.user_id
  where d.role = 'distributor'
  order by coalesce(p.display_name, u.email);
$$;
grant execute on function public.admin_distributors() to authenticated;

-- guarded: only admin
create or replace function public.admin_distributor_retailers(p_distributor uuid)
returns table(id uuid, name text, email text, is_active boolean, applications bigint, wallet numeric, created_at timestamptz)
language sql security definer set search_path=public as $$
  select r.id, coalesce(pr.display_name, ru.email), ru.email, pr.is_active,
    (select count(*) from public.service_applications sa where sa.submitted_by = r.id),
    coalesce(w.balance,0), ru.created_at
  from public.profiles r join auth.users ru on ru.id = r.id
  left join public.profiles pr on pr.id = r.id
  left join public.wallets w on w.user_id = r.id
  where r.distributor_id = p_distributor and private.is_admin(auth.uid())
  order by ru.created_at desc;
$$;
grant execute on function public.admin_distributor_retailers(uuid) to authenticated;

create or replace function public.admin_distributor_applications(p_distributor uuid)
returns table(application_no text, retailer_name text, service_name text, category_name text, service_charge numeric, distributor_commission_amount numeric, status text, created_at timestamptz)
language sql security definer set search_path=public as $$
  select sa.application_no, sa.submitter_name, sa.service_name, sa.category_name, sa.service_charge, sa.distributor_commission_amount, sa.status, sa.created_at
  from public.service_applications sa
  where sa.distributor_id = p_distributor and private.is_admin(auth.uid())
  order by sa.created_at desc;
$$;
grant execute on function public.admin_distributor_applications(uuid) to authenticated;

-- Distributor: full applications by their retailers
create or replace function public.distributor_applications()
returns table(application_no text, retailer_name text, service_name text, category_name text, service_charge numeric, commission_price numeric, distributor_commission_amount numeric, status text, payment_verified boolean, created_at timestamptz)
language sql security definer set search_path=public as $$
  select sa.application_no, sa.submitter_name, sa.service_name, sa.category_name, sa.service_charge, sa.commission_price, sa.distributor_commission_amount, sa.status, sa.payment_verified, sa.created_at
  from public.service_applications sa
  where sa.distributor_id = auth.uid()
  order by sa.created_at desc;
$$;
grant execute on function public.distributor_applications() to authenticated;
select 'distributor admin RPCs OK' as status;
