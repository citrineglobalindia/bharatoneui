// BharatOne — send-otp edge function (email OTP), HTTPS-only.
// Supabase Edge Functions block outbound SMTP, so we send over HTTPS.
//
// Provider order (first one that ACTUALLY sends wins):
//   1. Brevo  — BREVO_API_KEY      300/day free, sends from the verified domain sender. PRIMARY.
//   2. Gmail  — GMAIL_WEBAPP_URL   Apps Script web app; Google caps consumer Gmail at ~100/day.
//   3. Resend — RESEND_API_KEY     from-address must be a verified domain.
//
// Sender: OTP_FROM_EMAIL, e.g. `BharatOne <noreply@mybharatone.com>`.
//
// SECURITY: dev mode (which returns the OTP in the HTTP response) is OPT-IN.
// Set OTP_DEV_MODE=true only for local debugging — never in production, or the code
// can be read straight out of the browser network tab.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_DOMAINS = /@(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|aol|rediffmail)\./i;
const isQuota = (s: string) => /too many times|回数が多すぎ|quota|limit exceeded|rate limit/i.test(s);

function htmlBody(code: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#d35400">BharatOne — Email Verification</h2>
    <p>Use the one-time code below to verify your email during registration:</p>
    <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#111">${code}</p>
    <p style="color:#666">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
  </div>`;
}
function parseFrom(v: string): { name: string; email: string } {
  const m = v.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1] || "BharatOne", email: m[2] };
  return { name: "BharatOne", email: v.trim() };
}
const subjectFor = (code: string) => `Your BharatOne verification code: ${code}`;
const textFor = (code: string) => `Your BharatOne verification code is ${code}. It expires in 10 minutes.`;

async function sendViaBrevo(apiKey: string, from: string, to: string, code: string) {
  const s = parseFrom(from);
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ sender: { name: s.name, email: s.email }, to: [{ email: to }], subject: subjectFor(code), htmlContent: htmlBody(code), textContent: textFor(code) }),
  });
  if (!resp.ok) throw new Error(`brevo ${resp.status} (sender=${s.email}): ` + (await resp.text()).slice(0, 300));
}

// Apps Script returns HTTP 200 with an HTML sign-in page when the deployment isn't shared
// with "Anyone" — that is NOT a successful send, so any non-JSON reply is rejected.
async function sendViaGmailWebApp(url: string, token: string | undefined, fromName: string, to: string, code: string) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({ token: token ?? "", to, subject: subjectFor(code), html: htmlBody(code), text: textFor(code), fromName }),
  });
  const txt = (await resp.text()).trim();
  if (!resp.ok) throw new Error(`gmail-webapp HTTP ${resp.status}: ${txt.slice(0, 200)}`);

  let parsed: any = null;
  try { parsed = JSON.parse(txt); } catch { /* not JSON */ }
  if (!parsed || typeof parsed !== "object") {
    const looksLikeLogin = /<html|accounts\.google\.com|Sign in|Moved Temporarily|requires you to sign in/i.test(txt);
    throw new Error(
      looksLikeLogin
        ? "gmail-webapp returned a Google sign-in page instead of JSON — the Apps Script deployment is not public (Deploy > Manage deployments > Execute as: Me, Who has access: Anyone)."
        : `gmail-webapp returned a non-JSON response: ${txt.slice(0, 200)}`,
    );
  }
  if (parsed.ok !== true) {
    const err = String(parsed.error || JSON.stringify(parsed).slice(0, 200));
    if (isQuota(err)) throw new Error("gmail-webapp DAILY QUOTA EXCEEDED (~100/day, resets midnight PT): " + err);
    throw new Error("gmail-webapp: " + err);
  }
}

async function sendViaResend(apiKey: string, from: string, to: string, code: string) {
  const configured = Deno.env.get("RESEND_FROM") || from;
  const safeFrom = FREE_DOMAINS.test(parseFrom(configured).email) ? "BharatOne <onboarding@resend.dev>" : configured;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: safeFrom, to: [to], subject: subjectFor(code), html: htmlBody(code), text: textFor(code) }),
  });
  if (!resp.ok) throw new Error(`resend ${resp.status} (from=${safeFrom}): ` + (await resp.text()).slice(0, 300));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { channel, target, diagnose } = body ?? {};

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const gmailUrl = Deno.env.get("GMAIL_WEBAPP_URL");
    const gmailToken = Deno.env.get("GMAIL_WEBAPP_TOKEN") || undefined;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    // Dev mode is opt-in. Anything other than an explicit "true" means production behaviour.
    const devMode = Deno.env.get("OTP_DEV_MODE") === "true";

    if (diagnose === true) {
      return json({
        order: ["brevo", "gmail", "resend"],
        providers: { brevo_key_set: !!brevoKey, gmail_webapp_url_set: !!gmailUrl, resend_key_set: !!resendKey },
        from: Deno.env.get("OTP_FROM_EMAIL") || null,
        dev_mode: devMode,
      });
    }

    if (channel !== "email") return json({ error: "Only email OTP is supported" }, 400);
    if (!target || !EMAIL_RE.test(target)) return json({ error: "Invalid email address" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: code, error } = await supabase.rpc("issue_registration_otp", { _target: target, _channel: "email" });
    if (error) { console.error("issue_registration_otp failed:", error.message); return json({ error: error.message }, 400); }

    const from = Deno.env.get("OTP_FROM_EMAIL") || "BharatOne <onboarding@resend.dev>";
    const fromName = parseFrom(from).name;

    const failures: string[] = [];
    if (brevoKey) {
      try { await sendViaBrevo(brevoKey, from, target, code); console.log("OTP sent via brevo to", target); return json({ sent: true, via: "brevo" }); }
      catch (e) { console.error("BREVO FAILED:", String(e)); failures.push(String(e)); }
    }
    if (gmailUrl) {
      try { await sendViaGmailWebApp(gmailUrl, gmailToken, fromName, target, code); console.log("OTP sent via gmail to", target); return json({ sent: true, via: "gmail" }); }
      catch (e) { console.error("GMAIL FAILED:", String(e)); failures.push(String(e)); }
    }
    if (resendKey) {
      try { await sendViaResend(resendKey, from, target, code); console.log("OTP sent via resend to", target); return json({ sent: true, via: "resend" }); }
      catch (e) { console.error("RESEND FAILED:", String(e)); failures.push(String(e)); }
    }
    if (!brevoKey && !gmailUrl && !resendKey) failures.push("no email provider configured (set BREVO_API_KEY)");

    const detail = failures.join(" | ");
    console.error("ALL EMAIL PROVIDERS FAILED for", target, "->", detail);

    // Only ever leak the code back to the caller when explicitly in dev mode.
    if (devMode) return json({ sent: true, dev: true, dev_code: code, detail });

    const friendly = isQuota(detail)
      ? "Today's email sending limit has been reached. Please try again later or contact support."
      : "Could not send the verification email. Please try again in a moment.";
    return json({ error: friendly, detail }, 502);
  } catch (e) {
    console.error("send-otp crashed:", String(e));
    return json({ error: String(e) }, 500);
  }
});
