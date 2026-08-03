// BharatOne E-Store checkout — create a Razorpay order for an e-store order and verify payment.
//
// This is the browser-facing half of e-store payment. The other half is
// `estore-webhook`, which Razorpay calls server to server. Neither is allowed to
// be the sole authority: both funnel into the `estore_confirm_payment` RPC,
// which is idempotent, so whichever arrives second changes nothing. That is what
// stops a retailer's money disappearing into an order that still says "awaiting
// payment" because they closed the tab a second too early.
//
// Two things here are easy to get wrong and cost real money:
//
//  * The amount is sent to Razorpay in PAISE. It used to be rounded to whole
//    rupees first, so an order of Rs 11.80 was charged Rs 12 — the invoice and
//    the card statement disagreed by 20 paise on every order carrying GST.
//  * The confirmation email is only sent the first time an order is confirmed.
//    Razorpay retries a webhook until it gets a 200, so sending unconditionally
//    would mail the customer the same receipt several times over.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const FROM_RAW = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <noreply@mybharatone.com>";

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "BharatOne", email: m[2] };
  return { name: "BharatOne", email: raw.trim() };
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
const money = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

async function sendEmail(to: { email: string; name?: string }[], subject: string, html: string): Promise<boolean> {
  if (!BREVO_API_KEY || to.length === 0) return false;
  try {
    const from = parseFrom(FROM_RAW);
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: from, to, subject, htmlContent: html }),
    });
    return r.ok;
  } catch { return false; }
}

function orderEmailHtml(order: any, items: any[], forCustomer: boolean): string {
  const rows = items.map((it) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(it.name)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${money(it.line_total)}</td></tr>`).join("");
  const addr = [order.ship_line, order.ship_landmark, order.ship_city, order.ship_state, order.ship_pincode].filter(Boolean).join(", ");
  return `<!doctype html><html><body style="margin:0;background:#f5f7f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#EA580C,#1F7A3D);border-radius:16px;padding:24px;color:#fff">
      <div style="font-size:13px;opacity:.9">BharatOne E-Store</div>
      <div style="font-size:22px;font-weight:800;margin-top:4px">Order confirmed 🎉</div>
      <div style="font-size:13px;opacity:.9;margin-top:4px">Order ${esc(order.order_no)}</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:20px;margin-top:16px;border:1px solid #eee">
      <p style="margin:0 0 4px">Hi ${esc(order.ship_name || "there")},</p>
      <p style="margin:0 0 14px;color:#555;font-size:14px">${forCustomer ? "Thank you for your order. It has been received and is being processed." : "Your order has been placed successfully and is being processed."}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr><th style="padding:8px;text-align:left;background:#f5f7f5;font-size:11px;text-transform:uppercase;color:#666">Item</th><th style="padding:8px;text-align:center;background:#f5f7f5;font-size:11px;color:#666">Qty</th><th style="padding:8px;text-align:right;background:#f5f7f5;font-size:11px;color:#666">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:12px;text-align:right">
        <div style="font-size:13px;color:#666">Subtotal ${money(order.subtotal)} · GST ${money(order.gst_amount)}</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px">Total ${money(order.total)}</div>
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee;font-size:13px;color:#555">
        <b>Delivery to</b><br>${esc(order.ship_name)} · ${esc(order.ship_phone)}<br>${esc(addr)}
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px">You'll be notified as your order moves through packing and shipping.<br>Thank you for shopping with BharatOne.</p>
  </div></body></html>`;
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sends the receipt. Shared with the webhook by way of the same table reads. */
export async function sendOrderConfirmation(svc: any, orderId: string, retailerEmail?: string | null) {
  const { data: order } = await svc.from("estore_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;
  const { data: items } = await svc.from("estore_order_items").select("name,qty,line_total").eq("order_id", orderId);
  const forCustomer = order.order_for === "customer";
  const recipients: { email: string; name?: string }[] = [];
  if (forCustomer && order.contact_email) recipients.push({ email: order.contact_email, name: order.ship_name });
  if (retailerEmail) recipients.push({ email: retailerEmail, name: order.ship_name }); // always copy the retailer
  const uniq = recipients.filter((r, i, a) => r.email && a.findIndex((x) => x.email.toLowerCase() === r.email.toLowerCase()) === i);
  await sendEmail(uniq, `Order ${order.order_no} confirmed — BharatOne E-Store`, orderEmailHtml(order, items ?? [], forCustomer));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body.action ?? "");

  const orderId = String(body.order_id ?? "");
  const { data: order } = await svc.from("estore_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.retailer_id !== user.id) return json({ error: "Forbidden" }, 403);

  if (action === "create") {
    if (order.payment_status === "paid") return json({ error: "Order already paid" }, 400);
    if (order.status === "cancelled") return json({ error: "This order was cancelled" }, 400);
    // An expired reservation is not fatal — the stock is re-taken on confirmation
    // if it is still there — but the retailer deserves to know before paying.
    const { data: cfg } = await svc.from("razorpay_config").select("active").eq("id", 1).maybeSingle();
    if (!cfg?.active || !KEY_ID || !KEY_SECRET) return json({ status: "not_configured", message: "Razorpay is not configured yet." });

    // Paise, not rupees. Razorpay takes the smallest currency unit and the order
    // total carries GST, so it is almost never a whole number.
    const paise = Math.round(Number(order.total) * 100);
    if (!(paise > 0)) return json({ error: "Order total is zero" }, 400);
    try {
      const resp = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paise, currency: "INR", receipt: order.order_no, notes: { purpose: "estore_order", order_id: order.id, user_id: user.id } }),
      });
      const rzp = await resp.json();
      if (!resp.ok) return json({ status: "failed", message: rzp?.error?.description || "Could not create order" }, 502);
      await svc.from("estore_orders").update({ razorpay_order_id: rzp.id, updated_at: new Date().toISOString() }).eq("id", order.id);
      return json({
        status: "created", razorpay_order_id: rzp.id,
        amount: Number(order.total), amount_paise: paise,
        currency: "INR", key_id: KEY_ID, order_no: order.order_no,
        reserved_until: order.reserved_until,
      });
    } catch (e) { return json({ status: "failed", message: String(e) }, 500); }
  }

  if (action === "verify") {
    const rzpOrder = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");
    if (!rzpOrder || !paymentId || !signature) return json({ error: "Missing payment fields" }, 400);
    if (order.razorpay_order_id && order.razorpay_order_id !== rzpOrder) return json({ error: "Order mismatch" }, 400);

    const expected = await hmac(KEY_SECRET, `${rzpOrder}|${paymentId}`);
    if (expected !== signature) {
      // Deliberately does NOT release the stock. A bad signature is far more
      // likely to be a tampered callback than a genuine failure, and the webhook
      // may still be about to confirm this order honestly.
      await svc.from("estore_orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
      return json({ status: "failed", message: "Signature verification failed" }, 400);
    }

    const { data: res, error: rpcErr } = await svc.rpc("estore_confirm_payment", {
      _rzp_order: rzpOrder, _payment_id: paymentId, _source: "browser",
    });
    if (rpcErr) return json({ status: "failed", message: rpcErr.message }, 500);
    const r = res as any;
    if (!r?.ok) return json({ status: "failed", message: r?.reason ?? "Could not confirm the order" }, 500);

    // Only on the first confirmation — the webhook may have got here first.
    if (r.first_time) { try { await sendOrderConfirmation(svc, order.id, user.email); } catch { /* non-fatal */ } }

    return json({
      status: "paid", order_no: r.order_no,
      needs_attention: r.attention === true,
      message: r.attention
        ? "Payment received, but the items were released while you were paying. Our team will contact you about a refund or a replacement."
        : undefined,
    });
  }

  return json({ error: "Unknown action" }, 400);
});
