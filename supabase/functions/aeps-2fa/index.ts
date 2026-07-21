// AePS daily KYC (2FA) — isolated from the main `aeps` function on purpose.
//
// v2 (20 Jul 2026): client_ref_id REMOVED from the request body.
// Eko's live spec (https://eps.eko.in/docs/aeps-daily-auth.md) lists exactly seven
// body parameters and client_ref_id is not one of them. v1 sent it because support
// asked for a traceable reference — but after adding it, agent 38520005 started
// returning {"message":"No key for Response"} instead of a well-formed 1714, which
// is what a server returns when it cannot match/parse the payload. We still generate
// and log the reference locally so it can be quoted to Eko; we just no longer send it.
//
// Body is application/json per the same spec. WADH belongs in the PID block, not here.
//
// Every attempt is logged to aeps_kyc_attempts with the partner's full response.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const EKO_ENV = (Deno.env.get("EKO_ENV") ?? "staging").toLowerCase();
const IS_PROD = EKO_ENV === "production" || EKO_ENV === "prod";
const RAW_BASE = (Deno.env.get("EKO_BASE_URL") ?? "").trim().replace(/\/+$/, "");
const BASE = RAW_BASE || (IS_PROD ? "https://api.eko.in:25002/ekoicici" : "https://staging.eko.in:25004/ekoapi");
const V3 = `${BASE}/v3`;
const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";
// Environment-specific Eko RSA public keys — Aadhaar encrypted with the wrong
// key cannot be decrypted by Fingpay and daily KYC fails with empty reasons.
// (Same selection logic as the main `aeps` function.)
const EKO_RSA_PUB_PROD =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaFyrzeDhMaFLx+LZUNOOO14Pj9aPfr+1WOanDgDHxo9NekENYcWUftM9Y17ul2pXr3bqw0GCh4uxNoTQ5cTH4buI42LI8ibMaf7Kppq9MzdzI9/7pOffgdSn+P8J64CJAk3VrVswVgfy8lABt7fL8R6XReI9x8ewwKHhCRTwBgQIDAQAB";
const EKO_RSA_PUB_STAGING =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCXa63O/UXt5S0Vi8DM/PWF4yugx2OcTVbcFPLfXmLm9ClEVJcRuBr7UDHjJ6gZgG/qcVez5r6AfsYl2PtKmYP3mQdbR/BjVOjnrRooXxwyio6DFk4hTTM8fqQGWWNm6XN5XsPK5+qD5Ic/L0vGrS5nMWDwjRt59gzgNMNMpjheBQIDAQAB";
const EKO_RSA_PUB = Deno.env.get("EKO_RSA_PUBLIC_KEY") ?? (IS_PROD ? EKO_RSA_PUB_PROD : EKO_RSA_PUB_STAGING);

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

function parseRsaPublicKey(spkiB64: string): { n: bigint; e: bigint } {
  const der = b64ToBytes(spkiB64); let i = 0;
  const readLen = () => { let len = der[i++]; if (len & 0x80) { const cnt = len & 0x7f; len = 0; for (let k = 0; k < cnt; k++) len = (len << 8) | der[i++]; } return len; };
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); { const a = readLen(); i += a; }
  if (der[i++] !== 0x03) throw new Error("BAD_RSA_KEY"); readLen(); i++;
  if (der[i++] !== 0x30) throw new Error("BAD_RSA_KEY"); readLen();
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");
  const nLen = readLen(); let nBytes = der.slice(i, i + nLen); i += nLen;
  if (der[i++] !== 0x02) throw new Error("BAD_RSA_KEY");
  const eLen = readLen(); const eBytes = der.slice(i, i + eLen);
  if (nBytes[0] === 0x00) nBytes = nBytes.slice(1);
  const toBig = (b: Uint8Array) => b.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n);
  return { n: toBig(nBytes), e: toBig(eBytes) };
}
function modPow(base: bigint, exp: bigint, mod: bigint): bigint { let r = 1n; base %= mod; while (exp > 0n) { if (exp & 1n) r = (r * base) % mod; base = (base * base) % mod; exp >>= 1n; } return r; }
function rsaEncryptPkcs1(message: string, spkiB64: string): string {
  const { n, e } = parseRsaPublicKey(spkiB64);
  const k = Math.ceil(n.toString(2).length / 8);
  const msg = enc.encode(message);
  if (msg.length > k - 11) throw new Error("MESSAGE_TOO_LONG");
  const psLen = k - msg.length - 3;
  const ps = new Uint8Array(psLen); crypto.getRandomValues(ps);
  for (let j = 0; j < psLen; j++) if (ps[j] === 0) ps[j] = 1 + (j % 254);
  const em = new Uint8Array(k); em[0] = 0x00; em[1] = 0x02; em.set(ps, 2); em[2 + psLen] = 0x00; em.set(msg, 3 + psLen);
  const c = modPow(em.reduce((acc, x) => (acc << 8n) | BigInt(x), 0n), e, n);
  let hex = c.toString(16); if (hex.length % 2) hex = "0" + hex;
  const cb = new Uint8Array(hex.length / 2);
  for (let j = 0; j < cb.length; j++) cb[j] = parseInt(hex.substr(j * 2, 2), 16);
  const out = new Uint8Array(k); out.set(cb, k - cb.length); return b64(out);
}

// Eko's spec calls out three things the PID block must carry. Record what we actually
// sent so a failure can be attributed without guessing.
function inspectPid(pid: string) {
  const attr = (name: string) => {
    const m = pid.match(new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']"));
    return m ? m[1] : null;
  };
  return {
    length: pid.length,
    data_type: attr("type"),
    ftype: attr("fType"),
    wadh_present: /wadh\s*=/.test(pid),
    mc_present: /\bmc\s*=/.test(pid),
    errcode: attr("errCode"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: agent } = await svc.from("aeps_agents").select("*").eq("user_id", user.id).maybeSingle();
  if (!agent?.eko_user_code) return json({ error: "This retailer is not onboarded for AePS" }, 400);

  const { piddata, latlong, bank_code } = body;
  if (!piddata) return json({ error: "Capture the fingerprint first" }, 400);
  const bc = bank_code || (agent as any).agent_bank_code;
  if (!bc) return json({ error: "Select your bank" }, 400);

  // Local reference only — quoted to Eko support, never sent in the request body
  // (it is not a documented parameter for this endpoint).
  const clientRefId = `BHOKYC${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  const userCode = String((agent as any).eko_user_code);
  // Normalize to the SAME 10-digit form the eKYC step bound this agent with (the
  // main `aeps` fn uses .replace(/\D/g,'').slice(-10)). If daily 2FA sends a
  // differently-shaped mobile, Fingpay can't match it to the eKYC and rejects the
  // day's auth as if eKYC were never done.
  const aMobile = String((agent as any).mobile ?? "").replace(/\D/g, "").slice(-10);
  const aLatlong = latlong || (agent as any).latlong || "";
  // Guard the agent's Aadhaar: encrypting "null"/"undefined" here produces a valid
  // ciphertext that Fingpay silently fails to decrypt (empty-reason KYC Fail).
  const aAadhaar = String((agent as any).agent_aadhaar ?? "").replace(/\D/g, "");
  if (aAadhaar.length !== 12) return json({ error: "The agent's Aadhaar is missing — re-run activation/eKYC before daily authentication." }, 400);
  if (aMobile.length !== 10) return json({ error: "The agent's registered mobile is missing or invalid — contact support." }, 400);
  const pidInfo = inspectPid(String(piddata));

  try {
    if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) return json({ error: "AEPS is not configured." }, 503);

    // Daily-2FA charge (admin-set via app_settings; 0 = disabled). Pre-check the
    // agent can pay BEFORE we spend an Eko 2FA that we couldn't then bill for.
    const { data: chgRow } = await svc.from("app_settings").select("value").eq("key", "aeps_daily_2fa_charge").maybeSingle();
    const twofaCharge = Number(chgRow?.value ?? 0) || 0;
    if (twofaCharge > 0) {
      const { data: w } = await svc.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      const bal = Number(w?.balance ?? 0);
      if (bal < twofaCharge) {
        return json({ error: `Insufficient wallet balance. Daily authentication costs ₹${twofaCharge}, but your balance is ₹${bal.toFixed(2)}. Please top up and try again.`, needs_topup: true, charge: twofaCharge, balance: bal }, 402);
      }
    }

    const ts = String(Date.now());
    const headers: Record<string, string> = {
      "developer_key": EKO_DEVELOPER_KEY,
      "x-developer-key": EKO_DEVELOPER_KEY,
      "secret-key": await hmacB64(btoa(EKO_AUTH_KEY), ts),
      "secret-key-timestamp": ts,
      "content-type": "application/json",
    };

    // Exactly the seven documented body parameters — nothing more.
    const payload = {
      initiator_id: EKO_INITIATOR_ID,
      user_code: userCode,
      aadhar: rsaEncryptPkcs1(aAadhaar, EKO_RSA_PUB),
      customer_id: aMobile,
      latlong: aLatlong,
      piddata,
      bank_code: bc,
    };

    const res = await fetch(`${V3}/user/collection/aeps-fingpay/kyc/biometric/daily`, {
      method: "PUT", headers, body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { status: -1, message: `Eko HTTP ${res.status} — ${text.slice(0, 200)}` }; }

    const ok = data?.response_status_id === 0 || data?.status === 0 || data?.response_type_id === 1713;

    const { data: attempt } = await svc.from("aeps_kyc_attempts").insert({
      agent_id: user.id, user_code: userCode, client_ref_id: clientRefId,
      http_status: res.status, ok,
      response: data,
      request_meta: {
        latlong: aLatlong, bank_code: bc, customer_id: aMobile,
        content_type: "application/json", body_fields: Object.keys(payload),
        pid: pidInfo, rsa_key_env: IS_PROD ? "prod" : "staging",
      },
    }).select("id").single();

    if (ok) {
      await svc.from("aeps_agents").update({ last_daily_kyc_at: new Date().toISOString(), agent_bank_code: bc, last_error: null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      // Bill the daily-2FA charge (no-op when unset). The pre-check above ensured
      // funds, so this should not fail; if it races, log it and still report
      // success — the 2FA itself already went through at NPCI.
      let charge_result: any = null;
      if (twofaCharge > 0) {
        const { data: cRes, error: cErr } = await svc.rpc("settle_aeps_2fa_charge", { p_agent: user.id, p_ref: attempt?.id ?? null });
        if (cErr) { console.error("2fa charge:", cErr.message); charge_result = { charged: false, error: cErr.message }; }
        else charge_result = cRes;
      }
      return json({ ok: true, client_ref_id: clientRefId, message: String(data?.message ?? "KYC success"), charge: charge_result });
    }

    const reason = String(data?.data?.reason ?? "");
    // Eko documents exactly one 1714 reason as recoverable by re-running eKYC.
    const needsEkyc = reason.toLowerCase().includes("complete bank ekyc");

    await svc.from("aeps_agents").update({ last_error: String(data?.message ?? "KYC Fail"), updated_at: new Date().toISOString() }).eq("user_id", user.id);
    return json({
      ok: false,
      client_ref_id: clientRefId,
      error: String(data?.message ?? "Daily authentication failed"),
      reason,
      needs_ekyc: needsEkyc,
      raw: data,
      for_eko: `client_ref_id: ${clientRefId} | user_code: ${userCode} | endpoint: PUT /v3/user/collection/aeps-fingpay/kyc/biometric/daily | content-type: application/json | body fields: ${Object.keys(payload).join(",")} | pid: ${JSON.stringify(pidInfo)} | response: ${JSON.stringify(data)}`,
    }, 400);
  } catch (e) {
    return json({ error: "Daily authentication request failed", detail: String(e), client_ref_id: clientRefId }, 500);
  }
});
