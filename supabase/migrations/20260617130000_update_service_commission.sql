create or replace function public.update_service_commission(
  p_id uuid, p_company numeric, p_distributor numeric, p_dro numeric, p_tro numeric, p_retailer numeric, p_charge numeric default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_total numeric;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then raise exception 'Not authorised'; end if;
  v_total := coalesce(p_company,0)+coalesce(p_distributor,0)+coalesce(p_dro,0)+coalesce(p_tro,0)+coalesce(p_retailer,0);
  if round(v_total,2) <> 100 then raise exception 'COMMISSION_NOT_100'; end if;
  update public.services set
    company_commission=p_company, distributor_commission=p_distributor, dro_commission=p_dro,
    tro_commission=p_tro, retailer_commission=p_retailer,
    service_charge=coalesce(p_charge, service_charge), updated_at=now()
  where id=p_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.update_service_commission(uuid,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
