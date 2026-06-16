// BharatOne — send-otp edge function (email OTP)
// Primary: Gmail SMTP (sends to ANY inbox, no domain needed).
//   Secrets: GMAIL_USER, GMAIL_APP_PASSWORD
// Fallback: Resend (if RESEND_API_KEY set and Gmail not configured).
// Dev fallback: if no email path can deliver and OTP_DEV_MODE !== "false",
//   returns { sent:true, dev:true, dev_code } so the code shows on screen.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
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

function htmlBody(code: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#d35400">BharatOne — Email Verification</h2>
    <p>Use the one-time code below to verify your email during registration:</p>
    <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#111">${code}</p>
    <p style="color:#666">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
  </div>`;
}

async function sendViaGmail(user: string, pass: string, to: string, code: string) {
  const client = new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } },
  });
  try {
    await client.send({
      from: `BharatOne <${user}>`,
      to,
      subject: `Your BharatOne verification code: ${code}`,
      content: `Your BharatOne verification code is ${code}. It expires in 10 minutes.`,
      html: htmlBody(code),
    });
  } finally {
    await client.close();
  }
}

async function sendViaResend(apiKey: string, from: string, to: string, code: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `Your BharatOne verification code: ${code}`, html: htmlBody(code) }),
  });
  if (!resp.ok) throw new Error(await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { channel, target } = await req.json();
    if (channel !== "email") return json({ error: "Only email OTP is supported" }, 400);
    if (!target || !EMAIL_RE.test(target)) return json({ error: "Invalid email address" }, 400);

    const strict = Deno.env.get("OTP_DEV_MODE") === "false";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: code, error } = await supabase.rpc("issue_registration_otp", { _target: target, _channel: "email" });
    if (error) return json({ error: error.message }, 400);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <onboarding@resend.dev>";

    let detail = "no email provider configured";
    try {
      if (gmailUser && gmailPass) {
        await sendViaGmail(gmailUser, gmailPass, target, code);
        return json({ sent: true });
      }
      if (resendKey) {
        await sendViaResend(resendKey, resendFrom, target, code);
        return json({ sent: true });
      }
    } catch (e) {
      detail = String(e);
    }

    if (strict) return json({ error: "Email provider error: " + detail }, 502);
    return json({ sent: true, dev: true, dev_code: code });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
