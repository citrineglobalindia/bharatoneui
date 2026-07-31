// BharatOne — ICICI "Orange PG" shared helpers (Direct Integration mode).
//
// Spec: Gateway_Interface_Specification_V0.4_Orange_PG, plus ICICI's step-wise
// PG Direct integration note.
//
// Secrets live only in Supabase edge-function secrets and never reach the browser:
//   ICICI_MERCHANT_ID    numeric merchant id            (identifier, not secret)
//   ICICI_AGGREGATOR_ID  aggregator id, if issued       (identifier, not secret)
//   ICICI_SECRET_KEY     HMAC key from the PG dashboard (SECRET)
//   ICICI_MODE           "test" | "live"                (defaults to test)

export const MID = Deno.env.get("ICICI_MERCHANT_ID") ?? "";
export const AGG_ID = Deno.env.get("ICICI_AGGREGATOR_ID") ?? "";
export const SECRET = Deno.env.get("ICICI_SECRET_KEY") ?? "";
export const MODE = (Deno.env.get("ICICI_MODE") ?? "test").toLowerCase();
export const IS_LIVE = MODE === "live";

export const SITE = Deno.env.get("SITE_URL") ?? "https://www.mybharatone.com";

/** Endpoints — Appendix "URLs" of the interface spec. */
export const URLS = IS_LIVE
  ? {
      sale: "https://pgpay.icicibank.com/pg/api/v2/initiateSale",
      command: "https://pgpay.icicibank.com/pg/api/command",
      settlementDetails: "https://pgpay.icicibank.com/pg/api/settlementDetails",
      userCancel: "https://pgpay.icicibank.com/pg/api/userCancel",
    }
  : {
      sale: "https://pgpayuat.icicibank.com/tsp/pg/api/v2/initiateSale",
      command: "https://pgpayuat.icicibank.com/tsp/pg/api/command",
      settlementDetails: "https://pgpayuat.icicibank.com/tsp/pg/api/settlementDetails",
      userCancel: "https://pgpayuat.icicibank.com/tsp/pg/api/userCancel",
    };

export const configured = () => !!MID && !!SECRET;

/* ------------------------------------------------------------------ hashing */

const enc = new TextEncoder();

/** HMAC-SHA256 → lowercase hex. Spec "Hash Calculation" steps 2-4. */
export async function hmacHex(message: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash Calculation v1 (spec p.68).
 *
 * Concatenate the parameter VALUES — not the names — in ascending order of parameter
 * name, skipping only those that are null or an empty string, then HMAC-SHA256.
 *
 * Note 1 of the spec is important and easy to get wrong: when verifying a RESPONSE,
 * every field that came back must be included, even fields not in the published spec.
 * Whitelisting the documented ones passes in UAT and then fails in production the day
 * ICICI adds a field, so callers must pass the whole payload here.
 */
export function plainHashText(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter((k) => k !== "secureHash")
    .sort()   // plain ASCII sort — confirmed against a live UAT status response
    .map((k) => params[k])
    .filter((v) => v !== null && v !== undefined && String(v) !== "" && v !== false)
    .map((v) => String(v))
    .join("");
}

export async function signV1(params: Record<string, unknown>): Promise<string> {
  return hmacHex(plainHashText(params), SECRET);
}

/** Constant-time compare, so a bad hash cannot be probed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a ?? "");
  const y = enc.encode(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Verify the secureHash on a payload ICICI sent us (return URL or Payment Advice). */
export async function verifyInbound(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; expected: string; received: string }> {
  const received = String(payload.secureHash ?? "");
  const expected = await signV1(payload);
  return { ok: !!received && safeEqual(expected, received), expected, received };
}

/* ------------------------------------------------------------------ formats */

/**
 * txnDate must be "greater than payment initiation time", same calendar date, and the
 * spec's own example uses 235959 — i.e. it is an end-of-day expiry.
 *
 * It must be IST. Our runtime is UTC, so after 18:30 UTC the UTC date is already
 * *behind* the Indian date and a naive implementation quietly sends yesterday every
 * evening. Shift by +5:30 explicitly before formatting.
 */
export function istTxnDate(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${ist.getUTCFullYear()}${p(ist.getUTCMonth() + 1)}${p(ist.getUTCDate())}` + "235959"
  );
}

/** ICICI wants the amount as a plain decimal string with exactly two places. */
export const money = (rupees: number): string => (Math.round(rupees * 100) / 100).toFixed(2);

/** 000 and 0000 mean success. */
export const isSuccess = (code: string | undefined) => code === "000" || code === "0000";

/**
 * Codes meaning "not finished yet" rather than "failed".
 *
 * The interface spec contains no list of response codes, so this cannot be exhaustive.
 * Known so far: R1000 (request initiated, UPI out-of-band) and P0030 ("Awaiting user
 * action" — a UPI collect sitting unapproved in the payer's app).
 *
 * Treating an unknown code as a failure is the dangerous direction: the status sweep
 * only re-checks payments that are still open, so a payment wrongly marked failed
 * would never be revisited even though the customer went on to pay. Anything that
 * looks like waiting is therefore held open and left to the Transaction Status API,
 * which reports the authoritative REQ / SUC / REJ / ERR.
 */
export const isPending = (code: string | undefined, description?: string) => {
  const c = String(code ?? "");
  if (c === "R1000" || /^P00/.test(c)) return true;
  return /await|pending|progress|initiat|in process/i.test(String(description ?? ""));
};

/* ------------------------------------------------------------------ misc */

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Parse whatever ICICI posts back — they use form-urlencoded, but be tolerant. */
export async function readPayload(req: Request): Promise<Record<string, string>> {
  const ctype = (req.headers.get("content-type") ?? "").toLowerCase();
  const out: Record<string, string> = {};
  if (ctype.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    for (const [k, v] of Object.entries(body ?? {})) out[k] = v == null ? "" : String(v);
    return out;
  }
  const form = await req.formData().catch(() => null);
  if (form) {
    for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : "";
    return out;
  }
  const text = await req.text().catch(() => "");
  for (const [k, v] of new URLSearchParams(text).entries()) out[k] = v;
  return out;
}
