// Shared settlement logic for the two places ICICI tells us about a payment:
// the browser return URL (icici-return) and the server-to-server Payment Advice
// webhook (icici-advice). Both carry the same parameters, so both land here.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { MID, isPending, isSuccess, verifyInbound } from "./icici.ts";

export type SettleOutcome = {
  ok: boolean;
  status: "paid" | "pending" | "failed" | "unknown" | "bad_hash" | "not_found";
  merchantTxnNo: string;
  message: string;
  rowId?: string;
  purpose?: string;
  refId?: string | null;
  amount?: number;
};

/**
 * Verify and apply a payment result.
 *
 * Deliberately idempotent: the return URL and the Payment Advice webhook usually both
 * fire for the same payment, and the status sweep may fire a third time. Whoever gets
 * here first wins; the rest are no-ops. A payment already settled is never re-opened.
 *
 * Note this only marks the payment as paid. Money is not moved here — crediting a
 * wallet stays with the accountant, exactly as it works for Razorpay today.
 */
export async function settleIciciPayment(
  svc: SupabaseClient,
  payload: Record<string, string>,
  source: "return" | "advice" | "status",
  opts: { preVerified?: boolean } = {},
): Promise<SettleOutcome> {
  const merchantTxnNo = String(payload.merchantTxnNo ?? "");
  if (!merchantTxnNo) {
    return { ok: false, status: "unknown", merchantTxnNo: "", message: "No merchantTxnNo in payload" };
  }

  // Hash covers every field ICICI sent, including any not in the published spec.
  //
  // `preVerified` exists for the status sweep: that response is signed over its own
  // field names (txnStatus / txnResponseCode), so the caller checks the signature on
  // the untouched response and only then normalises it into payment-result shape.
  // Re-hashing the normalised copy here would always fail.
  const { ok: hashOk, expected, received } = opts.preVerified
    ? { ok: true, expected: "", received: String(payload.secureHash ?? "") }
    : await verifyInbound(payload);

  const { data: row } = await svc
    .from("razorpay_payments")
    .select("id,status,amount,purpose,ref_id,user_id,gateway")
    .eq("merchant_txn_no", merchantTxnNo)
    .maybeSingle();

  if (!row) {
    // ICICI began delivering advice on 3 Aug 2026, and almost none of it is ours:
    // references such as RTOMS13220260803151114708, NCMSD194FQILV3, TS1785749881737
    // and 7557, when every BharatOne reference is the fixed 12-character form
    // BO00000000XX. They look like other merchants' transactions arriving at our
    // endpoint.
    //
    // Two things settle the question, so both are kept: whose merchantId is on the
    // payload, and whether the signature verifies against OUR secret key. A payload
    // that verifies was genuinely signed for us; one that does not was meant for
    // somebody else.
    const advisedMid = String(payload.merchantId ?? payload.merchantID ?? "");
    const isOurs = !!MID && advisedMid === MID;

    await svc.rpc("icici_record_unmatched", {
      _source: source, _ref: merchantTxnNo, _merchant_id: advisedMid || null,
      _is_ours: isOurs, _hash_ok: hashOk, _payload: payload,
    }).then(() => undefined, () => undefined);

    // Only raise an alert when the advice claims to be for OUR merchant account —
    // that would mean a payment of ours has gone missing, which is worth waking
    // somebody for. Another merchant's stray advice is ICICI's routing problem, not
    // an incident here, and alerting on each one buried the administrator's inbox
    // in WARN emails within minutes. Recorded quietly instead.
    await svc.rpc("log_health", {
      p_module: "razorpay",
      p_status: isOurs ? "warn" : "ok",
      p_message: isOurs
        ? `ICICI ${source}: no payment found for our reference ${merchantTxnNo}`
        : `ICICI ${source}: advice for another merchant ignored (${advisedMid || "no merchantId"})`,
      p_level: isOurs ? "error" : "info",
      p_detail: { merchantTxnNo, merchantId: advisedMid, hash_verified: hashOk },
      p_latency: null, p_source: "app",
    }).then(() => undefined, () => undefined);

    return { ok: false, status: "not_found", merchantTxnNo, message: "Unknown transaction reference" };
  }

  if (!hashOk) {
    // Never trust the payload. Record the attempt loudly — a mismatch is either a
    // misconfigured key or someone forging a payment result.
    await svc.from("razorpay_payments").update({
      gateway_response: { [`${source}_rejected`]: payload, expected_hash: expected, received_hash: received },
    }).eq("id", row.id);
    await svc.rpc("log_health", {
      p_module: "razorpay", p_status: "down",
      p_message: `ICICI ${source}: SECURE HASH MISMATCH for ${merchantTxnNo} — payload rejected`,
      p_level: "error", p_detail: { merchantTxnNo, source }, p_latency: null, p_source: "app",
    });
    return { ok: false, status: "bad_hash", merchantTxnNo, message: "Payment could not be verified" };
  }

  // Already final? Do nothing, but report the settled state.
  if (row.status === "paid" || row.status === "credited") {
    return {
      ok: true, status: "paid", merchantTxnNo, rowId: row.id, purpose: row.purpose,
      refId: row.ref_id, amount: Number(row.amount), message: "Already recorded",
    };
  }

  const code = String(payload.responseCode ?? "");
  const desc = String(payload.respDescription ?? payload.responseDescription ?? "");
  const paid = isSuccess(code);
  const pending = isPending(code, desc);
  const next = paid ? "paid" : pending ? "pending" : "failed";

  // Trust our own amount, not the posted one, when deciding what was owed — but flag
  // any disagreement, because a mismatch means something is wrong upstream.
  const postedAmount = Number(payload.Amount ?? payload.amount ?? NaN);
  const amountMismatch =
    Number.isFinite(postedAmount) && Math.abs(postedAmount - Number(row.amount)) > 0.01;

  await svc.from("razorpay_payments").update({
    status: next,
    payment_id: payload.paymentID || payload.txnID || null,
    gateway_txn_id: payload.txnID || null,
    payment_mode: payload.paymentMode || null,
    signature: payload.secureHash || null,
    gateway_response: { [source]: payload },
  }).eq("id", row.id);

  if (amountMismatch) {
    await svc.rpc("log_health", {
      p_module: "razorpay", p_status: "warn",
      p_message: `ICICI ${source}: amount mismatch on ${merchantTxnNo} — expected ${row.amount}, gateway said ${postedAmount}`,
      p_level: "error", p_detail: { merchantTxnNo, expected: row.amount, got: postedAmount },
      p_latency: null, p_source: "app",
    });
  }

  if (paid) {
    // Same hand-off as Razorpay: tell the accountants, let them release the money.
    await svc.rpc("notify_roles", {
      _roles: ["accountant", "admin"],
      _type: "payment_received",
      _title: "Payment received (ICICI)",
      _body: `₹${Number(row.amount).toLocaleString("en-IN")} received for ${row.purpose} — ref ${merchantTxnNo}`,
      _link: "/accountant/razorpay-payments",
      _entity_type: "razorpay_payment",
      _entity_id: row.id,
    }).then(() => undefined, () => undefined);
  }

  return {
    ok: true,
    status: paid ? "paid" : pending ? "pending" : "failed",
    merchantTxnNo, rowId: row.id, purpose: row.purpose, refId: row.ref_id,
    amount: Number(row.amount),
    message: paid
      ? "Payment successful"
      : pending
        ? "Payment initiated — awaiting confirmation from your bank"
        : String(payload.respDescription ?? "Payment failed"),
  };
}
