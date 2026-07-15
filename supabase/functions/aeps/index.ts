// ============================================================================
// AEPS gateway — Eko (Fingpay) integration
// ----------------------------------------------------------------------------
// Every Eko call goes through here. The browser NEVER holds the developer key
// or the auth key and never talks to Eko directly. The browser only captures the
// PID block from the local RD-service and posts it here with the agent's JWT.
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   EKO_ENV            "staging" | "production"    (default: staging)
//   EKO_INITIATOR_ID   your registered mobile number
//   EKO_DEVELOPER_KEY  static API key from Eko
//   EKO_AUTH_KEY       the key Eko emailed you. secret-key is DERIVED FROM THIS
//                      on every request — it is time-bound, so never store a
//                      pre-computed secret_key / secret_key_timestamp.
//
// Eko "Security 2.0" auth:
//   encodedKey           = base64(EKO_AUTH_KEY)
//   secret-key-timestamp = epoch millis, as a string
//   secret-key           = base64(HMAC_SHA256(key=encodedKey, msg=timestamp))
//   request_hash         = base64(HMAC_SHA256(key=encodedKey,
//                            msg=timestamp + encrypted_aadhaar + amount + user_code))
//
// Aadhaar is RSA/PKCS#1-v1.5 encrypted with Eko's public key, then base64'd.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const EKO_ENV = (Deno.env.get("EKO_ENV") ?? "staging").toLowerCase();
const IS_PROD = EKO_ENV === "production" || EKO_ENV === "prod";
const EKO_BASE = IS_PROD ? "https://api.eko.in:25002/ekoapi/v3" : "https://staging.eko.in:25004/ekoapi/v3";
const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";

// Eko's RSA public key for the Aadhaar field (staging and production differ).
const EKO_RSA_PUB_PROD =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaFyrzeDhMaFLx+LZUNOOO14Pj9aPfr+1WOanDgDHxo9NekENYcWUftM9Y17ul2pXr3bqw0GCh4uxNoTQ5cTH4buI42LI8ibMaf7Kppq9MzdzI9/7pOffgdSn+P8J64CJAk3VrVswVgfy8lABt7fL8R6XReI9x8ewwKHhCRTwBgQIDAQAB";
const EKO_RSA_PUB_STAGING =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCXa63O/UXt5S0Vi8DM/PWF4yugx2OcTVbcFPLfXmLm9ClEVJcRuBr7UDHjJ6gZgG/qcVez5r6AfsYl2PtKmYP3mQdbR/BjVOjnrRooXxwyio6DFk4hTTM8fqQGWWNm6XN5XsPK5+qD5Ic/L0vGrS5nMWDwjRt59gzgNMNMpjheBQIDAQAB";
const EKO_RSA_PUB = Deno.env.get("EKO_RSA_PUBLIC_KEY") ?? (IS_PROD ? EKO_RSA_PUB_PROD : EKO_RSA_PUB_STAGING);

// service_type per Eko docs
const SERVICE_TYPE: Record<string, number> = {
  cash_withdrawal: 2,
  balance_enquiry: 3,
  mini_statement: 4,
  aadhaar_pay: 5,
};
const MOVES_MONEY = (st: number) => st === 2 || st === 5;
const ALLOWED_ROLES = ["retailer", "operator", "admin"];

// ---------------------------------------------------------------------------
// crypto helpers
// ---------------------------------------------------------------------------
const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// Build Eko's auth headers. request_hash is only sent on transaction endpoints.
async function ekoAuth(hashPayload?: string) {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) throw new Error("EKO_KEYS_MISSING");
  const encodedKey = btoa(EKO_AUTH_KEY);
  const ts = String(Date.now());
  const headers: Record<string, string> = {
    "developer_key": EKO_DEVELOPER_KEY,
    "secret-key": await hmacB64(encodedKey, ts),
    "secret-key-timestamp": ts,
    "Content-Type": "application/json",
  };
  if (hashPayload !== undefined) headers["request_hash"] = await hmacB64(encodedKey, ts + hashPayload);
  return { headers };
}

// WebCrypto only offers RSA-OAEP, but Eko requires PKCS#1 v1.5, so the padding is
// applied by hand and the modular exponentiation done with BigInt.
function parseRsaPublicKey(spkiB64: string): { n: bigint; e: bigint } {
  const der = b64ToBytes(spkiB64);
  let i = 0;
  const readLen = () => {
    let len = der[i++];
    if (len & 0x80) {
      const cnt = len & 0x7f;
      len = 0;
      for (let k = 0; k < cnt; k++) len = (len << 8) | der[i++];
    }
    return len;
  };
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();     // SEQUENCE (SPKI)
  // NOTE: `i += readLen()` would be WRONG — JS reads `i` before readLen() advances it.
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY");                // AlgorithmIdentifier
  { const algLen = readLen(); i += algLen; }                            // skip the algorithm
  if (der[i++] !== 0x03) throw new Error("BAD_RSA_KEY"); readLen(); i++; // BIT STRING + unused-bits
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();     // SEQUENCE (RSAPublicKey)
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");                // INTEGER modulus
  const nLen = readLen();
  let nBytes = der.slice(i, i + nLen); i += nLen;
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");                // INTEGER exponent
  const eLen = readLen();
  const eBytes = der.slice(i, i + eLen);
  if (nBytes[0] === 0x00) nBytes = nBytes.slice(1);                      // strip DER sign byte
  const toBig = (b: Uint8Array) => b.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n);
  return { n: toBig(nBytes), e: toBig(eBytes) };
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n; base %= mod;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return r;
}

function rsaEncryptPkcs1(message: string, spkiB64: string): string {
  const { n, e } = parseRsaPublicKey(spkiB64);
  const k = Math.ceil(n.toString(2).length / 8);
  const msg = enc.encode(message);
  if (msg.length > k - 11) throw new Error("MESSAGE_TOO_LONG");

  // EM = 0x00 || 0x02 || PS (>=8 non-zero random bytes) || 0x00 || M
  const psLen = k - msg.length - 3;
  const ps = new Uint8Array(psLen);
  crypto.getRandomValues(ps);
  for (let j = 0; j < psLen; j++) if (ps[j] === 0) ps[j] = 1 + (j % 254);

  const em = new Uint8Array(k);
  em[0] = 0x00; em[1] = 0x02;
  em.set(ps, 2);
  em[2 + psLen] = 0x00;
  em.set(msg, 3 + psLen);

  const c = modPow(em.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n), e, n);
  let hex = c.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const cb = new Uint8Array(hex.length / 2);
  for (let j = 0; j < cb.length; j++) cb[j] = parseInt(hex.substr(j * 2, 2), 16);
  const out = new Uint8Array(k);
  out.set(cb, k - cb.length);                                            // left-pad to modulus size
  return b64(out);
}

// ---------------------------------------------------------------------------
// Eko HTTP
// ---------------------------------------------------------------------------
async function ekoCall(path: string, body: Record<string, unknown> | null, opts: { hash?: string; method?: string } = {}) {
  const { headers } = await ekoAuth(opts.hash);
  const res = await fetch(`${EKO_BASE}${path}`, {
    method: opts.method ?? "POST",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  if (!data) throw new Error(`EKO_BAD_RESPONSE ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

// Eko success convention: response_status_id === 0
const ekoOk = (d: any) => !!d && (d.response_status_id === 0 || d.status === 0);
const ekoMsg = (d: any) => String(d?.message ?? "Unexpected response from Eko");

// Connection test: sign a request the way every real call is signed and hit an
// auth-only Eko endpoint (the merchant's balance). We don't care about the business
// result — we only care whether Eko ACCEPTED the developer_key + secret-key signature.
async function ekoPing() {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) {
    return {
      ok: false,
      configured: false,
      error: "Missing secrets. Set EKO_INITIATOR_ID, EKO_DEVELOPER_KEY and EKO_AUTH_KEY.",
    };
  }
  const { headers } = await ekoAuth();
  const id = encodeURIComponent(EKO_INITIATOR_ID);
  // Probe auth-only GET endpoints; the signature is validated by Eko's auth layer
  // regardless of the business result.
  const probes = [
    { label: "balance", url: `${EKO_BASE}/user/account/balance?initiator_id=${id}&customer_id_type=mobile_number&customer_id=${id}` },
    { label: "transaction_inquiry", url: `${EKO_BASE}/transactions/PINGCHK000?initiator_id=${id}` },
  ];
  const attempts: any[] = [];
  for (const p of probes) {
    const res = await fetch(p.url, { method: "GET", headers });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    const msg = (data?.message ?? text).toString();
    attempts.push({ probe: p.label, http: res.status, message: msg.slice(0, 160) });
    if (res.status === 401 || res.status === 403 || /invalid.*(developer|secret|signature|key)|unauthor|not.*whitelist/i.test(text)) {
      return { ok: false, env: EKO_ENV, accepted: false, error: "Eko REJECTED the credentials — check EKO_DEVELOPER_KEY and EKO_AUTH_KEY.", via: p.label, detail: msg.slice(0, 300) };
    }
    // A structured Eko business reply means the signature passed the auth layer.
    if (data && (data.response_status_id !== undefined || /transaction|not found|param|invalid request/i.test(msg))) {
      return { ok: true, env: EKO_ENV, accepted: true, via: p.label, message: msg.slice(0, 200), response_status_id: data.response_status_id ?? null, attempts };
    }
  }
  return { ok: false, env: EKO_ENV, accepted: null, message: "Reached Eko but could not confirm the signature from these endpoints. The first onboarding call will confirm.", attempts };
}

// Never persist raw biometrics or the full Aadhaar.
const scrub = (o: any) => {
  if (!o || typeof o !== "object") return o;
  const c = JSON.parse(JSON.stringify(o));
  for (const k of ["piddata", "pidData", "PidData", "aadhar", "aadhaar"]) delete c[k];
  return c;
};

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = String(body.action ?? "");

  // Connection test ("ping") is a harmless, read-only Eko connectivity check that
  // returns only whether the credentials were accepted — no user data, no side
  // effects. It is allowed for any caller with a valid Supabase key (the platform's
  // verify_jwt already gates this), so keys can be verified without a logged-in
  // retailer or a fingerprint device.
  if (action === "ping") {
    try { return json(await ekoPing()); } catch (e) { return json({ ok: false, error: String(e) }, 500); }
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", user.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ALLOWED_ROLES.includes(r))) {
    return json({ error: "This account is not permitted to run AEPS transactions" }, 403);
  }

  const { data: agent } = await svc.from("aeps_agents").select("*").eq("user_id", user.id).maybeSingle();
  const userCode: string = agent?.eko_user_code ?? "";
  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

  const setAgent = (patch: Record<string, unknown>) =>
    svc.from("aeps_agents").upsert(
      { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  // Daily biometric auth is valid for the current IST calendar day only.
  const istDay = (d: Date | string | null) =>
    d ? new Date(new Date(d).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) : null;
  const dailyKycDoneToday = istDay(agent?.last_daily_kyc_at ?? null) === istDay(new Date());

  try {
    // ---------------------------------------------------------------- config
    if (action === "config") {
      return json({
        env: EKO_ENV,
        keys_set: !!(EKO_DEVELOPER_KEY && EKO_AUTH_KEY && EKO_INITIATOR_ID),
        user_code: userCode || null,
        onboarded: !!agent?.onboarded,
        service_activated: !!agent?.service_activated,
        ekyc_done: !!agent?.ekyc_done,
        daily_kyc_done: dailyKycDoneToday,
        can_transact: !!agent?.onboarded && !!agent?.service_activated && !!agent?.ekyc_done && dailyKycDoneToday,
        last_error: agent?.last_error ?? null,
      });
    }

    // -------------------------------------------------------------- onboard
    if (action === "onboard") {
      const { mobile, first_name, last_name, email, pan, dob, address, city, state, pincode, shop_name } = body;
      if (!mobile || !first_name || !pan) return json({ error: "Mobile, first name and PAN are required" }, 400);

      const data = await ekoCall("/user/onboard", {
        initiator_id: EKO_INITIATOR_ID,
        pan_number: pan,
        mobile: String(mobile),
        first_name,
        last_name: last_name ?? "",
        email: email ?? user.email ?? "",
        dob: dob ?? "",
        shop_name: shop_name ?? first_name,
        residence_address: JSON.stringify({
          line: address ?? "", city: city ?? "", state: state ?? "", pincode: pincode ?? "",
        }),
      });
      if (!ekoOk(data)) {
        await setAgent({ last_error: ekoMsg(data), raw: scrub(data) });
        return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      }
      const code = data?.data?.user_code ?? data?.data?.usercode ?? null;
      await setAgent({ eko_user_code: code, mobile: String(mobile), onboarded: true, last_error: null, raw: scrub(data) });
      return json({ ok: true, user_code: code, message: ekoMsg(data) });
    }

    // ------------------------------------------------------------- activate
    if (action === "activate") {
      if (!userCode) return json({ error: "Onboard the retailer first" }, 400);
      const data = await ekoCall("/user/service/activate", {
        initiator_id: EKO_INITIATOR_ID,
        user_code: userCode,
        service_code: 46, // AePS Fingpay
      }, { method: "PUT" });
      if (!ekoOk(data)) {
        await setAgent({ last_error: ekoMsg(data) });
        return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      }
      await setAgent({ service_activated: true, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    // ------------------------------------------- one-time eKYC + daily auth
    if (action === "kyc_send_otp") {
      if (!userCode) return json({ error: "Onboard the retailer first" }, 400);
      const data = await ekoCall("/user/aeps-fingpay/kyc/otp", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode,
      });
      if (!ekoOk(data)) return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      return json({ ok: true, message: ekoMsg(data), otp_ref_id: data?.data?.otp_ref_id ?? null });
    }

    if (action === "kyc_verify_otp") {
      const { otp, otp_ref_id } = body;
      if (!otp) return json({ error: "Enter the OTP" }, 400);
      const data = await ekoCall("/user/aeps-fingpay/kyc/otp/verify", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode, otp: String(otp),
        ...(otp_ref_id ? { otp_ref_id } : {}),
      }, { method: "PUT" });
      if (!ekoOk(data)) return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      return json({ ok: true, message: ekoMsg(data) });
    }

    if (action === "kyc_biometric" || action === "kyc_daily") {
      const { piddata, aadhaar, latlong } = body;
      if (!piddata) return json({ error: "Capture the fingerprint first" }, 400);
      const daily = action === "kyc_daily";

      const data = await ekoCall(
        daily ? "/user/aeps-fingpay/kyc/daily" : "/user/aeps-fingpay/kyc/biometric",
        {
          initiator_id: EKO_INITIATOR_ID,
          user_code: userCode,
          piddata,
          ...(aadhaar ? { aadhar: rsaEncryptPkcs1(String(aadhaar), EKO_RSA_PUB) } : {}),
          latlong: latlong ?? "",
          source_ip: sourceIp,
        },
        { method: "PUT" },
      );
      if (!ekoOk(data)) {
        await setAgent({ last_error: ekoMsg(data) });
        return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      }
      const now = new Date().toISOString();
      await setAgent(daily
        ? { last_daily_kyc_at: now, last_error: null }
        : { ekyc_done: true, ekyc_done_at: now, last_daily_kyc_at: now, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    // ------------------------------------------------------------ transact
    if (action === "transact") {
      const { operation, aadhaar, bank_code, amount, customer_mobile, piddata, latlong, reference_id } = body;
      const st = SERVICE_TYPE[String(operation)];
      if (!st) return json({ error: "Unknown operation" }, 400);
      if (!userCode) return json({ error: "This retailer is not onboarded for AEPS" }, 400);
      if (!piddata) return json({ error: "Capture the customer's fingerprint first" }, 400);
      if (!/^\d{12}$/.test(String(aadhaar ?? ""))) return json({ error: "Enter a valid 12-digit Aadhaar number" }, 400);
      if (!bank_code) return json({ error: "Select the customer's bank" }, 400);
      if (!/^\d{10}$/.test(String(customer_mobile ?? ""))) return json({ error: "Enter the customer's 10-digit mobile number" }, 400);

      const moves = MOVES_MONEY(st);
      const amt = moves ? Number(amount) : 0;
      if (moves && !(amt > 0)) return json({ error: "Enter a valid amount" }, 400);

      // NPCI mandates a fresh daily biometric auth before any transaction.
      if (!agent?.ekyc_done || !dailyKycDoneToday) {
        return json({
          error: "DAILY_KYC_REQUIRED",
          message: "Complete today's biometric authentication before transacting.",
        }, 428);
      }

      const clientRefId = `BHO${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
      const encAadhaar = rsaEncryptPkcs1(String(aadhaar), EKO_RSA_PUB);
      const amountStr = String(moves ? amt : 0);

      // Record the attempt BEFORE calling Eko: a timeout must be reconcilable, never lost.
      const { data: txn, error: insErr } = await svc.from("aeps_transactions").insert({
        agent_id: user.id,
        operation,
        service_type: st,
        client_ref_id: clientRefId,
        aadhaar_last4: String(aadhaar).slice(-4),
        bank_code,
        customer_mobile: String(customer_mobile),
        amount: amt,
        user_code: userCode,
        provider: "eko",
        status: "pending",
      }).select("id").single();
      if (insErr) return json({ error: "Could not record the transaction", detail: insErr.message }, 500);

      let result: any = null;
      let transportError: string | null = null;
      try {
        // request_hash = timestamp + encrypted_aadhaar + amount + user_code
        result = await ekoCall("/customer/collection/aeps-fingpay", {
          initiator_id: EKO_INITIATOR_ID,
          user_code: userCode,
          service_type: String(st),
          customer_id: String(customer_mobile),
          bank_code,
          amount: amountStr,
          client_ref_id: clientRefId,
          pipe: "0",
          notify_customer: body.notify_customer ? "1" : "0",
          aadhar: encAadhaar,
          piddata,
          latlong: latlong ?? "",
          source_ip: sourceIp,
          ...(reference_id ? { reference_id } : {}), // 2FA ref for cash withdrawal
        }, { hash: encAadhaar + amountStr + userCode });
      } catch (e) {
        transportError = String(e);
      }

      // A timeout is NOT a failure: the money may already have moved at the bank.
      // Park it for reconciliation and tell the retailer not to retry.
      if (transportError) {
        await svc.from("aeps_transactions").update({
          status: "pending_reconciliation", message: transportError, updated_at: new Date().toISOString(),
        }).eq("id", txn.id);
        return json({
          error: "The bank did not respond in time. This transaction is being verified — do NOT retry it.",
          client_ref_id: clientRefId,
          status: "pending_reconciliation",
        }, 504);
      }

      const ok = ekoOk(result);
      const d = result?.data ?? {};
      await svc.from("aeps_transactions").update({
        status: ok ? "success" : "failed",
        rrn: d.bank_ref_num ?? d.rrn ?? null,
        tid: d.tid ?? null,
        provider_ref: d.tid ?? null,
        balance: d.balance_amount != null ? Number(d.balance_amount) : null,
        mini_statement: d.transactions ?? d.statement ?? null,
        message: ekoMsg(result),
        response: scrub(result),
        updated_at: new Date().toISOString(),
      }).eq("id", txn.id);

      // Commission is settled only on successful money movement.
      if (ok && moves) {
        const { error: cErr } = await svc.rpc("settle_aeps_commission", { p_txn_id: txn.id });
        if (cErr) console.error("AEPS commission settlement failed:", cErr.message);
      }

      if (!ok) return json({ ok: false, error: ekoMsg(result), client_ref_id: clientRefId }, 400);

      return json({
        ok: true,
        client_ref_id: clientRefId,
        message: ekoMsg(result),
        rrn: d.bank_ref_num ?? d.rrn ?? null,
        tid: d.tid ?? null,
        balance: d.balance_amount ?? null,
        statement: d.transactions ?? d.statement ?? null,
        amount: amt,
      });
    }

    // ------------------------------------------------------------- inquire
    if (action === "inquire") {
      const { client_ref_id } = body;
      if (!client_ref_id) return json({ error: "client_ref_id is required" }, 400);

      const { data: txn } = await svc.from("aeps_transactions")
        .select("*").eq("client_ref_id", client_ref_id).maybeSingle();
      if (!txn) return json({ error: "Unknown transaction" }, 404);
      if (txn.agent_id !== user.id && !roleList.includes("admin")) return json({ error: "Forbidden" }, 403);

      const data = await ekoCall(
        `/transactions/${encodeURIComponent(client_ref_id)}?initiator_id=${encodeURIComponent(EKO_INITIATOR_ID)}`,
        null, { method: "GET" },
      );
      const d = data?.data ?? {};
      // Eko tx_status: 0 = success, 1 = failed/refunded, 3 = initiated/pending
      const txStatus = String(d.tx_status ?? "");
      const mapped = txStatus === "0" ? "success" : txStatus === "1" ? "failed" : "pending_reconciliation";

      await svc.from("aeps_transactions").update({
        status: ekoOk(data) ? mapped : txn.status,
        rrn: d.bank_ref_num ?? txn.rrn,
        message: ekoMsg(data),
        response: scrub(data),
        updated_at: new Date().toISOString(),
      }).eq("id", txn.id);

      if (ekoOk(data) && mapped === "success" && !txn.commission_settled && MOVES_MONEY(txn.service_type)) {
        await svc.rpc("settle_aeps_commission", { p_txn_id: txn.id });
      }
      return json({ ok: ekoOk(data), status: mapped, message: ekoMsg(data) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = String(e);
    console.error("AEPS error:", msg);
    if (msg.includes("EKO_KEYS_MISSING")) {
      return json({ error: "AEPS is not configured. Set EKO_DEVELOPER_KEY, EKO_AUTH_KEY and EKO_INITIATOR_ID." }, 503);
    }
    return json({ error: "AEPS request failed", detail: msg }, 500);
  }
});
