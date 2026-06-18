// BharatOne — send-credentials: emails approved retailer their login + link
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function html(name: string, username: string, password: string, email: string, loginUrl: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ff9123,#138808);padding:20px 24px;color:#fff">
      <h2 style="margin:0">BharatOne</h2><p style="margin:4px 0 0;font-size:13px;opacity:.9">For Serving Indian Citizens</p>
    </div>
    <div style="padding:24px">
      <p>Dear ${name || "Retailer"},</p>
      <p>Congratulations! Your BharatOne retailer registration has been <b style="color:#138808">approved</b>. Your account is now active. Use the credentials below to log in:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f6f7f6;font-weight:bold;width:130px">Retailer ID</td><td style="padding:8px 12px;background:#f6f7f6">${username}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold">Email / Login</td><td style="padding:8px 12px">${email}</td></tr>
        <tr><td style="padding:8px 12px;background:#f6f7f6;font-weight:bold">Password</td><td style="padding:8px 12px;background:#f6f7f6;font-family:monospace;font-size:15px"><b>${password}</b></td></tr>
      </table>
      <p style="text-align:center;margin:22px 0">
        <a href="${loginUrl}" style="background:#138808;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block">Log in to BharatOne</a>
      </p>
      <p style="font-size:13px;color:#666">For your security, please change your password after first login. If the button doesn't work, open this link: <br><a href="${loginUrl}">${loginUrl}</a></p>
      <p style="font-size:12px;color:#999;margin-top:20px">If you didn't expect this email, please contact BharatOne support.</p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, name, username, password, loginUrl } = await req.json();
    if (!email || !password) return json({ error: "email and password required" }, 400);
    const url = loginUrl || "https://bharatoneui.vercel.app/login";
    const user = Deno.env.get("GMAIL_USER");
    const pass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!user || !pass) return json({ error: "email provider not configured" }, 502);
    const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
    try {
      await client.send({
        from: `BharatOne <${user}>`, to: email,
        subject: "Your BharatOne account is approved — login details inside",
        content: `Welcome to BharatOne! Retailer ID: ${username}, Login email: ${email}, Password: ${password}. Login at ${url}`,
        html: html(name, username, password, email, url),
      });
    } finally { await client.close(); }
    return json({ sent: true });
  } catch (e) { return json({ error: String(e) }, 500); }
});
