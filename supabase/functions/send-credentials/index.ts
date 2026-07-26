// BharatOne — send-credentials: emails approved retailer their login + link (Brevo primary, Gmail fallback)
// and sends the DLT 'kyc_approved' SMS when the caller flags an approval (not a password resend).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

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

// Fire the KYC-approved SMS through the unified dispatcher (DLT-compliant).
// Best-effort: an SMS failure must never break the credentials email.
function normMobile(raw: string): string { const d = String(raw ?? "").replace(/\D/g, ""); return d.length > 10 ? d.slice(-10) : d; }
async function sendApprovedSms(name: string, mobile: string): Promise<{ ok: boolean; detail?: string }> {
  const m = normMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(m)) return { ok: false, detail: "no valid mobile" };
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const r = await fetch(`${url}/functions/v1/notify-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ channel: "sms", to: m, template_key: "kyc_approved", vars: [name || "Customer"] }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: (j as { status?: string })?.status === "sent", detail: (j as { message?: string })?.message };
  } catch (e) { return { ok: false, detail: String(e) }; }
}

function html(name: string, username: string, password: string, email: string, loginUrl: string) {
  return `<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden\">
    <div style=\"background:linear-gradient(135deg,#ff9123,#138808);padding:20px 24px;color:#fff\">
      <h2 style=\"margin:0\">BharatOne</h2><p style=\"margin:4px 0 0;font-size:13px;opacity:.9\">For Serving Indian Citizens</p>
    </div>
    <div style=\"padding:24px\">
      <p>Dear ${name || "Retailer"},</p>
      <p>Congratulations! Your BharatOne retailer registration has been <b style=\"color:#138808\">approved</b>. Your account is now active. Use the credentials below to log in:</p>
      <table style=\"width:100%;border-collapse:collapse;margin:16px 0\">
        <tr><td style=\"padding:8px 12px;background:#f6f7f6;font-weight:bold;width:130px\">Login ID (JSKO ID)</td><td style=\"padding:8px 12px;background:#f6f7f6\">${username}</td></tr>
        <tr><td style=\"padding:8px 12px;font-weight:bold\">Email / Login</td><td style=\"padding:8px 12px\">${email}</td></tr>
        <tr><td style=\"padding:8px 12px;background:#f6f7f6;font-weight:bold\">Password</td><td style=\"padding:8px 12px;background:#f6f7f6;font-family:monospace;font-size:15px\"><b>${password}</b></td></tr>
      </table>
      <p style=\"text-align:center;margin:22px 0\">
        <a href=\"${loginUrl}\" style=\"background:#138808;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block\">Log in to BharatOne</a>
      </p>
      <p style=\"font-size:13px;color:#666\">For your security, please change your password after first login. If the button doesn&#39;t work, open this link: <br><a href=\"${loginUrl}\">${loginUrl}</a></p>
      <p style=\"font-size:12px;color:#999;margin-top:20px\">If you didn&#39;t expect this email, please contact BharatOne support.</p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, name, username, password, loginUrl, mobile, smsApproved } = await req.json();
    if (!email || !password) return json({ error: "email and password required" }, 400);
    const url = loginUrl || "https://bharatoneui.vercel.app/login";
    const subject = "Your BharatOne account is approved — login details inside";
    const body = html(name, username, password, email, url);

    // KYC-approved SMS (only when the caller flags an approval, not a resend).
    const sms = (smsApproved && mobile) ? await sendApprovedSms(String(name || ""), String(mobile)) : { ok: false, detail: "skipped" };

    // 1) Brevo (primary)
    if (await sendBrevo(email, subject, body)) return json({ sent: true, via: "brevo", sms });

    // 2) Gmail SMTP (fallback)
    const user = Deno.env.get("GMAIL_USER");
    const pass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (user && pass) {
      try {
        const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
        try { await client.send({ from: `BharatOne <${user}>`, to: email, subject, content: `Login ID: ${username}, Email: ${email}, Password: ${password}. Login at ${url}`, html: body }); }
        finally { await client.close(); }
        return json({ sent: true, via: "gmail", sms });
      } catch (e) { return json({ error: "email send failed: " + String(e), sms }, 502); }
    }
    return json({ error: "email provider not configured", sms }, 502);
  } catch (e) { return json({ error: String(e) }, 500); }
});
