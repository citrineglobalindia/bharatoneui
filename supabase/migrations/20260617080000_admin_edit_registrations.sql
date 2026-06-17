-- Admin can edit any registration field
drop policy if exists rr_admin_update on public.retailer_registrations;
create policy rr_admin_update on public.retailer_registrations for update to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
