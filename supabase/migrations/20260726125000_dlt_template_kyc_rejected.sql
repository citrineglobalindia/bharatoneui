-- DLT-registered SMS for KYC rejection / document re-upload request.
-- Two variables, in order: [1] customer name, [2] reason. Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'kyc_rejected',
  'KYC verification rejected / documents re-upload request',
  'BHRONE',
  '1177178426671971584',
  E'Dear {#var#},\nYour KYC verification has been rejected.\nReason: {#var#}\nPlease upload valid documents.\nTeam BharatOne',
  2,
  true
)
on conflict (template_key) do update set
  dlt_template_id = excluded.dlt_template_id,
  sender_id = excluded.sender_id,
  body = excluded.body,
  var_count = excluded.var_count,
  description = excluded.description,
  active = true,
  updated_at = now();
