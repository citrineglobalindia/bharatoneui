// BharatOne — ticket-sms edge function.
// Sends the DLT-registered "complaint registered" SMS to the person who raised
// a support ticket. Called (fire-and-forget) by the client right after a ticket
// is inserted, with { ticket_id }. All SMS goes through notify-dispatch so the
// DLT template + gateway credentials live in exactly one place.
//
// Safety: the caller's JWT is verified and must own the ticket, so a client
// cannot trigger SMS to arbitrary numbers by guessing ticket ids.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Indian gateways want a bare 10-digit number.
function normMobile(raw: string | null | undefined): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { ticket_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ticketId = String(body.ticket_id ?? "");
  if (!ticketId) return json({ error: "ticket_id is required" }, 400);

  // Identify the caller from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: ures } = await asUser.auth.getUser();
  const uid = ures?.user?.id ?? null;
  if (!uid) return json({ error: "Not authenticated" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: ticket } = await svc
    .from("support_tickets")
    .select("id, ticket_no, user_id, user_name")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return json({ error: "Ticket not found" }, 404);
  if ((ticket as { user_id: string }).user_id !== uid) return json({ error: "Not your ticket" }, 403);

  const ticketNo = String((ticket as { ticket_no: string | null }).ticket_no ?? "");
  const name = String((ticket as { user_name: string | null }).user_name ?? "").trim() || "Customer";
  if (!ticketNo) return json({ status: "skipped", reason: "no ticket number yet" });

  // Resolve the raiser's number. profiles.phone is the contact shown on their
  // account (the "registered number"); fall back to the KYC registration mobile
  // and any alternate. First one that is a valid 10-digit Indian mobile wins.
  const { data: prof } = await svc
    .from("profiles").select("phone, alt_phone").eq("id", uid).maybeSingle();
  const { data: reg } = await svc
    .from("retailer_registrations").select("mobile")
    .eq("auth_user_id", uid).not("mobile", "is", null).limit(1).maybeSingle();
  const candidates = [
    (prof as { phone?: string | null } | null)?.phone,
    (reg as { mobile?: string | null } | null)?.mobile,
    (prof as { alt_phone?: string | null } | null)?.alt_phone,
  ];
  let mobile = "";
  for (const c of candidates) { const m = normMobile(c); if (/^[6-9]\d{9}$/.test(m)) { mobile = m; break; } }
  if (!mobile) return json({ status: "skipped", reason: "no valid mobile on file" });

  // vars order must match the registered template: [name, ticket no].
  const { data: dispatch, error: dErr } = await svc.functions.invoke("notify-dispatch", {
    body: { channel: "sms", to: mobile, template_key: "ticket_registered", vars: [name, ticketNo] },
  });
  const sent = !dErr && (dispatch as { status?: string } | null)?.status === "sent";
  if (sent) return json({ sent: true, ticket_no: ticketNo });
  const detail = dErr ? String(dErr) : String((dispatch as { message?: string } | null)?.message ?? "sms send failed");
  console.error("ticket-sms FAILED for", ticketNo, "->", detail);
  return json({ sent: false, detail }, 502);
});
