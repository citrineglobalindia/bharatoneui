-- DLT-registered SMS for KYC approval. One variable: [1] customer name.
-- Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'kyc_approved',
  'KYC verification approved',
  'BHRONE',
  '1177178426658680927',
  E'Dear {#var#},\nCongratulations!\nYour KYC verification has been approved.\nYou can now access all BharatOne services.\nTeam BharatOne',
  1,
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
