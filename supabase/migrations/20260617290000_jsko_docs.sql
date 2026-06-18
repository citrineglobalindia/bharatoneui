alter table public.jsko_legacy_accounts
  add column if not exists pan_doc_path text, add column if not exists aadhaar_doc_path text,
  add column if not exists selfie_path text, add column if not exists shop_photo_path text,
  add column if not exists police_verification_path text, add column if not exists video_kyc_path text;
insert into storage.buckets (id, name, public, file_size_limit) values ('jsko-docs','jsko-docs',false,52428800) on conflict (id) do update set file_size_limit=52428800;
drop policy if exists jd_insert on storage.objects;
create policy jd_insert on storage.objects for insert to authenticated with check (bucket_id='jsko-docs' and (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')));
drop policy if exists jd_update on storage.objects;
create policy jd_update on storage.objects for update to authenticated using (bucket_id='jsko-docs' and (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'qc')));
drop policy if exists jd_select on storage.objects;
create policy jd_select on storage.objects for select to authenticated using (bucket_id='jsko-docs');
