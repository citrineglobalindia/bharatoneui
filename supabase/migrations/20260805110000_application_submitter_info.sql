-- The operator screen has called application_submitter_info since it was built.
-- The function was never created, so the call always errored and the code fell
-- through to reading retailer_registrations directly — which operator RLS
-- blocks. That is why "Submitted From" showed JSKO ID "—" and Contact Number
-- "—" on every application, while the JSKO Name (which comes off the
-- application row itself) filled in fine.
create or replace function public.application_submitter_info(p_app uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_by   uuid;
  v_name text;
  v_out  jsonb;
begin
  -- Same staff gate as application_submitters. An operator may look up the
  -- retailer behind an application; nobody else may.
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role::text in ('operator','admin','accountant','qc','telecaller','manager')
  ) then
    raise exception 'NOT_STAFF';
  end if;

  select sa.submitted_by, sa.submitter_name
    into v_by, v_name
  from public.service_applications sa
  where sa.id = p_app;

  if v_by is null then
    return jsonb_build_object('jsko_id', null, 'name', v_name, 'phone', null, 'has_registration', false);
  end if;

  select jsonb_build_object(
           -- jsko_id is the real identifier; username and application_id are
           -- fallbacks for retailers approved before jsko_id was introduced.
           'jsko_id', coalesce(nullif(rr.jsko_id, ''), nullif(rr.username, ''), rr.application_id),
           'name',    coalesce(nullif(v_name, ''), p.display_name),
           -- The registration mobile is the number on file for the shop; the
           -- profile phone is what they log in and are reached on. Either will
           -- do, and one is far better than the dash that was showing.
           'phone',   coalesce(nullif(rr.mobile, ''), nullif(p.phone, '')),
           'has_registration', rr.id is not null
         )
    into v_out
  from public.profiles p
  left join lateral (
    select * from public.retailer_registrations r
    where r.auth_user_id = v_by
    order by r.created_at desc
    limit 1
  ) rr on true
  where p.id = v_by;

  -- A retailer account with no profile row at all still gets a usable answer.
  return coalesce(v_out, jsonb_build_object('jsko_id', null, 'name', v_name, 'phone', null, 'has_registration', false));
end;
$$;

revoke all on function public.application_submitter_info(uuid) from public, anon;
grant execute on function public.application_submitter_info(uuid) to authenticated;
