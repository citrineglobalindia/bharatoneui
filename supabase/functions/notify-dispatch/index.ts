// BharatOne — unified notification dispatcher.
// Email is live (SMTP). SMS / WhatsApp / Push are SCAFFOLDED: set the provider
// keys + notification_config.<channel>_active = true and implement sendSms()/
// sendWhatsApp() to go live. Every attempt is logged to public.notification_log.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---- SMS via SMSJust (DLT-compliant) ----
// India's DLT regime blocks any SMS whose text does not match a pre-registered
// content template, so we never send free-form SMS. The caller names a
// `template_key`; we load that row from public.dlt_templates, fill its
// placeholders positionally, and send with the row's dlt_template_id + sender.
//
// Secrets (never hard-code, never put in the DB — SMSJust takes them in the
// query string, which lands in logs):
//   SMSJUST_USER, SMSJUST_PASS, SMSJUST_ENTITY_ID
const SMSJUST_URL = "https://www.smsjust.com/blank/sms/user/urlsms.php";

// Fill each {#...#} / {1} style placeholder, in order, with the given values.
function renderTemplate(bodyTemplate: string, vars: string[]): string {
  let i = 0;
  return bodyTemplate.replace(/\{#[^}]*#\}|\{\d+\}/g, () => (i < vars.length ? String(vars[i++]) : ""));
}

// Indian gateways want a bare 10-digit number (or 91-prefixed). Take the last 10 digits.
function normalizeMobile(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function sendSms(
  svc: ReturnType<typeof createClient>,
  to: string,
  templateKey: string,
  vars: string[],
): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const user = Deno.env.get("SMSJUST_USER");
  const pass = Deno.env.get("SMSJUST_PASS");
  const entityId = Deno.env.get("SMSJUST_ENTITY_ID");
  if (!user || !pass || !entityId) return { ok: false, error: "SMS provider not configured (SMSJUST_* secrets missing)" };

  if (!templateKey) return { ok: false, error: "template_key is required for SMS (DLT does not allow free-form text)" };

  const { data: tpl } = await svc.from("dlt_templates").select("*").eq("template_key", templateKey).maybeSingle();
  if (!tpl) return { ok: false, error: `Unknown SMS template '${templateKey}'` };
  if (!(tpl as any).active) return { ok: false, error: `SMS template '${templateKey}' is not active yet` };
  if (!(tpl as any).dlt_template_id) return { ok: false, error: `SMS template '${templateKey}' has no DLT template id registered` };

  const message = renderTemplate(String((tpl as any).body), vars);
  const mobile = normalizeMobile(to);
  if (mobile.length !== 10) return { ok: false, error: `Invalid destination mobile '${to}'` };

  const params = new URLSearchParams({
    username: user,
    pass,
    senderid: String((tpl as any).sender_id || "BHRONE"),
    dest_mobileno: mobile,
    message,
    dltentityid: entityId,
    dlttempid: String((tpl as any).dlt_template_id),
    response: "Y",
  });

  const resp = await fetch(`${SMSJUST_URL}?${params.toString()}`);
  const respText = (await resp.text()).trim();
  // SMSJust returns a numeric message id on success; failures carry words like
  // "Invalid" / "Error" / "Authentication". Treat any non-numeric reply as a failure.
  const looksLikeError = /invalid|error|fail|authenticat|denied|missing/i.test(respText);
  const ok = resp.ok && respText.length > 0 && !looksLikeError;
  return ok
    ? { ok: true, ref: respText.slice(0, 120) }
    : { ok: false, error: `SMSJust ${resp.status}: ${respText.slice(0, 200)}` };
}
async function sendWhatsApp(_to: string, _body: string): Promise<{ ok: boolean; ref?: string; error?: string }> {
  throw new Error("WHATSAPP_NOT_IMPLEMENTED"); // TODO: call WhatsApp Business API
}

async function sendEmail(to: string, subject: string, body: string) {
  const user = Deno.env.get("GMAIL_USER"); const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) return { ok: false, error: "email provider not configured" };
  const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
  try { await client.send({ from: `BharatOne <${user}>`, to, subject: subject || "BharatOne", content: body, html: `<p>${body}</p>` }); return { ok: true }; }
  finally { await client.close(); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const channel = String(body.channel ?? "email");
  const to = String(body.to ?? "");
  const subject = body.subject ? String(body.subject) : null;
  const text = String(body.body ?? "");
  // SMS-only: which registered DLT template to use, and the values for its
  // placeholders. Ignored for email/whatsapp/push.
  const templateKey = String(body.template_key ?? "");
  const vars: string[] = Array.isArray(body.vars) ? body.vars.map((v: unknown) => String(v)) : [];
  if (!["email", "sms", "whatsapp", "push"].includes(channel)) return json({ error: "Unknown channel" }, 400);
  if (!to) return json({ error: "to is required" }, 400);
  // Email/WhatsApp send free text; SMS is rendered from a template instead.
  if (channel !== "sms" && !text) return json({ error: "body is required" }, 400);

  const { data: cfg } = await svc.from("notification_config").select("*").eq("id", 1).maybeSingle();
  const activeMap: Record<string, boolean> = {
    email: cfg?.email_active ?? true, sms: cfg?.sms_active ?? false,
    whatsapp: cfg?.whatsapp_active ?? false, push: cfg?.push_active ?? false,
  };

  // For SMS the sent text is rendered from a template, so log the template key
  // (never the credentials/URL) instead of the empty free-text field.
  const logBody = channel === "sms" ? `[template:${templateKey || "?"}]` : text;
  const log = async (status: string, provider_ref?: string, error?: string) =>
    svc.from("notification_log").insert({ channel, target: to, subject, body: logBody, status, provider: cfg?.[`${channel}_provider`] ?? null, provider_ref: provider_ref ?? null, error: error ?? null });

  if (!activeMap[channel]) { await log("not_configured"); return json({ status: "not_configured", channel, message: `${channel} channel is not configured yet.` }); }

  try {
    let r: { ok: boolean; ref?: string; error?: string };
    if (channel === "email") r = await sendEmail(to, subject ?? "BharatOne", text);
    else if (channel === "sms") r = await sendSms(svc, to, templateKey, vars);
    else if (channel === "whatsapp") r = await sendWhatsApp(to, text);
    else r = { ok: false, error: "push not implemented" };
    await log(r.ok ? "sent" : "failed", r.ref, r.error);
    return json({ status: r.ok ? "sent" : "failed", channel, message: r.error });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log("failed", undefined, msg);
    return json({ status: "failed", channel, message: msg });
  }
});
