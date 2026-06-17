alter table public.wallet_topups
  add column if not exists txn_date date,
  add column if not exists receipt_path text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('wallet-receipts','wallet-receipts',false,52428800)
on conflict (id) do update set file_size_limit=52428800;
drop policy if exists wr_insert on storage.objects;
create policy wr_insert on storage.objects for insert to authenticated with check (bucket_id='wallet-receipts');
drop policy if exists wr_select on storage.objects;
create policy wr_select on storage.objects for select to authenticated using (bucket_id='wallet-receipts');

create or replace function public.request_wallet_topup(p_amount numeric, p_method text, p_reference text, p_txn_date date default null, p_receipt_path text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  insert into public.wallet_topups(user_id, amount, method, reference, txn_date, receipt_path)
    values (auth.uid(), p_amount, p_method, p_reference, p_txn_date, p_receipt_path) returning id into v_id;
  select coalesce(display_name,'Retailer') into v_name from public.profiles where id=auth.uid();
  perform public.notify_roles(array['accountant','admin'],'wallet','New wallet top-up request',
    coalesce(v_name,'Retailer')||' requested '||to_char(p_amount,'FM999999990')||' via '||coalesce(p_method,'-'),
    '/accountant/wallet-requests','topup', v_id::text);
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;
grant execute on function public.request_wallet_topup(numeric,text,text,date,text) to authenticated;
select 'topup form fields OK' as status;
