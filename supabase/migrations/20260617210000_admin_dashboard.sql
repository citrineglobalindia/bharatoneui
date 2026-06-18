create or replace function public.admin_dashboard()
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'retailers', (select count(*) from public.user_roles where role='retailer'),
    'active_retailers', (select count(*) from public.profiles p join public.user_roles ur on ur.user_id=p.id and ur.role='retailer' where p.is_active),
    'applications', (select count(*) from public.service_applications),
    'approved', (select count(*) from public.service_applications where status in ('approved','completed')),
    'pending_apps', (select count(*) from public.service_applications where status in ('submitted','in_progress')),
    'gross_total', (select coalesce(sum(service_charge),0) from public.service_applications),
    'gross_today', (select coalesce(sum(service_charge),0) from public.service_applications where created_at::date = now()::date),
    'wallet_pool', (select coalesce(sum(balance),0) from public.wallets),
    'kyc_pending', (select count(*) from public.retailer_registrations where status in ('accountant_review','qc_review')),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open','in_progress')),
    'service_dist', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select coalesce(category_name,'Other') as name, count(*) as value from public.service_applications group by category_name order by count(*) desc limit 6) x),
    'recent', (select coalesce(jsonb_agg(r), '[]'::jsonb) from (select application_no, service_name, submitter_name, service_charge, status, created_at from public.service_applications order by created_at desc limit 8) r)
  );
$$;
grant execute on function public.admin_dashboard() to authenticated;
select 'admin_dashboard OK' as status;
