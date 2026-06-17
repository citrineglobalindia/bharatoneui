-- Payment verification for application transactions (accountant + admin)
alter table public.service_applications
  add column if not exists payment_verified boolean not null default false,
  add column if not exists payment_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_verified_at timestamptz;

create or replace function public.verify_application_payment(p_id uuid, p_verified boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant')) then
    raise exception 'Not authorised';
  end if;
  update public.service_applications
    set payment_verified = p_verified,
        payment_verified_by = case when p_verified then auth.uid() else null end,
        payment_verified_at = case when p_verified then now() else null end
  where id = p_id;
  return jsonb_build_object('ok', true, 'payment_verified', p_verified);
end $$;
grant execute on function public.verify_application_payment(uuid, boolean) to authenticated;
