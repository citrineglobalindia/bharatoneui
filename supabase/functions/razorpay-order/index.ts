// BharatOne — create a Razorpay order (server-side). The secret never leaves here.
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET. Also set razorpay_config.active = true.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const ALLOWED = ["wallet_topup", "registration_fee", "service_payment"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const amount = Math.round(Number(body.amount ?? 0));           // rupees
  const purpose = String(body.purpose ?? "wallet_topup");
  const refId = body.refId ? String(body.refId) : null;
  if (!ALLOWED.includes(purpose)) return json({ error: "Unknown purpose" }, 400);
  if (!(amount > 0)) return json({ error: "Amount must be greater than zero" }, 400);

  const { data: cfg } = await svc.from("razorpay_config").select("active").eq("id", 1).maybeSingle();
  const configured = !!cfg?.active && !!KEY_ID && !!KEY_SECRET;

  if (!configured) {
    await svc.from("razorpay_payments").insert({ user_id: user.id, purpose, ref_id: refId, amount, status: "not_configured" });
    return json({ status: "not_configured", message: "Razorpay is not configured yet. Add RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET and set razorpay_config.active = true." });
  }

  try {
    const receipt = `bo_${purpose}_${Date.now()}`;
    const resp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes: { purpose, ref_id: refId ?? "", user_id: user.id } }),
    });
    const order = await resp.json();
    if (!resp.ok) return json({ status: "failed", message: order?.error?.description || "Could not create order" }, 502);
    const { data: row } = await svc.from("razorpay_payments")
      .insert({ user_id: user.id, purpose, ref_id: refId, amount, order_id: order.id, status: "created" })
      .select("id").single();
    return json({ status: "created", order_id: order.id, amount, currency: "INR", key_id: KEY_ID, payment_row_id: row?.id });
  } catch (e) {
    return json({ status: "failed", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
