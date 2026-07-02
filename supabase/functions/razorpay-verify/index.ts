// BharatOne — verify a Razorpay payment signature and settle it (server-side).
// On success: wallet_topup credits the wallet; registration_fee / service_payment are marked paid.
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
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  if (!KEY_SECRET) return json({ status: "not_configured" });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!orderId || !paymentId || !signature) return json({ error: "Missing payment fields" }, 400);

  const expected = await hmac(KEY_SECRET, `${orderId}|${paymentId}`);
  const valid = expected === signature;

  const { data: row } = await svc.from("razorpay_payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!row) return json({ status: "failed", message: "Order not found" }, 404);

  if (!valid) {
    await svc.from("razorpay_payments").update({ status: "failed", payment_id: paymentId, signature }).eq("id", row.id);
    return json({ status: "failed", message: "Signature verification failed" }, 400);
  }

  await svc.from("razorpay_payments").update({ status: "paid", payment_id: paymentId, signature }).eq("id", row.id);

  let balance: number | null = null;
  if (row.purpose === "wallet_topup") {
    const { data: bal } = await svc.rpc("razorpay_credit_wallet", { p_payment: row.id });
    balance = (bal as number) ?? null;
  }
  return json({ status: "paid", purpose: row.purpose, ref_id: row.ref_id, amount: row.amount, balance });
});
