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

// ---- Provider hooks (implement when keys are provided) ----
async function sendSms(_to: string, _body: string): Promise<{ ok: boolean; ref?: string; error?: string }> {
  throw new Error("SMS_NOT_IMPLEMENTED"); // TODO: call SMS provider (Twilio/Gupshup/etc.)
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
  if (!["email", "sms", "whatsapp", "push"].includes(channel)) return json({ error: "Unknown channel" }, 400);
  if (!to || !text) return json({ error: "to and body are required" }, 400);

  const { data: cfg } = await svc.from("notification_config").select("*").eq("id", 1).maybeSingle();
  const activeMap: Record<string, boolean> = {
    email: cfg?.email_active ?? true, sms: cfg?.sms_active ?? false,
    whatsapp: cfg?.whatsapp_active ?? false, push: cfg?.push_active ?? false,
  };

  const log = async (status: string, provider_ref?: string, error?: string) =>
    svc.from("notification_log").insert({ channel, target: to, subject, body: text, status, provider: cfg?.[`${channel}_provider`] ?? null, provider_ref: provider_ref ?? null, error: error ?? null });

  if (!activeMap[channel]) { await log("not_configured"); return json({ status: "not_configured", channel, message: `${channel} channel is not configured yet.` }); }

  try {
    let r: { ok: boolean; ref?: string; error?: string };
    if (channel === "email") r = await sendEmail(to, subject ?? "BharatOne", text);
    else if (channel === "sms") r = await sendSms(to, text);
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
