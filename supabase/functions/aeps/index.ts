// ============================================================================
// AEPS gateway — Eko (Connect API) integration.
// ----------------------------------------------------------------------------
// VERIFIED against Eko staging: the Connect endpoints are v1, use PUT/POST with
// application/x-www-form-urlencoded bodies (NOT JSON), and Security 2.0 signing.
// Secrets: EKO_ENV, EKO_INITIATOR_ID, EKO_DEVELOPER_KEY, EKO_AUTH_KEY.
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
const HOST = IS_PROD ? "https://api.eko.in:25002" : "https://staging.eko.in:25004";
const V1 = `${HOST}/ekoapi/v1`;
const V3 = `${HOST}/ekoapi/v3`;
// v3 KYC endpoints live under a different base on production (ekoicici, not ekoapi).
// Same convention as the aeps-2fa function; override with EKO_BASE_URL if Eko moves it.
const RAW_BASE = (Deno.env.get("EKO_BASE_URL") ?? "").trim().replace(/\/+$/, "");
const KYC_V3 = `${RAW_BASE || (IS_PROD ? "https://api.eko.in:25002/ekoicici" : "https://staging.eko.in:25004/ekoapi")}/v3`;
const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";

const EKO_RSA_PUB_PROD =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaFyrzeDhMaFLx+LZUNOOO14Pj9aPfr+1WOanDgDHxo9NekENYcWUftM9Y17ul2pXr3bqw0GCh4uxNoTQ5cTH4buI42LI8ibMaf7Kppq9MzdzI9/7pOffgdSn+P8J64CJAk3VrVswVgfy8lABt7fL8R6XReI9x8ewwKHhCRTwBgQIDAQAB";
const EKO_RSA_PUB_STAGING =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCXa63O/UXt5S0Vi8DM/PWF4yugx2OcTVbcFPLfXmLm9ClEVJcRuBr7UDHjJ6gZgG/qcVez5r6AfsYl2PtKmYP3mQdbR/BjVOjnrRooXxwyio6DFk4hTTM8fqQGWWNm6XN5XsPK5+qD5Ic/L0vGrS5nMWDwjRt59gzgNMNMpjheBQIDAQAB";
const EKO_RSA_PUB = Deno.env.get("EKO_RSA_PUBLIC_KEY") ?? (IS_PROD ? EKO_RSA_PUB_PROD : EKO_RSA_PUB_STAGING);

const SERVICE_TYPE: Record<string, number> = { cash_withdrawal: 2, balance_enquiry: 3, mini_statement: 4, aadhaar_pay: 5 };
const MOVES_MONEY = (st: number) => st === 2 || st === 5;
const ALLOWED_ROLES = ["retailer", "operator", "admin"];

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// Signed headers. `hashPayload` (encrypted_aadhaar+amount+user_code) adds request_hash.
async function ekoHeaders(contentType: string | null, hashPayload?: string) {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) throw new Error("EKO_KEYS_MISSING");
  const encodedKey = btoa(EKO_AUTH_KEY);
  const ts = String(Date.now());
  const h: Record<string, string> = {
    "developer_key": EKO_DEVELOPER_KEY,
    // The /collection KYC endpoints reject requests without this alias
    // (402 "Authentication parameters missing"); aeps-2fa sends both too.
    "x-developer-key": EKO_DEVELOPER_KEY,
    "secret-key": await hmacB64(encodedKey, ts),
    "secret-key-timestamp": ts,
  };
  if (contentType) h["Content-Type"] = contentType;
  if (hashPayload !== undefined) h["request_hash"] = await hmacB64(encodedKey, ts + hashPayload);
  return h;
}

// --- RSA/PKCS#1 v1.5 Aadhaar encryption (Deno WebCrypto lacks PKCS1, done by hand) ---
function parseRsaPublicKey(spkiB64: string): { n: bigint; e: bigint } {
  const der = b64ToBytes(spkiB64);
  let i = 0;
  const readLen = () => {
    let len = der[i++];
    if (len & 0x80) { const cnt = len & 0x7f; len = 0; for (let k = 0; k < cnt; k++) len = (len << 8) | der[i++]; }
    return len;
  };
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY");
  { const algLen = readLen(); i += algLen; }
  if (der[i++] !== 0x03) throw new Error("BAD_RSA_KEY"); readLen(); i++;
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");
  const nLen = readLen();
  let nBytes = der.slice(i, i + nLen); i += nLen;
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");
  const eLen = readLen();
  const eBytes = der.slice(i, i + eLen);
  if (nBytes[0] === 0x00) nBytes = nBytes.slice(1);
  const toBig = (b: Uint8Array) => b.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n);
  return { n: toBig(nBytes), e: toBig(eBytes) };
}
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n; base %= mod;
  while (exp > 0n) { if (exp & 1n) r = (r * base) % mod; base = (base * base) % mod; exp >>= 1n; }
  return r;
}
function rsaEncryptPkcs1(message: string, spkiB64: string): string {
  const { n, e } = parseRsaPublicKey(spkiB64);
  const k = Math.ceil(n.toString(2).length / 8);
  const msg = enc.encode(message);
  if (msg.length > k - 11) throw new Error("MESSAGE_TOO_LONG");
  const psLen = k - msg.length - 3;
  const ps = new Uint8Array(psLen);
  crypto.getRandomValues(ps);
  for (let j = 0; j < psLen; j++) if (ps[j] === 0) ps[j] = 1 + (j % 254);
  const em = new Uint8Array(k);
  em[0] = 0x00; em[1] = 0x02; em.set(ps, 2); em[2 + psLen] = 0x00; em.set(msg, 3 + psLen);
  const c = modPow(em.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n), e, n);
  let hex = c.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const cb = new Uint8Array(hex.length / 2);
  for (let j = 0; j < cb.length; j++) cb[j] = parseInt(hex.substr(j * 2, 2), 16);
  const out = new Uint8Array(k);
  out.set(cb, k - cb.length);
  return b64(out);
}

// ---------------------------------------------------------------------------
// Eko HTTP — form-encoded for writes, plain GET for reads.
// ---------------------------------------------------------------------------
async function ekoForm(url: string, method: "PUT" | "POST", fields: Record<string, unknown>, hashPayload?: string) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    form.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const headers = await ekoHeaders("application/x-www-form-urlencoded", hashPayload);
  const res = await fetch(url, { method, headers, body: form.toString() });
  return parseEko(res, url);
}
// JSON body — Eko's v3 aeps-fingpay KYC endpoints take application/json
// (confirmed working in aeps-2fa; the form-encoded variant is for the v1 API).
async function ekoJson(url: string, method: "PUT" | "POST", fields: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    body[k] = v;
  }
  const headers = await ekoHeaders("application/json");
  const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
  return parseEko(res, url);
}
async function ekoGet(url: string) {
  const headers = await ekoHeaders(null);
  const res = await fetch(url, { method: "GET", headers });
  return parseEko(res, url);
}
// Multipart (for the activation call, which uploads PAN/Aadhaar image files).
// Do NOT set Content-Type — fetch adds the multipart boundary itself.
async function ekoMultipart(url: string, method: "PUT" | "POST", fields: Record<string, unknown>, files: Record<string, { blob: Blob; name: string }>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    fd.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  for (const [k, f] of Object.entries(files)) if (f) fd.set(k, f.blob, f.name);
  const headers = await ekoHeaders(null);
  const res = await fetch(url, { method, headers, body: fd });
  return parseEko(res, url);
}
async function parseEko(res: Response, url: string) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { /* not JSON */ }
  const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { response_status_id: -1, status: -1, message: `Eko HTTP ${res.status} — ${snippet || "empty response"}` };
}

const ekoOk = (d: any) => !!d && (d.response_status_id === 0 || d.status === 0);
const ekoMsg = (d: any) => {
  const m = d?.message ?? "Unexpected response from Eko";
  const inv = d?.invalid_params ? " (" + Object.values(d.invalid_params).join(", ") + ")" : "";
  return String(m) + inv;
};

const scrub = (o: any) => {
  if (!o || typeof o !== "object") return o;
  const c = JSON.parse(JSON.stringify(o));
  for (const k of ["piddata", "pidData", "PidData", "aadhar", "aadhaar"]) delete c[k];
  return c;
};

// Connectivity check (read-only).
async function ekoPing() {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) return { ok: false, error: "Missing EKO_* secrets." };
  const d = await ekoGet(`${V1}/transactions/PINGCHK000?initiator_id=${encodeURIComponent(EKO_INITIATOR_ID)}`);
  const accepted = d && d.response_status_id !== undefined;
  return { ok: !!accepted, env: EKO_ENV, accepted: !!accepted, message: ekoMsg(d) };
}

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

  if (action === "ping") {
    try { return json(await ekoPing()); } catch (e) { return json({ ok: false, error: String(e) }, 500); }
  }
  // Diagnostic dry-run of onboard against Eko (no DB writes, no user needed).
  if (action === "onboard_test") {
    try {
      const p = body.payload ?? {};
      const uc = String(p.mobile ?? EKO_INITIATOR_ID);
      const data = await ekoForm(`${V1}/user/onboard`, "PUT", {
        initiator_id: EKO_INITIATOR_ID, user_code: uc, pan_number: p.pan, mobile: uc,
        first_name: p.first_name, last_name: p.last_name ?? "", email: p.email, dob: p.dob,
        shop_name: p.shop_name ?? p.first_name,
        residence_address: { line: p.line ?? "NA", city: p.city ?? "NA", state: p.state ?? "NA", pincode: p.pincode ?? "000000" },
      });
      return json({ eko_ok: ekoOk(data), message: ekoMsg(data), raw: data });
    } catch (e) { return json({ error: String(e) }, 500); }
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
    svc.from("aeps_agents").upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  const istDay = (d: Date | string | null) => d ? new Date(new Date(d).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) : null;
  const dailyKycDoneToday = istDay(agent?.last_daily_kyc_at ?? null) === istDay(new Date());

  try {
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

    // ----------------------------------------------------------- onboard
    if (action === "onboard") {
      const { mobile, first_name, last_name, email, pan, dob, address, city, state, pincode, shop_name } = body;
      if (!mobile || !first_name || !pan) return json({ error: "Mobile, first name and PAN are required" }, 400);
      if (!dob) return json({ error: "Date of birth (YYYY-MM-DD) is required" }, 400);
      const em = email ?? user.email ?? "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return json({ error: "A valid email address is required" }, 400);
      const uc = String(mobile);
      const data = await ekoForm(`${V1}/user/onboard`, "PUT", {
        initiator_id: EKO_INITIATOR_ID, user_code: uc, pan_number: pan, mobile: uc, first_name,
        last_name: last_name ?? "", email: em, dob, shop_name: shop_name ?? first_name,
        residence_address: { line: address ?? "NA", city: city ?? "NA", state: state ?? "NA", pincode: pincode ?? "000000" },
      });
      if (!ekoOk(data)) { await setAgent({ last_error: ekoMsg(data), raw: scrub(data) }); return json({ error: ekoMsg(data), raw: scrub(data) }, 400); }
      const code = data?.data?.user_code ?? data?.data?.usercode ?? uc;
      await setAgent({ eko_user_code: code, mobile: uc, onboarded: true, last_error: null, raw: scrub(data) });
      return json({ ok: true, user_code: code, message: ekoMsg(data) });
    }

    // ----------------------------------------------------------- activate
    if (action === "activate") {
      if (!userCode) return json({ error: "Onboard the retailer first" }, 400);
      const { modelname, devicenumber, pan_path, aadhaar_front_path, aadhaar_back_path, office_line, office_city, office_state, office_pincode } = body;
      if (!modelname || !devicenumber) return json({ error: "Biometric device model name and serial number are required" }, 400);
      if (!pan_path || !aadhaar_front_path || !aadhaar_back_path) return json({ error: "Upload the PAN card, Aadhaar front and Aadhaar back images" }, 400);
      if (!office_pincode || !/^\d{6}$/.test(String(office_pincode))) return json({ error: "A valid 6-digit office pincode is required" }, 400);

      // Pull the three uploaded documents from storage (service role).
      const grab = async (path: string) => {
        const { data: file, error } = await svc.storage.from("aeps-activation").download(path);
        if (error || !file) throw new Error(`Could not read uploaded document: ${path}`);
        const name = path.split("/").pop() || "doc";
        return { blob: file, name };
      };
      let panF, frontF, backF;
      try {
        [panF, frontF, backF] = await Promise.all([grab(pan_path), grab(aadhaar_front_path), grab(aadhaar_back_path)]);
      } catch (e) {
        return json({ error: String(e) }, 400);
      }

      const addr = { line: office_line ?? "NA", city: office_city ?? "NA", state: office_state ?? "NA", pincode: String(office_pincode) };
      const data = await ekoMultipart(
        `${V3}/admin/network/agent/${encodeURIComponent(userCode)}/aeps-fingpay/activate`,
        "PUT",
        { initiator_id: EKO_INITIATOR_ID, modelname, devicenumber, office_address: addr, address_as_per_proof: addr },
        { pan_card: panF, aadhar_front: frontF, aadhar_back: backF },
      );
      if (!ekoOk(data)) { await setAgent({ last_error: ekoMsg(data) }); return json({ error: ekoMsg(data), raw: scrub(data) }, 400); }
      // Eko puts the agent into PENDING (2-3 business days). Mark as submitted.
      await setAgent({ service_activated: true, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    // --------------------------------------- one-time eKYC + daily auth
    // Per Eko's EPS spec (aeps-send-otp-kyc → aeps-verify-otp-kyc → aeps-biometric-ekyc):
    // every step needs the agent's encrypted Aadhaar, mobile (customer_id) and latlong,
    // and the otp_ref_id + reference_tid returned by each step must be carried into the
    // next one. We persist them on aeps_agents (kyc_otp_ref / kyc_ref_tid) between calls.
    // Endpoints are /user/collection/aeps-fingpay/kyc/* with application/json bodies.
    const agentAadhaar = String(body.aadhaar ?? (agent as any)?.agent_aadhaar ?? "").replace(/\D/g, "");
    const agentMobile = String(body.customer_id ?? (agent as any)?.mobile ?? "").replace(/\D/g, "").slice(-10);
    const agentLatlong = String(body.latlong ?? (agent as any)?.latlong ?? "");

    if (action === "kyc_send_otp") {
      if (!userCode) return json({ error: "Onboard the retailer first" }, 400);
      if (agentAadhaar.length !== 12) return json({ error: "The agent's 12-digit Aadhaar number is required to start eKYC" }, 400);
      if (agentMobile.length !== 10) return json({ error: "The agent's 10-digit registered mobile number is required to start eKYC" }, 400);
      if (!agentLatlong) return json({ error: "Location is required to start eKYC" }, 400);
      const data = await ekoJson(`${KYC_V3}/user/collection/aeps-fingpay/kyc/otp`, "POST", {
        initiator_id: EKO_INITIATOR_ID,
        user_code: userCode,
        aadhar: rsaEncryptPkcs1(agentAadhaar, EKO_RSA_PUB),
        customer_id: agentMobile,
        latlong: agentLatlong,
      });
      if (!ekoOk(data)) return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      const otpRef = data?.data?.otp_ref_id ?? null;
      const refTid = data?.data?.reference_tid ?? null;
      await setAgent({ agent_aadhaar: agentAadhaar, latlong: agentLatlong, kyc_otp_ref: otpRef, kyc_ref_tid: refTid, last_error: null });
      return json({ ok: true, message: ekoMsg(data), otp_ref_id: otpRef, reference_tid: refTid });
    }

    if (action === "kyc_verify_otp") {
      const { otp } = body;
      if (!otp) return json({ error: "Enter the OTP" }, 400);
      const otpRef = String(body.otp_ref_id ?? (agent as any)?.kyc_otp_ref ?? "");
      const refTid = String(body.reference_tid ?? (agent as any)?.kyc_ref_tid ?? "");
      if (!otpRef || !refTid) return json({ error: "No eKYC session found — send the OTP again first" }, 400);
      if (agentAadhaar.length !== 12 || agentMobile.length !== 10) return json({ error: "Send the OTP again first" }, 400);
      const data = await ekoJson(`${KYC_V3}/user/collection/aeps-fingpay/kyc/otp/verify`, "PUT", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode,
        customer_id: agentMobile,
        aadhar: rsaEncryptPkcs1(agentAadhaar, EKO_RSA_PUB),
        otp: String(otp), otp_ref_id: otpRef, reference_tid: refTid,
        latlong: agentLatlong,
      });
      if (!ekoOk(data)) return json({ error: ekoMsg(data), raw: scrub(data) }, 400);
      // Verify returns a NEW otp_ref_id + reference_tid that the biometric step must use.
      const newOtpRef = data?.data?.otp_ref_id ?? otpRef;
      const newRefTid = data?.data?.reference_tid ?? refTid;
      await setAgent({ kyc_otp_ref: newOtpRef, kyc_ref_tid: newRefTid, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    if (action === "kyc_biometric") {
      const { piddata } = body;
      if (!piddata) return json({ error: "Capture the fingerprint first" }, 400);
      const bankCode = String(body.bank_code ?? (agent as any)?.agent_bank_code ?? "");
      if (!bankCode) return json({ error: "Select the agent's own bank first" }, 400);
      const otpRef = String((agent as any)?.kyc_otp_ref ?? "");
      const refTid = String((agent as any)?.kyc_ref_tid ?? "");
      if (!otpRef || !refTid) return json({ error: "Complete the OTP steps first (Send OTP → Verify)" }, 400);
      if (agentAadhaar.length !== 12 || agentMobile.length !== 10) return json({ error: "The agent's Aadhaar and mobile are required — restart from Send OTP" }, 400);
      const data = await ekoJson(`${KYC_V3}/user/collection/aeps-fingpay/kyc/biometric`, "PUT", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode,
        aadhar: rsaEncryptPkcs1(agentAadhaar, EKO_RSA_PUB),
        customer_id: agentMobile,
        latlong: agentLatlong,
        piddata,
        bank_code: bankCode,
        otp_ref_id: otpRef, reference_tid: refTid,
      });
      if (!ekoOk(data)) { await setAgent({ last_error: ekoMsg(data) }); return json({ error: ekoMsg(data), raw: scrub(data) }, 400); }
      const now = new Date().toISOString();
      await setAgent({ ekyc_done: true, ekyc_done_at: now, last_daily_kyc_at: now, agent_bank_code: bankCode, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    if (action === "kyc_daily") {
      const { piddata } = body;
      if (!piddata) return json({ error: "Capture the fingerprint first" }, 400);
      const bankCode = String(body.bank_code ?? (agent as any)?.agent_bank_code ?? "");
      if (!bankCode) return json({ error: "Select the agent's own bank first" }, 400);
      if (agentAadhaar.length !== 12 || agentMobile.length !== 10) return json({ error: "The agent's Aadhaar and mobile are missing — contact support" }, 400);
      const data = await ekoJson(`${KYC_V3}/user/collection/aeps-fingpay/kyc/biometric/daily`, "PUT", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode,
        aadhar: rsaEncryptPkcs1(agentAadhaar, EKO_RSA_PUB),
        customer_id: agentMobile,
        latlong: agentLatlong,
        piddata,
        bank_code: bankCode,
      });
      if (!ekoOk(data)) { await setAgent({ last_error: ekoMsg(data) }); return json({ error: ekoMsg(data), raw: scrub(data) }, 400); }
      await setAgent({ last_daily_kyc_at: new Date().toISOString(), agent_bank_code: bankCode, last_error: null });
      return json({ ok: true, message: ekoMsg(data) });
    }

    // ----------------------------------------------------------- transact
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
      if (!agent?.ekyc_done || !dailyKycDoneToday) {
        return json({ error: "DAILY_KYC_REQUIRED", message: "Complete today's biometric authentication before transacting." }, 428);
      }
      const clientRefId = `BHO${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
      const encAadhaar = rsaEncryptPkcs1(String(aadhaar), EKO_RSA_PUB);
      const amountStr = String(moves ? amt : 0);
      const { data: txn, error: insErr } = await svc.from("aeps_transactions").insert({
        agent_id: user.id, operation, service_type: st, client_ref_id: clientRefId,
        aadhaar_last4: String(aadhaar).slice(-4), bank_code, customer_mobile: String(customer_mobile),
        amount: amt, user_code: userCode, provider: "eko", status: "pending",
      }).select("id").single();
      if (insErr) return json({ error: "Could not record the transaction", detail: insErr.message }, 500);

      let result: any = null;
      let transportError: string | null = null;
      try {
        // request_hash = timestamp + encrypted_aadhaar + amount + user_code
        result = await ekoForm(`${V3}/customer/collection/aeps-fingpay`, "POST", {
          initiator_id: EKO_INITIATOR_ID, user_code: userCode, service_type: String(st), customer_id: String(customer_mobile),
          bank_code, amount: amountStr, client_ref_id: clientRefId, pipe: "0", notify_customer: body.notify_customer ? "1" : "0",
          aadhar: encAadhaar, piddata, latlong: latlong ?? "", source_ip: sourceIp, reference_id,
        }, encAadhaar + amountStr + userCode);
      } catch (e) { transportError = String(e); }

      if (transportError) {
        await svc.from("aeps_transactions").update({ status: "pending_reconciliation", message: transportError, updated_at: new Date().toISOString() }).eq("id", txn.id);
        return json({ error: "The bank did not respond in time. This transaction is being verified — do NOT retry it.", client_ref_id: clientRefId, status: "pending_reconciliation" }, 504);
      }
      const ok = ekoOk(result);
      const d = result?.data ?? {};
      await svc.from("aeps_transactions").update({
        status: ok ? "success" : "failed", rrn: d.bank_ref_num ?? d.rrn ?? null, tid: d.tid ?? null, provider_ref: d.tid ?? null,
        balance: d.balance_amount != null ? Number(d.balance_amount) : null, mini_statement: d.transactions ?? d.statement ?? null,
        message: ekoMsg(result), response: scrub(result), updated_at: new Date().toISOString(),
      }).eq("id", txn.id);
      if (ok && moves) { const { error: cErr } = await svc.rpc("settle_aeps_commission", { p_txn_id: txn.id }); if (cErr) console.error("commission:", cErr.message); }
      if (!ok) return json({ ok: false, error: ekoMsg(result), client_ref_id: clientRefId }, 400);
      return json({ ok: true, client_ref_id: clientRefId, message: ekoMsg(result), rrn: d.bank_ref_num ?? d.rrn ?? null, tid: d.tid ?? null, balance: d.balance_amount ?? null, statement: d.transactions ?? d.statement ?? null, amount: amt });
    }

    // ----------------------------------------------------------- inquire
    if (action === "inquire") {
      const { client_ref_id } = body;
      if (!client_ref_id) return json({ error: "client_ref_id is required" }, 400);
      const { data: txn } = await svc.from("aeps_transactions").select("*").eq("client_ref_id", client_ref_id).maybeSingle();
      if (!txn) return json({ error: "Unknown transaction" }, 404);
      if (txn.agent_id !== user.id && !roleList.includes("admin")) return json({ error: "Forbidden" }, 403);
      const data = await ekoGet(`${V1}/transactions/${encodeURIComponent(client_ref_id)}?initiator_id=${encodeURIComponent(EKO_INITIATOR_ID)}`);
      const d = data?.data ?? {};
      const txStatus = String(d.tx_status ?? "");
      const mapped = txStatus === "0" ? "success" : txStatus === "1" ? "failed" : "pending_reconciliation";
      await svc.from("aeps_transactions").update({ status: ekoOk(data) ? mapped : txn.status, rrn: d.bank_ref_num ?? txn.rrn, message: ekoMsg(data), response: scrub(data), updated_at: new Date().toISOString() }).eq("id", txn.id);
      if (ekoOk(data) && mapped === "success" && !txn.commission_settled && MOVES_MONEY(txn.service_type)) { await svc.rpc("settle_aeps_commission", { p_txn_id: txn.id }); }
      return json({ ok: ekoOk(data), status: mapped, message: ekoMsg(data) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = String(e);
    console.error("AEPS error:", msg);
    if (msg.includes("EKO_KEYS_MISSING")) return json({ error: "AEPS is not configured. Set EKO_DEVELOPER_KEY, EKO_AUTH_KEY and EKO_INITIATOR_ID." }, 503);
    return json({ error: "AEPS request failed", detail: msg }, 500);
  }
});
