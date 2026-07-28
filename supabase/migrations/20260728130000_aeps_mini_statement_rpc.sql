-- Per-role AEPS commission mini-statement. Retailer and distributor see only
-- their own share; admin/accountant (is_aeps_staff) see the full split per txn.
-- Applied to prod via the MCP.
create or replace function public.aeps_mini_statement(_limit integer default 60)
returns table(
  at timestamptz, operation text, service_type int, amount numeric, status text,
  aadhaar_last4 text, ref text,
  party text, gross numeric,
  retailer_share numeric, distributor_share numeric, admin_share numeric,
  my_share numeric, scope text
)
language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  if public.is_aeps_staff() then
    return query
      select t.created_at, t.operation, t.service_type, t.amount, t.status,
             t.aadhaar_last4, coalesce(nullif(t.rrn,''), nullif(t.tid,''), t.client_ref_id),
             coalesce(nullif(trim(pr.display_name),''),
                      nullif(trim(coalesce(rr.first_name,'')||' '||coalesce(rr.surname,'')),''), 'Retailer'),
             t.commission_gross, t.merchant_commission, t.commission_distributor,
             coalesce(t.commission_company, t.admin_commission),
             null::numeric, 'full'
      from public.aeps_transactions t
      left join public.profiles pr on pr.id = t.agent_id
      left join lateral (select first_name, surname from public.retailer_registrations
                         where auth_user_id = t.agent_id order by created_at desc limit 1) rr on true
      order by t.created_at desc limit greatest(1, least(coalesce(_limit,60), 200));

  elsif public.has_role(v_uid, 'distributor') then
    return query
      select t.created_at, t.operation, t.service_type, t.amount, t.status,
             t.aadhaar_last4, coalesce(nullif(t.rrn,''), nullif(t.tid,''), t.client_ref_id),
             null::text, null::numeric, null::numeric, null::numeric, null::numeric,
             t.commission_distributor, 'distributor'
      from public.aeps_transactions t
      where t.distributor_id = v_uid and coalesce(t.commission_distributor,0) > 0
      order by t.created_at desc limit greatest(1, least(coalesce(_limit,60), 200));

  else
    return query
      select t.created_at, t.operation, t.service_type, t.amount, t.status,
             t.aadhaar_last4, coalesce(nullif(t.rrn,''), nullif(t.tid,''), t.client_ref_id),
             null::text, null::numeric, null::numeric, null::numeric, null::numeric,
             t.merchant_commission, 'retailer'
      from public.aeps_transactions t
      where t.agent_id = v_uid
      order by t.created_at desc limit greatest(1, least(coalesce(_limit,60), 200));
  end if;
end $$;
grant execute on function public.aeps_mini_statement(integer) to authenticated;
