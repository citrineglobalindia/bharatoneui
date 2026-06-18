-- retailer → distributor mapping
alter table public.profiles add column if not exists distributor_id uuid references auth.users(id) on delete set null;

-- per-role commission amounts captured on each application
alter table public.service_applications
  add column if not exists distributor_id uuid references auth.users(id) on delete set null,
  add column if not exists company_commission_amount numeric(12,2) not null default 0,
  add column if not exists distributor_commission_amount numeric(12,2) not null default 0,
  add column if not exists dro_commission_amount numeric(12,2) not null default 0,
  add column if not exists tro_commission_amount numeric(12,2) not null default 0;

-- distributor can read applications by their retailers
drop policy if exists app_select on public.service_applications;
create policy app_select on public.service_applications for select to authenticated
  using (submitted_by = auth.uid() or assigned_operator = auth.uid()
    or distributor_id = auth.uid()
    or private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')
    or public.has_role(auth.uid(),'qc') or public.has_role(auth.uid(),'telecaller'));

-- admin assigns a retailer to a distributor
create or replace function public.set_retailer_distributor(p_retailer uuid, p_distributor uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorised'; end if;
  update public.profiles set distributor_id = p_distributor where id = p_retailer;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_retailer_distributor(uuid,uuid) to authenticated;

-- distributor: their retailers
create or replace function public.distributor_retailers()
returns table(id uuid, name text, email text, is_active boolean, created_at timestamptz, wallet numeric)
language sql security definer set search_path=public as $$
  select p.id, coalesce(p.display_name, u.email), u.email, p.is_active, u.created_at, coalesce(w.balance,0)
  from public.profiles p join auth.users u on u.id=p.id
  left join public.wallets w on w.user_id=p.id
  where p.distributor_id = auth.uid()
  order by u.created_at desc;
$$;
grant execute on function public.distributor_retailers() to authenticated;

-- distributor: commission earnings rows
create or replace function public.distributor_commissions()
returns table(application_no text, retailer_name text, service_name text, category_name text, amount numeric, status text, created_at timestamptz, earned boolean)
language sql security definer set search_path=public as $$
  select sa.application_no, sa.submitter_name, sa.service_name, sa.category_name,
    sa.distributor_commission_amount, sa.status, sa.created_at,
    (sa.status in ('approved','completed'))
  from public.service_applications sa
  where sa.distributor_id = auth.uid()
  order by sa.created_at desc;
$$;
grant execute on function public.distributor_commissions() to authenticated;

-- distributor dashboard summary
create or replace function public.distributor_dashboard()
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'retailers', (select count(*) from public.profiles where distributor_id = auth.uid()),
    'active_retailers', (select count(*) from public.profiles where distributor_id = auth.uid() and is_active),
    'applications', (select count(*) from public.service_applications where distributor_id = auth.uid()),
    'earned', (select coalesce(sum(distributor_commission_amount),0) from public.service_applications where distributor_id = auth.uid() and status in ('approved','completed')),
    'pending', (select coalesce(sum(distributor_commission_amount),0) from public.service_applications where distributor_id = auth.uid() and status not in ('approved','completed','rejected')),
    'wallet', (select coalesce(balance,0) from public.wallets where user_id = auth.uid())
  );
$$;
grant execute on function public.distributor_dashboard() to authenticated;
select 'distributor schema OK' as status;
