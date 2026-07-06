// BharatOne — email admins when a retailer re-uploads a KYC document via the
// secure re-upload link. Public (token-gated action already validated in DB).
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

const DOC_LABEL: Record<string, string> = { selfie: "Selfie", shop: "Outside Shop Photo", shop_inside: "Inside Shop Photo", passport: "Passport Size Photo", aadhaar: "Aadhaar Card", pan: "PAN Card", police: "Police Verification", video: "Video KYC" };

async function sendEmail(to: string[], subject: string, html: string) {
  const user = Deno.env.get("GMAIL_USER"); const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) return { ok: false, error: "email provider not configured" };
  const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
  try {
    await client.send({ from: `BharatOne <${user}>`, to, subject, content: "A retailer re-uploaded a KYC document.", html });
    await client.close();
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const key = String(body.key ?? "");
  const retailer = String(body.retailer ?? "A retailer");
  const appId = String(body.app_id ?? "");
  const allDone = !!body.all_done;
  const docName = DOC_LABEL[key] ?? key ?? "a document";

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: emails, error } = await svc.rpc("admin_emails");
  if (error) return json({ sent: false, error: error.message }, 200);
  const to = ((emails as string[]) ?? []).filter(Boolean);
  if (to.length === 0) return json({ sent: false, error: "no admin emails" }, 200);

  const subject = allDone
    ? `BharatOne — ${retailer} re-uploaded all requested documents (${appId})`
    : `BharatOne — ${retailer} re-uploaded a document: ${docName} (${appId})`;
  const html = `<div style="font-family:system-ui,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">KYC document re-uploaded</h2>
    <p style="margin:0 0 6px"><b>${retailer}</b> (${appId || "—"}) re-uploaded <b>${docName}</b> via the secure link.</p>
    ${allDone ? `<p style="margin:0 0 6px">All requested documents have been re-uploaded — the application has returned to QC for approval.</p>` : ""}
    <p style="margin:12px 0 0;color:#475569">Open the BharatOne admin portal to review the updated documents.</p>
  </div>`;

  const r = await sendEmail(to, subject, html);
  return json({ sent: r.ok, recipients: to.length, error: r.ok ? undefined : (r as any).error });
});
