// BharatOne — send-doc-request: emails retailer a re-upload link (Brevo primary, Gmail fallback)
// and also sends the DLT 'kyc_rejected' SMS (reason = the QC note) when a mobile is provided.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const FROM_RAW = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <noreply@mybharatone.com>";
function parseFrom(raw: string) { const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/); return m ? { name: m[1] || "BharatOne", email: m[2] } : { name: "BharatOne", email: raw.trim() }; }
async function sendBrevo(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!BREVO_API_KEY) return false;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: parseFrom(FROM_RAW), to: [{ email: to }], subject, htmlContent }) });
    return r.ok;
  } catch { return false; }
}

// Fire the KYC-rejected SMS through the unified dispatcher (DLT-compliant).
// Non-blocking: never let an SMS failure break the email response.
/**
 * First usable Indian mobile number in the field.
 *
 * Some migrated records hold two numbers in one column —
 * "8105879469, 6360142851". Stripping every non-digit ran them together into
 * one 20-digit string, and taking the last ten then texted the SECOND number
 * without anyone realising the first had been passed over. Split on the
 * separators first, and take the first number that is actually a mobile.
 */
function normMobile(raw: string): string {
  const parts = String(raw ?? "").split(/[,;/]+/);
  for (const p of parts) {
    const d = p.replace(/\D/g, "");
    const ten = d.length > 10 ? d.slice(-10) : d;
    if (/^[6-9]\d{9}$/.test(ten)) return ten;
  }
  const all = String(raw ?? "").replace(/\D/g, "");
  return all.length > 10 ? all.slice(-10) : all;
}
async function sendKycSms(name: string, mobile: string, reason: string): Promise<{ ok: boolean; detail?: string }> {
  const m = normMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(m)) return { ok: false, detail: "no valid mobile" };
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const r = await fetch(`${url}/functions/v1/notify-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ channel: "sms", to: m, template_key: "kyc_rejected", vars: [name || "Customer", reason || "Documents not valid"] }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: (j as { status?: string })?.status === "sent", detail: (j as { message?: string })?.message };
  } catch (e) { return { ok: false, detail: String(e) }; }
}

function html(name: string, link: string, docs: string[], note: string) {
  const items = docs.map((d) => `<li style=\"margin:2px 0\">${d}</li>`).join("");
  return `<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:auto\">
    <h2 style=\"color:#d35400\">BharatOne — Document Re-upload Requested</h2>
    <p>Dear ${name || "Applicant"},</p>
    <p>Our verification team has reviewed your registration and needs you to re-upload the following document(s):</p>
    <ul>${items}</ul>
    ${note ? `<p style=\"background:#fff7ed;border:1px solid #fed7aa;padding:8px 10px;border-radius:8px;color:#9a3412\"><b>Note:</b> ${note}</p>` : ""}
    <p style=\"margin:18px 0\"><a href=\"${link}\" style=\"background:#138808;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold;display:inline-block\">Upload Documents</a></p>
    <p style=\"color:#666;font-size:13px\">Or open this link: <a href=\"${link}\">${link}</a></p>
    <p style=\"color:#666;font-size:12px\">After you upload, your application is sent back for approval automatically.</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, name, link, docs, note, mobile, reason } = await req.json();
    if (!email || !EMAIL_RE.test(email)) return json({ error: "Invalid email" }, 400);
    if (!link) return json({ error: "Missing link" }, 400);
    const list: string[] = Array.isArray(docs) ? docs : [];
    const subject = "Action needed: re-upload your KYC document(s) — BharatOne";
    const body = html(name, link, list, note || "");

    // SMS the applicant the KYC-rejected reason (best effort, alongside email).
    const smsReason = String(reason || note || "Documents not valid");
    const sms = mobile ? await sendKycSms(String(name || ""), String(mobile), smsReason) : { ok: false, detail: "no mobile" };

    if (await sendBrevo(email, subject, body)) return json({ sent: true, via: "brevo", sms });

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (gmailUser && gmailPass) {
      try {
        const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } } });
        try { await client.send({ from: `BharatOne <${gmailUser}>`, to: email, subject, content: `Please re-upload: ${list.join(", ")}. Link: ${link}`, html: body }); }
        finally { await client.close(); }
        return json({ sent: true, via: "gmail", sms });
      } catch (e) { return json({ error: "email send failed: " + String(e), sms }, 502); }
    }
    return json({ sent: false, dev: true, link, sms }, 200);
  } catch (e) { return json({ error: String(e) }, 500); }
});
