-- Operator return attachments on service applications
alter table public.service_applications
  add column if not exists result_doc_path text,
  add column if not exists result_note text,
  add column if not exists result_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit)
values ('service-attachments', 'service-attachments', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800;

drop policy if exists sa_insert on storage.objects;
create policy sa_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'service-attachments' and (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'operator')));
drop policy if exists sa_update on storage.objects;
create policy sa_update on storage.objects for update to authenticated
  using (bucket_id = 'service-attachments' and (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'operator')));
drop policy if exists sa_select on storage.objects;
create policy sa_select on storage.objects for select to authenticated
  using (bucket_id = 'service-attachments');
