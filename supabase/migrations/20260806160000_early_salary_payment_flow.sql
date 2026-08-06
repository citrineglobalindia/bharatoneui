-- Early salary: HR approval hands the request to the accountant for payment,
-- and the accountant's reply is tracked on the request itself.
-- Full definitions as applied to prod (migration early_salary_payment_flow).
--   pending -> (HR approves) awaiting_payment -> (accountant pays) paid
--           -> (HR rejects)  rejected
-- Resignations keep the original pending -> approved/rejected.
-- See the Supabase migration history for the canonical body; this file mirrors it.

alter table public.hr_staff_requests drop constraint if exists hr_staff_requests_status_check;
alter table public.hr_staff_requests
  add constraint hr_staff_requests_status_check
  check (status in ('pending','approved','rejected','withdrawn','awaiting_payment','paid'));

alter table public.hr_staff_requests
  add column if not exists paid_by uuid references auth.users(id) on delete set null,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_reference text,
  add column if not exists payment_note text;

drop policy if exists hsr_accountant_sel on public.hr_staff_requests;
create policy hsr_accountant_sel on public.hr_staff_requests for select to authenticated
  using (kind = 'early_salary' and public.has_role(auth.uid(), 'accountant'));

create or replace function public.hr_decide_staff_request(p_id uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r public.hr_staff_requests%rowtype;
  v_name text;
  v_next text;
begin
  if not private.is_hr(auth.uid()) then
    raise exception 'Only HR can decide staff requests';
  end if;

  select * into r from public.hr_staff_requests where id = p_id;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'This request has already been %', r.status; end if;

  v_next := case
    when not p_approve then 'rejected'
    when r.kind = 'early_salary' then 'awaiting_payment'
    else 'approved'
  end;

  update public.hr_staff_requests
     set status = v_next,
         decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(coalesce(p_note,'')), '')
   where id = p_id;

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'hr',
          case r.kind when 'resignation' then 'Resignation ' else 'Early salary request ' end
            || case when not p_approve then 'rejected'
                    when r.kind = 'early_salary' then 'approved — sent to accounts for payment'
                    else 'approved' end,
          coalesce(nullif(btrim(coalesce(p_note,'')),''), 'Decision recorded by HR.'),
          '/hr/my-hr', 'hr_request', r.id::text);

  if v_next = 'awaiting_payment' then
    select coalesce(display_name, 'Staff member') into v_name from public.profiles where id = r.user_id;
    perform public.notify_roles(array['accountant','admin'], 'hr',
      'Early salary approved — payment due',
      v_name || ': ₹' || coalesce(r.amount::text, '?') ||
        coalesce(' needed by ' || to_char(r.needed_by, 'DD Mon'), ''),
      '/accountant/salary-requests', 'hr_request', r.id::text);
  end if;

  return jsonb_build_object('ok', true, 'status', v_next);
end;
$$;

create or replace function public.accountant_pay_staff_request(p_id uuid, p_reference text default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r public.hr_staff_requests%rowtype;
  v_payer text;
begin
  if not (public.has_role(auth.uid(), 'accountant') or private.is_admin(auth.uid())) then
    raise exception 'Only an accountant can record the payment';
  end if;

  select * into r from public.hr_staff_requests where id = p_id;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.kind <> 'early_salary' then raise exception 'Only early salary requests are paid out here'; end if;
  if r.status <> 'awaiting_payment' then raise exception 'This request is %, not awaiting payment', r.status; end if;

  update public.hr_staff_requests
     set status = 'paid',
         paid_by = auth.uid(), paid_at = now(),
         payment_reference = nullif(btrim(coalesce(p_reference,'')), ''),
         payment_note = nullif(btrim(coalesce(p_note,'')), '')
   where id = p_id;

  select coalesce(display_name, 'Accounts') into v_payer from public.profiles where id = auth.uid();

  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (r.user_id, 'hr', 'Early salary paid',
          '₹' || coalesce(r.amount::text,'?')
            || coalesce(' · ref ' || nullif(btrim(coalesce(p_reference,'')),''), '')
            || coalesce(' · ' || nullif(btrim(coalesce(p_note,'')),''), ''),
          '/hr/my-hr', 'hr_request', r.id::text);
  perform public.notify_roles(array['hr_staff'], 'hr',
    'Early salary paid by accounts',
    v_payer || ' paid ₹' || coalesce(r.amount::text,'?')
      || coalesce(' (ref ' || nullif(btrim(coalesce(p_reference,'')),'') || ')', ''),
    '/hr/requests', 'hr_request', r.id::text);

  return jsonb_build_object('ok', true, 'status', 'paid');
end;
$$;

revoke all on function public.accountant_pay_staff_request(uuid, text, text) from public, anon;
grant execute on function public.accountant_pay_staff_request(uuid, text, text) to authenticated;
