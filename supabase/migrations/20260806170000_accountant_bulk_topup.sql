-- Bulk wallet top-up, OTP-confirmed, all-or-nothing.
--
-- The accountant uploads a CSV of jsko_id + amount, reviews balances, and
-- confirms with a one-time password sent to their own email. The OTP is
-- verified HERE, inside the function — verifying it client-side and then
-- calling an unprotected batch RPC would let anyone with the accountant role
-- skip the second factor entirely.
--
-- Every row runs through accountant_topup_wallet, the same function behind the
-- single Direct top-up: company account debited, wallet ledger written,
-- wallet_topups row recorded, retailer notified. Bulk is a loop over the
-- audited path, not a new money path.
--
-- All-or-nothing on purpose: a bulk file is one action. If row 37 fails, the
-- whole batch rolls back and the accountant fixes the file — nobody has to
-- untangle a half-applied upload.
create or replace function public.accountant_bulk_topup(p_rows jsonb, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_email text;
  v_otp   public.registration_otps;
  v_row   jsonb;
  v_user  uuid;
  v_amt   numeric;
  v_note  text;
  v_res   jsonb;
  v_out   jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_n     int := 0;
begin
  if not (public.has_role(auth.uid(), 'accountant') or private.is_admin(auth.uid())) then
    raise exception 'Not authorised';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'No rows to process';
  end if;
  if jsonb_array_length(p_rows) > 200 then
    raise exception 'A batch is limited to 200 rows — split the file';
  end if;

  -- The OTP was sent to the CALLER's login email; verify it against the same
  -- table and rules the registration OTP uses (bcrypt hash, 5 attempts,
  -- expiry), and burn it on success so it cannot confirm a second batch.
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_otp from public.registration_otps
   where lower(target) = v_email and channel = 'email' and verified = false and expires_at > now()
   order by created_at desc limit 1;

  if v_otp.id is null then
    raise exception 'OTP expired — request a new one';
  end if;
  if v_otp.attempts >= 5 then
    raise exception 'Too many wrong attempts — request a new OTP';
  end if;
  if extensions.crypt(coalesce(p_code,''), v_otp.code_hash) <> v_otp.code_hash then
    update public.registration_otps set attempts = attempts + 1 where id = v_otp.id;
    raise exception 'Incorrect OTP';
  end if;
  update public.registration_otps set verified = true where id = v_otp.id;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_user := (v_row->>'user_id')::uuid;
    v_amt  := (v_row->>'amount')::numeric;
    v_note := nullif(btrim(coalesce(v_row->>'note','')), '');
    if v_user is null or v_amt is null or v_amt <= 0 then
      raise exception 'Row %: missing retailer or invalid amount', v_n + 1;
    end if;
    begin
      v_res := public.accountant_topup_wallet(v_user, v_amt,
                 coalesce('Bulk top-up' || case when v_note is not null then ': ' || v_note else '' end, 'Bulk top-up'));
    exception when others then
      raise exception 'Row % failed (%): %', v_n + 1, v_user, sqlerrm;
    end;
    v_n := v_n + 1;
    v_total := v_total + v_amt;
    v_out := v_out || jsonb_build_array(jsonb_build_object('user_id', v_user, 'amount', v_amt, 'balance', v_res->'balance'));
  end loop;

  return jsonb_build_object('ok', true, 'count', v_n, 'total', v_total, 'results', v_out);
end;
$$;

revoke all on function public.accountant_bulk_topup(jsonb, text) from public, anon;
grant execute on function public.accountant_bulk_topup(jsonb, text) to authenticated;
