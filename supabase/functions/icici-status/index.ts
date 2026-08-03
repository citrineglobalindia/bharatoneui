// BharatOne — ICICI Orange PG: Transaction Status (spec Chapter 12).
//
// The safety net. Two jobs:
//   1. Sweep — called on a schedule, it asks ICICI about every payment still sitting
//      at `initiated` or `pending` and resolves it. This catches the customer who
//      closed the tab, and UPI payments that come back R1000 (accepted out-of-band,
//      confirmed minutes later).
//   2. Single lookup — an accountant can force a re-check of one reference.
//
// Unlike initiateSale this API is form-urlencoded, per the spec.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AGG_ID, MID, URLS, configured, cors, json, signV1, verifyInbound } from "../_shared/icici.ts";
import { settleIciciPayment } from "../_shared/icici-settle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Ask ICICI what happened to one of our references. */
async function askStatus(merchantTxnNo: string): Promise<Record<string, string>> {
  const params: Record<string, string> = {
    merchantID: MID,
    merchantTxnNo,
    originalTxnNo: merchantTxnNo,
    transactionType: "STATUS",
  };
  if (AGG_ID) params.aggregatorID = AGG_ID;
  params.secureHash = await signV1(params);

  const res = await fetch(URLS.command, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
}

/**
 * The status API reports the original transaction under txnStatus / txnResponseCode,
 * not responseCode (which describes the *status request* itself). Translate so the
 * shared settle logic sees the same shape it gets from the return URL.
 */
function asPaymentResult(merchantTxnNo: string, s: Record<string, string>): Record<string, string> | null {
  const txnStatus = String(s.txnStatus ?? "");
  if (!txnStatus || txnStatus === "REQ") return null;   // still in flight — leave it alone

  const out: Record<string, string> = { ...s, merchantTxnNo };
  out.responseCode = txnStatus === "SUC" ? "000" : String(s.txnResponseCode ?? "999");
  out.respDescription = String(s.txnRespDescription ?? s.respDescription ?? "");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!configured()) return json({ ok: false, message: "ICICI is not configured" }, 200);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({}));
  const single = body?.merchant_txn_no ? String(body.merchant_txn_no) : null;

  // Give the customer a couple of minutes to finish before chasing them.
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const q = svc.from("razorpay_payments")
    .select("merchant_txn_no,status,created_at")
    .eq("gateway", "icici");

  // How far back to keep chasing.
  //
  // This used to be 45 minutes for everything, and anything older was abandoned
  // where it stood. Four payments are sitting at `initiated` because of it — one
  // from this morning and three from 31 July — and since ICICI's advice webhook
  // has never delivered one of our payments, this sweep is the ONLY thing that
  // ever resolves them. A UPI collect approved an hour later, or a customer who
  // wandered off and came back, was money taken with no record.
  //
  // Open payments are now chased for 24 hours. Recently-failed ones are still only
  // revisited for an hour: the response codes are undocumented so an early
  // misclassification is worth a second look, but re-opening a day-old failure is
  // not.
  const OPEN_WINDOW_MS = 24 * 60 * 60 * 1000;
  const FAILED_WINDOW_MS = 60 * 60 * 1000;

  const { data: rows, error } = single
    ? await q.eq("merchant_txn_no", single).limit(1)
    : await q.or(
        `and(status.in.(initiated,pending),created_at.gt.${new Date(Date.now() - OPEN_WINDOW_MS).toISOString()}),` +
        `and(status.eq.failed,created_at.gt.${new Date(Date.now() - FAILED_WINDOW_MS).toISOString()})`,
      )
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true }).limit(50);

  if (error) return json({ ok: false, message: error.message }, 500);

  const results: { ref: string; outcome: string }[] = [];
  for (const r of rows ?? []) {
    const ref = String(r.merchant_txn_no ?? "");
    if (!ref) continue;
    try {
      const status = await askStatus(ref);

      // Verify the signature on the response exactly as it arrived, before anything
      // is rewritten. If ICICI signed it and the signature is wrong, do not act on it.
      if (status.secureHash) {
        const { ok } = await verifyInbound(status);
        if (!ok) {
          await svc.rpc("log_health", {
            p_module: "razorpay", p_status: "down",
            p_message: `ICICI status: SECURE HASH MISMATCH for ${ref} — response ignored`,
            p_level: "error", p_detail: { ref }, p_latency: null, p_source: "app",
          });
          results.push({ ref, outcome: "bad_hash" });
          continue;
        }
      }

      const asResult = asPaymentResult(ref, status);
      if (!asResult) { results.push({ ref, outcome: "still_pending" }); continue; }

      // Signature already checked above (or absent on a call we made ourselves,
      // server-to-server over TLS to ICICI's own endpoint).
      const settled = await settleIciciPayment(svc, asResult, "status", { preVerified: true });
      results.push({ ref, outcome: settled.status });
    } catch (e) {
      results.push({ ref, outcome: `error: ${String((e as Error)?.message ?? e).slice(0, 60)}` });
    }
  }

  const resolved = results.filter((r) => r.outcome === "paid" || r.outcome === "failed").length;
  if (resolved > 0) {
    await svc.rpc("log_health", {
      p_module: "razorpay", p_status: "ok",
      p_message: `ICICI status sweep resolved ${resolved} of ${results.length} pending payment(s)`,
      p_level: "info", p_detail: { results }, p_latency: null, p_source: "scanner",
    });
  }

  return json({ ok: true, checked: results.length, resolved, results });
});
