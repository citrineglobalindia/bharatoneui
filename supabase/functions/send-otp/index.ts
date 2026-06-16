// BharatOne — send-otp edge function (email OTP via Resend)
// Secrets: RESEND_API_KEY, OTP_FROM_EMAIL, optional OTP_DEV_MODE
// Behaviour:
//  - If Resend delivers the email -> { sent: true } (production path).
//  - If Resend can't deliver (e.g. test mode, unverified domain) AND
//    OTP_DEV_MODE !== "false" -> { sent: true, dev: true, dev_code }
//    so the code can be shown on-screen for testing. This auto-stops
//    once a domain is verified (emails start succeeding). Set
//    OTP_DEV_MODE="false" to enforce strict (no code ever returned).
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

    const from = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <onboarding@resend.dev>";
    const apiKey = Deno.env.get("RESEND_API_KEY");

    async function deliver(): Promise<{ ok: boolean; detail?: string }> {
      if (!apiKey) return { ok: false, detail: "RESEND_API_KEY not set" };
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [target],
            subject: `Your BharatOne verification code: ${code}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
              <h2 style="color:#d35400">BharatOne — Email Verification</h2>
              <p>Use the one-time code below to verify your email during registration:</p>
              <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#111">${code}</p>
              <p style="color:#666">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
            </div>`,
          }),
        });
        if (!resp.ok) return { ok: false, detail: await resp.text() };
        return { ok: true };
      } catch (e) {
        return { ok: false, detail: String(e) };
      }
    }

    const result = await deliver();
    if (result.ok) return json({ sent: true });
    if (strict) return json({ error: "Email provider error: " + result.detail }, 502);
    // dev fallback — return the code so it can be shown on screen for testing
    return json({ sent: true, dev: true, dev_code: code });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
