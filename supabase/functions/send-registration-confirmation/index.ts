// BharatOne — registration confirmation email.
// Reuses Gmail SMTP (GMAIL_USER/GMAIL_APP_PASSWORD) or Resend (RESEND_API_KEY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

function htmlBody(p: Record<string, string>) {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:6px 10px;color:#6b7280;font-size:13px">${k}</td><td style="padding:6px 10px;font-weight:600;color:#111;font-size:13px">${esc(v)}</td></tr>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="height:6px;background:linear-gradient(90deg,#ff9933,#fff,#138808)"></div>
    <div style="padding:20px 24px">
      <h2 style="color:#138808;margin:0 0 4px">Application Submitted</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Dear ${esc(p.name || "Applicant")}, your ${esc(p.type || "registration")} has been received and is under review.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;margin-bottom:16px">
        <p style="margin:0;font-size:12px;color:#6b7280">YOUR REFERENCE / TRACKING ID</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:800;letter-spacing:2px;color:#065f46">${esc(p.applicationId)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row("Transaction ID", p.transactionId)}
        ${row("Service", p.plan)}
        ${row("Amount", p.amount)}
        ${row("Submitted", p.submittedAt)}
        ${row("Status", "Under Review")}
      </table>
      <p style="color:#374151;font-size:13px;margin:16px 0 0">Track your application anytime using this Reference ID at <a href="https://bharatoneui.vercel.app/track-application" style="color:#138808">Track Your Application</a>.</p>
      <p style="color:#9ca3af;font-size:12px;margin:16px 0 0">Queries? Contact us 24/7 at +91 90711 00311 or info@mybharatone.com / support@mybharatone.com.</p>
    </div>
  </div>`;
}

async function sendViaGmail(user: string, pass: string, to: string, html: string) {
  const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
  try {
    await client.send({ from: `BharatOne <${user}>`, to, subject: "BharatOne — Application Submitted (Reference ID inside)", content: "Your BharatOne application has been submitted.", html });
  } finally { await client.close(); }
}
async function sendViaResend(apiKey: string, from: string, to: string, html: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "BharatOne — Application Submitted (Reference ID inside)", html }),
  });
  if (!resp.ok) throw new Error(await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json();
    if (!p?.email || !EMAIL_RE.test(p.email)) return json({ error: "Invalid email" }, 400);
    if (!p?.applicationId) return json({ error: "applicationId required" }, 400);
    const html = htmlBody(p);
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <onboarding@resend.dev>";
    try {
      if (gmailUser && gmailPass) { await sendViaGmail(gmailUser, gmailPass, p.email, html); return json({ sent: true }); }
      if (resendKey) { await sendViaResend(resendKey, resendFrom, p.email, html); return json({ sent: true }); }
      return json({ sent: false, error: "no email provider configured" }, 200);
    } catch (e) {
      return json({ sent: false, error: String(e) }, 200);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
