alter table public.retailer_registrations add column if not exists doc_reviews jsonb not null default '{}'::jsonb;

create or replace function public.set_document_status(reg_id uuid, doc_key text, status text, notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v jsonb;
begin
  if not (private.is_admin(auth.uid()) or public.has_role(auth.uid(),'accountant') or public.has_role(auth.uid(),'qc')) then
    raise exception 'Not authorised'; end if;
  if status not in ('pending','approved','rejected') then raise exception 'invalid status'; end if;
  update public.retailer_registrations
    set doc_reviews = coalesce(doc_reviews,'{}'::jsonb)
      || jsonb_build_object(doc_key, jsonb_build_object('status',status,'notes',notes,'by',auth.uid(),'at',now()))
  where id = reg_id returning doc_reviews into v;
  if v is null then raise exception 'Registration not found'; end if;
  return v;
end; $fn$;
revoke all on function public.set_document_status(uuid,text,text,text) from public;
grant execute on function public.set_document_status(uuid,text,text,text) to authenticated;
