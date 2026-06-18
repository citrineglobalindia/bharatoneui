-- Old JSKO IDs manageable by admin AND qc
drop policy if exists jsko_admin on public.jsko_legacy_accounts;
drop policy if exists jsko_manage on public.jsko_legacy_accounts;
create policy jsko_manage on public.jsko_legacy_accounts for all to authenticated
  using (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc'))
  with check (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc'));
