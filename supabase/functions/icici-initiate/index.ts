// BharatOne — ICICI Orange PG: initiateSale
//
// Server-to-server call that registers a sale with ICICI and returns the URL the
// browser must be sent to. The browser is never involved in this step and never sees
// the merchant key.
//
// Flow: client calls this → we sign and POST initiateSale → ICICI returns tranCtx →
// we hand back `redirect_url` → client does window.location = redirect_url →
// customer pays on ICICI → ICICI POSTs the result to icici-return.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  AGG_ID, MID, SITE, URLS, configured, cors, isPending, isSuccess, istTxnDate,
  json, money, signV1,
} from "../_shared/icici.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED = ["wallet_topup", "registration_fee", "service_payment", "estore_order"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const purpose = String(body.purpose ?? "");
    const amount = Number(body.amount);
    const refId = body.ref_id ? String(body.ref_id) : null;

    if (!ALLOWED.includes(purpose)) return json({ status: "failed", message: "Unknown payment purpose" }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json({ status: "failed", message: "Invalid amount" }, 400);

    // Who is paying. Registration fees are paid before the applicant has an account,
    // so an anonymous caller is allowed for that purpose only.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader) {
      const asUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await asUser.auth.getUser();
      userId = data?.user?.id ?? null;
    }
    if (!userId && purpose !== "registration_fee") {
      return json({ status: "failed", message: "Please sign in to continue" }, 401);
    }

    // Is ICICI the gateway for this flow, and is it switched on?
    const [{ data: route }, { data: gw }] = await Promise.all([
      svc.from("payment_routing").select("gateway,enabled").eq("purpose", purpose).maybeSingle(),
      svc.from("payment_gateways").select("active,mode").eq("name", "icici").maybeSingle(),
    ]);
    if (!route?.enabled || route.gateway !== "icici") {
      return json({ status: "not_configured", message: "This payment is not routed to ICICI" }, 200);
    }
    // While the gateway is in TEST (UAT) mode no real money moves, so a customer
    // could "pay" and have their wallet credited for nothing. Restrict test mode to
    // administrators, so a flow can be routed to ICICI and rehearsed on production
    // without any risk of a retailer walking into the sandbox.
    if (gw?.mode !== "live") {
      const { data: isAdmin } = userId
        ? await svc.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
        : { data: null };
      if (!isAdmin) {
        return json({
          status: "not_configured",
          message: "Online payment is being tested and is not open yet. Please use the other options below.",
        }, 200);
      }
    }

    if (!gw?.active || !configured()) {
      await svc.from("razorpay_payments").insert({
        gateway: "icici", user_id: userId, purpose, ref_id: refId,
        amount, currency: "INR", status: "not_configured",
      });
      return json({ status: "not_configured", message: "ICICI gateway is not configured yet" }, 200);
    }

    // Our own reference. Capped at 20 chars by the spec; ours is 12.
    const { data: refRow, error: refErr } = await svc.rpc("next_merchant_txn_no");
    if (refErr || !refRow) return json({ status: "failed", message: "Could not allocate a reference" }, 500);
    const merchantTxnNo = String(refRow);

    // Only non-empty values are hashed, so optional fields are omitted rather than
    // sent blank — a blank field and an absent field must not produce different hashes.
    const payload: Record<string, string> = {
      merchantId: MID,
      merchantTxnNo,
      amount: money(amount),
      currencyCode: "356",
      payType: "0",
      transactionType: "SALE",
      txnDate: istTxnDate(),
      returnURL: `${SUPABASE_URL}/functions/v1/icici-return`,
      customerEmailID: String(body.email ?? "").trim() || "dummy@gmail.com",
    };
    if (AGG_ID) payload.aggregatorID = AGG_ID;

    // Restricting the payment method matters for more than tidiness (spec p.7, p.9):
    //   - the hosted page shows only what we ask for, instead of every option;
    //   - with UPI it drops the convenience fee, since UPI is zero-MDR in India;
    //   - customerUPIAlias pre-fills the payer's VPA so ICICI can send a collect
    //     request to their app, avoiding the QR scan that some apps refuse.
    const payMode = String(body.payment_mode ?? "").trim().toUpperCase();
    if (["CARD", "NB", "WALLET", "UPI"].includes(payMode)) payload.paymentMode = payMode;
    const vpa = String(body.upi_vpa ?? "").trim();
    if (payMode === "UPI" && /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(vpa)) payload.customerUPIAlias = vpa.slice(0, 45);

    const mobile = String(body.contact ?? "").replace(/\D/g, "").slice(-10);
    if (/^\d{10}$/.test(mobile)) payload.customerMobileNo = mobile;
    const custName = String(body.name ?? "").trim();
    if (custName) payload.customerName = custName.slice(0, 60);
    // Carried through untouched by ICICI and echoed back, so the return handler can
    // recognise the payment even before it reads our own row.
    payload.addlParam1 = purpose;
    if (refId) payload.addlParam2 = refId.slice(0, 64);

    payload.secureHash = await signV1(payload);

    // Record the attempt BEFORE calling out, so a payment can never exist at ICICI
    // without a row here.
    const { data: row, error: insErr } = await svc.from("razorpay_payments").insert({
      gateway: "icici", user_id: userId, purpose, ref_id: refId,
      amount, currency: "INR", status: "created",
      merchant_txn_no: merchantTxnNo, order_id: merchantTxnNo,
    }).select("id").single();
    if (insErr) return json({ status: "failed", message: `Could not record payment: ${insErr.message}` }, 500);

    const res = await fetch(URLS.sale, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let out: Record<string, unknown> = {};
    try { out = JSON.parse(text); } catch { /* keep raw below */ }

    const code = String(out.responseCode ?? "");
    const ok = isSuccess(code) || isPending(code) || !!out.redirectURI;

    if (!ok || !out.redirectURI || !out.tranCtx) {
      await svc.from("razorpay_payments").update({
        status: "failed",
        gateway_response: { http: res.status, body: text.slice(0, 2000) },
      }).eq("id", row.id);
      await svc.rpc("log_health", {
        p_module: "razorpay", p_status: "warn",
        p_message: `ICICI initiateSale rejected: ${code || res.status} ${String(out.respDescription ?? "").slice(0, 80)}`,
        p_level: "error", p_detail: { merchantTxnNo, code }, p_latency: null, p_source: "app",
      });
      return json({
        status: "failed",
        message: String(out.respDescription ?? "The payment gateway declined to start this transaction"),
        code,
      }, 200);
    }

    const redirectUrl = `${String(out.redirectURI)}?tranCtx=${encodeURIComponent(String(out.tranCtx))}`;

    await svc.from("razorpay_payments").update({
      status: "initiated",
      gateway_txn_id: out.tranCtx ? String(out.tranCtx) : null,
      gateway_response: { initiate: out },
    }).eq("id", row.id);

    return json({
      status: "initiated",
      redirect_url: redirectUrl,
      merchant_txn_no: merchantTxnNo,
      payment_row_id: row.id,
      amount,
      // Where icici-return should send the browser once it has verified the result.
      return_to: `${SITE}/payment-result?ref=${encodeURIComponent(merchantTxnNo)}`,
    });
  } catch (e) {
    return json({ status: "failed", message: String((e as Error)?.message ?? e).slice(0, 200) }, 500);
  }
});
