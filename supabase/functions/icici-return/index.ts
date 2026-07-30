// BharatOne — ICICI Orange PG: return URL (browser lands here after paying).
//
// ICICI form-POSTs the payment result to this endpoint, then we send the customer
// on to a page on our own site. This must be publicly reachable — verify_jwt false —
// because the request arrives from ICICI's domain with no session.
//
// Give ICICI this exact URL to whitelist:
//   https://<project>.supabase.co/functions/v1/icici-return
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SITE, cors, readPayload } from "../_shared/icici.ts";
import { settleIciciPayment } from "../_shared/icici-settle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Bounce the customer back to our own site with a readable outcome. */
function redirectTo(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 303,
    headers: { ...cors, Location: `${SITE}/payment-result?${q}` },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const payload = await readPayload(req);

    // Nothing posted at all — someone opened the URL directly.
    if (Object.keys(payload).length === 0) {
      return redirectTo({ status: "unknown", message: "No payment details were received" });
    }

    const out = await settleIciciPayment(svc, payload, "return");

    return redirectTo({
      status: out.status,
      ref: out.merchantTxnNo,
      purpose: out.purpose ?? "",
      amount: out.amount != null ? String(out.amount) : "",
      message: out.message,
    });
  } catch (e) {
    return redirectTo({
      status: "unknown",
      message: `We could not confirm the payment: ${String((e as Error)?.message ?? e).slice(0, 120)}`,
    });
  }
});
