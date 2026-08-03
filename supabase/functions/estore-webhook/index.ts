// BharatOne E-Store — Razorpay server-to-server webhook.
//
// WHY THIS EXISTS
// ---------------
// Until now an e-store order was only marked paid by the retailer's own browser
// calling back into `estore-checkout` after Razorpay's popup closed. If the tab
// was closed, the phone locked, the browser crashed, or the mobile network
// dropped in the two seconds between the bank confirming and the callback
// firing, the money left the retailer's account and BharatOne had no record of
// it. The order sat at "awaiting payment" until its stock reservation lapsed and
// it quietly expired. Nobody would have found out except the retailer.
//
// Razorpay will tell us directly, and keep telling us until we acknowledge, but
// only if there is an endpoint listening. This is it.
//
// SETUP (once, in the Razorpay dashboard → Settings → Webhooks)
//   URL     https://<project>.supabase.co/functions/v1/estore-webhook
//   Secret  a long random string, also stored as the RAZORPAY_WEBHOOK_SECRET
//           edge-function secret
//   Events  payment.captured, order.paid, payment.failed
//
// SECURITY
// Razorpay is not authenticated by a Supabase JWT, so this function is deployed
// with verify_jwt off. That makes the signature check the ONLY thing standing
// between the open internet and "this order is paid", so it is done first, over
// the exact raw bytes of the body, and with a constant-time comparison. A
// request that fails it is rejected before anything is read out of the payload.
//
// Every reply is 200 unless the signature is bad. Razorpay retries any non-2xx
// for 24 hours, and there is nothing to gain from being retried over an event we
// have already handled or deliberately ignore.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const FROM_RAW = Deno.env.get("OTP_FROM_EMAIL") ?? "BharatOne <noreply@mybharatone.com>";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
const money = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant time — a short-circuiting compare leaks the signature one byte at a time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || "BharatOne", email: m[2] } : { name: "BharatOne", email: raw.trim() };
}

async function sendEmail(to: { email: string; name?: string }[], subject: string, html: string) {
  if (!BREVO_API_KEY || to.length === 0) return;
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: parseFrom(FROM_RAW), to, subject, htmlContent: html }),
    });
  } catch { /* a receipt that fails to send must never fail the webhook */ }
}

function orderEmailHtml(order: any, items: any[], forCustomer: boolean): string {
  const rows = items.map((it) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(it.name)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${money(it.line_total)}</td></tr>`).join("");
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // The signature is over the raw body. Parsing first and re-serialising would
  // change key order and whitespace, and every signature would fail.
  const raw = await req.text();
  const given = req.headers.get("x-razorpay-signature") ?? "";

  if (!WEBHOOK_SECRET) {
    // Refusing outright is the safe failure: with no secret configured there is
    // no way to tell a genuine Razorpay callback from anyone else's POST.
    console.error("estore-webhook: RAZORPAY_WEBHOOK_SECRET is not set — rejecting");
    return json({ error: "Webhook not configured" }, 503);
  }
  if (!given || !safeEqual(await hmacHex(WEBHOOK_SECRET, raw), given)) {
    console.warn("estore-webhook: signature rejected");
    return json({ error: "Invalid signature" }, 401);
  }

  let evt: any; try { evt = JSON.parse(raw); } catch { return json({ ok: true, ignored: "unparseable" }); }
  const event = String(evt?.event ?? "");
  const payment = evt?.payload?.payment?.entity ?? null;
  const rzpOrderId = String(payment?.order_id ?? evt?.payload?.order?.entity?.id ?? "");
  const paymentId = String(payment?.id ?? "");
  const purpose = String(payment?.notes?.purpose ?? "");

  // This endpoint is registered for the e-store only, but the same Razorpay
  // account serves wallet top-ups and registration fees. Anything that is not an
  // e-store order is acknowledged and dropped rather than acted on by accident.
  if (!rzpOrderId) return json({ ok: true, ignored: "no order id" });
  if (purpose && purpose !== "estore_order") return json({ ok: true, ignored: purpose });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  if (event === "payment.failed") {
    const { data: o } = await svc.from("estore_orders").select("id,payment_status")
      .eq("razorpay_order_id", rzpOrderId).maybeSingle();
    // A failed attempt is recorded but the stock is deliberately left reserved:
    // retailers routinely fail once and succeed on a second card, and pulling
    // the items out from under them mid-checkout would be worse than waiting
    // for the reservation to lapse on its own.
    if (o && o.payment_status !== "paid") {
      await svc.from("estore_order_events").insert({
        order_id: o.id, status: null,
        note: "Payment attempt failed — " + (payment?.error_description ?? "declined by the bank"),
      });
    }
    return json({ ok: true, handled: "payment.failed" });
  }

  if (event !== "payment.captured" && event !== "order.paid") {
    return json({ ok: true, ignored: event });
  }

  const { data: res, error } = await svc.rpc("estore_confirm_payment", {
    _rzp_order: rzpOrderId, _payment_id: paymentId, _source: "webhook",
  });
  if (error) {
    // A 500 makes Razorpay retry, which is exactly what we want if the database
    // was briefly unreachable.
    console.error("estore-webhook: confirm failed", error.message);
    return json({ error: error.message }, 500);
  }

  const r = res as any;
  if (r?.ok && r.first_time) {
    // The browser never got back to us, so this is the receipt the retailer
    // would otherwise never have received.
    try {
      const { data: order } = await svc.from("estore_orders").select("*").eq("id", r.order_id).maybeSingle();
      const { data: items } = await svc.from("estore_order_items").select("name,qty,line_total").eq("order_id", r.order_id);
      // The retailer's address lives in auth, not in profiles — profiles only
      // carries the phone number.
      const { data: acct } = await svc.auth.admin.getUserById(order?.retailer_id);
      const to: { email: string; name?: string }[] = [];
      if (order?.order_for === "customer" && order?.contact_email) to.push({ email: order.contact_email, name: order.ship_name });
      if (acct?.user?.email) to.push({ email: acct.user.email, name: order?.ship_name });
      const uniq = to.filter((x, i, a) => x.email && a.findIndex((y) => y.email.toLowerCase() === x.email.toLowerCase()) === i);
      await sendEmail(uniq, `Order ${order?.order_no} confirmed — BharatOne E-Store`,
        orderEmailHtml(order, items ?? [], order?.order_for === "customer"));
    } catch (e) { console.error("estore-webhook: receipt failed", String(e)); }
  }

  return json({ ok: true, ...(r ?? {}) });
});
