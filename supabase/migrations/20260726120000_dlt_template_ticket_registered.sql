-- DLT-registered SMS content for the support/complaint acknowledgement.
-- Two variables, in order: [1] customer name, [2] ticket number.
-- notify-dispatch renders {#var#} placeholders positionally. Applied to prod via the MCP.
insert into public.dlt_templates (template_key, description, sender_id, dlt_template_id, body, var_count, active)
values (
  'ticket_registered',
  'Support complaint/ticket registration acknowledgement',
  'BHRONE',
  '1177178426704934862',
  E'Dear {#var#},\nYour complaint has been registered.\nTicket No: {#var#}\nWe will resolve it shortly.\nTeam BharatOne',
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
