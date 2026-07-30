// BharatOne — ICICI Orange PG: Payment Advice webhook (spec Chapter 8).
//
// Server-to-server push from ICICI, used both to confirm a payment and to tell us
// about a status change that happens after the customer has left. This is what stops
// a payment being stranded when someone closes the tab mid-transaction — the gap that
// exists in the current Razorpay integration.
//
// Give ICICI this exact URL to whitelist:
//   https://<project>.supabase.co/functions/v1/icici-advice
//
// Must be public (verify_jwt false): ICICI has no Supabase session. Authenticity comes
// from the secureHash, which is verified before anything is written.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, readPayload } from "../_shared/icici.ts";
import { settleIciciPayment } from "../_shared/icici-settle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const payload = await readPayload(req);
    if (Object.keys(payload).length === 0) return json({ status: "ignored", message: "Empty payload" }, 200);

    const out = await settleIciciPayment(svc, payload, "advice");

    // A rejected hash is answered with 401 so ICICI retries rather than assuming we
    // accepted it. Everything else gets 200 — including failures we understood —
    // because re-delivery would not change the outcome.
    if (out.status === "bad_hash") return json({ status: "rejected", message: out.message }, 401);

    return json({ status: "ok", recorded: out.status, ref: out.merchantTxnNo }, 200);
  } catch (e) {
    // 500 asks ICICI to try again later.
    return json({ status: "error", message: String((e as Error)?.message ?? e).slice(0, 200) }, 500);
  }
});
