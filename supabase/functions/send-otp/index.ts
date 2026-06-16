// BharatOne — send-otp edge function (email OTP via Resend)
// Deploy with: supabase functions deploy send-otp --no-verify-jwt
// Required secrets: RESEND_API_KEY, OTP_FROM_EMAIL (e.g. "BharatOne <noreply@yourdomain.com>")
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { channel, target } = await req.json();
    if (channel !== "email") return json({ error: "Only email OTP is supported" }, 400);
    if (!target || !EMAIL_RE.test(target)) return json({ error: "Invalid email address" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: code, error } = await supabase.rpc("issue_registration_otp", {
      _target: target,
      _channel: "email",
    });
    if (error) return json({ error: error.message }, 400);

    const from = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <onboarding@resend.dev>";
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [target],
        subject: `Your BharatOne verification code: ${code}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#d35400">BharatOne — Email Verification</h2>
            <p>Use the one-time code below to verify your email during registration:</p>
            <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#111">${code}</p>
            <p style="color:#666">This code expires in 10 minutes. If you didn't request it, please ignore this email.</p>
          </div>`,
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: "Email provider error: " + t }, 502);
    }
    return json({ sent: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
