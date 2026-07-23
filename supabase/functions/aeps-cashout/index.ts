// ============================================================================
// AEPS Cashout — Eko fund settlement, ISOLATED in its own edge function.
// ----------------------------------------------------------------------------
// Kept separate from the core `aeps` gateway (transactions / eKYC / daily 2FA)
// so edits to Cashout can never touch or break the money-critical core.
// Actions: status | banks | activate | accounts | add_account | settle.
// Gated by app_settings.aeps_settlement_mode = 'merchant' so nothing can move
// money before that config is confirmed with Eko. Service code 39 per agent.
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
const PATH_ROOT = IS_PROD ? "ekoicici" : "ekoapi";
const V1 = `${HOST}/${PATH_ROOT}/v1`;
const V3 = `${HOST}/${PATH_ROOT}/v3`;
const RAW_BASE = (Deno.env.get("EKO_BASE_URL") ?? "").trim().replace(/\/+$/, "");
const KYC_V3 = `${RAW_BASE || (IS_PROD ? "https://api.eko.in:25002/ekoicici" : "https://staging.eko.in:25004/ekoapi")}/v3`;
// Eko's util / Bank-&-IFSC reference endpoints live on the GENERAL EPS base
// (ekoapi, standard :443 port) — NOT the :25002 ekoicici AePS gateway, which
// 404s them ("Endpoint not found"). Try ekoapi first, then ekoicici as a fallback.
const DOC_V3 = IS_PROD ? "https://api.eko.in/ekoapi/v3" : "https://staging.eko.in/ekoapi/v3";
const DOC_V3_ALT = IS_PROD ? "https://api.eko.in/ekoicici/v3" : "https://staging.eko.in/ekoapi/v3";
const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function ekoHeaders(contentType: string | null) {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) throw new Error("EKO_KEYS_MISSING");
  const encodedKey = btoa(EKO_AUTH_KEY);
  const ts = String(Date.now());
  const h: Record<string, string> = {
    "developer_key": EKO_DEVELOPER_KEY,
    "x-developer-key": EKO_DEVELOPER_KEY,
    "secret-key": await hmacB64(encodedKey, ts),
    "secret-key-timestamp": ts,
  };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

async function parseEko(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { /* not JSON */ }
  const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { response_status_id: -1, status: -1, message: `Eko HTTP ${res.status} — ${snippet || "empty response"}` };
}
async function ekoForm(url: string, method: "PUT" | "POST", fields: Record<string, unknown>) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) { if (v === undefined || v === null) continue; form.set(k, typeof v === "object" ? JSON.stringify(v) : String(v)); }
  const res = await fetch(url, { method, headers: await ekoHeaders("application/x-www-form-urlencoded"), body: form.toString() });
  return parseEko(res);
}
async function ekoJson(url: string, method: "PUT" | "POST", fields: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) { if (v === undefined || v === null) continue; body[k] = v; }
  const res = await fetch(url, { method, headers: await ekoHeaders("application/json"), body: JSON.stringify(body) });
  return parseEko(res);
}
async function ekoGet(url: string) {
  const res = await fetch(url, { method: "GET", headers: await ekoHeaders(null) });
  return parseEko(res);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = String(body.action ?? "");

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", user.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ["retailer", "operator", "admin"].includes(r))) {
    return json({ error: "This account is not permitted to run AEPS transactions" }, 403);
  }

  const { data: agent } = await svc.from("aeps_agents").select("*").eq("user_id", user.id).maybeSingle();
  const userCode: string = agent?.eko_user_code ?? "";

  const { data: modeRow } = await svc.from("app_settings").select("value").eq("key", "aeps_settlement_mode").maybeSingle();
  const settlementEnabled = String((modeRow as { value?: string } | null)?.value ?? "off") === "merchant";

  try {
    // Whether Cashout is available for this agent (what the UI gates its card on).
    // Also returns the bank account the agent gave at AEPS activation so the UI
    // can pre-fill the settlement account instead of asking them to re-enter it.
    if (action === "status") {
      return json({
        settlement_enabled: settlementEnabled,
        service_activated: !!agent?.service_activated,
        onboarded: !!agent?.onboarded,
        user_code: userCode || null,
        reg_account: (agent as any)?.settlement_account ?? null,
        reg_ifsc: (agent as any)?.settlement_ifsc ?? null,
      });
    }

    // AePS bank list (with bank_id) for the settlement-account form.
    if (action === "banks") {
      const d = await ekoGet(`${KYC_V3}/tools/reference/banks?initiator_id=${encodeURIComponent(EKO_INITIATOR_ID)}`);
      const raw = d?.param_attributes?.list_elements ?? d?.data?.param_attributes?.list_elements ?? d?.data ?? [];
      const list = Array.isArray(raw)
        ? raw.map((b: any) => ({
            value: b.value ?? b.bank_code ?? b.code ?? b.id,
            label: b.label ?? b.name ?? b.bank_name ?? String(b.value ?? ""),
            ...(b.id != null ? { bank_id: b.id } : {}),
          }))
        : [];
      return json({ ok: ekoOk(d), list, message: ekoMsg(d) });
    }

    // Resolve the Eko bank_id (+ whether penny-drop verification is available)
    // from an IFSC. The settlement-account form needs bank_id, which the plain
    // bank list does NOT carry — this IFSC lookup is the correct source.
    if (action === "bank_by_ifsc") {
      const ifsc = String(body.ifsc ?? "").toUpperCase().trim();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return json({ error: "Enter a valid IFSC" }, 400);
      const ii = encodeURIComponent(EKO_INITIATOR_ID);
      // Try the IFSC lookup first, then the bank-code lookup, then a v1 variant —
      // Eko's tools endpoints have moved between versions before.
      const candidates = [
        `${DOC_V3}/tools/reference/banks/ifsc/${encodeURIComponent(ifsc)}?initiator_id=${ii}`,
        `${DOC_V3_ALT}/tools/reference/banks/ifsc/${encodeURIComponent(ifsc)}?initiator_id=${ii}`,
        `${DOC_V3}/tools/reference/bank/${encodeURIComponent(ifsc.slice(0, 4))}?ifsc=${encodeURIComponent(ifsc)}&initiator_id=${ii}`,
        `${KYC_V3}/tools/reference/banks/ifsc/${encodeURIComponent(ifsc)}?initiator_id=${ii}`,
      ];
      let last: any = null;
      for (const url of candidates) {
        const d = await ekoGet(url);
        last = d;
        const bankId = d?.data?.bank_id;
        if (ekoOk(d) && bankId != null) {
          return json({
            ok: true,
            bank_id: bankId,
            bank: d?.data?.bank ?? d?.data?.name ?? "",
            branch: d?.data?.branch ?? "",
            verification_available: String(d?.data?.isverificationavailable ?? "") === "1",
          });
        }
      }
      return json({ ok: false, error: ekoMsg(last) || "Could not look up this IFSC at Eko", raw: scrub(last), tried: candidates }, 400);
    }

    // Everything below moves money / changes state → require Cashout enabled + activated agent.
    if (!settlementEnabled) return json({ error: "Cashout is not enabled. Ask the administrator to enable Eko fund settlement." }, 403);
    if (!userCode) return json({ error: "This retailer is not onboarded for AEPS" }, 400);
    if (!agent?.service_activated) return json({ error: "Complete AEPS activation first" }, 400);

    // One-time activation of the Fund Settlement service (code 39) for this agent.
    if (action === "activate") {
      const data = await ekoForm(`${V3}/admin/network/agent/${encodeURIComponent(userCode)}/service/39/activate`, "PUT", { initiator_id: EKO_INITIATOR_ID });
      return json({ ok: ekoOk(data), message: ekoMsg(data), raw: scrub(data) }, ekoOk(data) ? 200 : 400);
    }

    if (action === "accounts") {
      const qs = new URLSearchParams({ initiator_id: EKO_INITIATOR_ID, user_code: userCode });
      let d = await ekoGet(`${KYC_V3}/user/payment/aeps/settlement/accounts?${qs}`);
      if (!ekoOk(d)) {
        // First failure is usually service 39 not yet active for this agent —
        // activate it once and retry, instead of silently reporting ₹0.
        await ekoForm(`${V3}/admin/network/agent/${encodeURIComponent(userCode)}/service/39/activate`, "PUT", { initiator_id: EKO_INITIATOR_ID });
        d = await ekoGet(`${KYC_V3}/user/payment/aeps/settlement/accounts?${qs}`);
      }
      if (!ekoOk(d)) return json({ error: ekoMsg(d), raw: scrub(d) }, 400);
      const rows = (d?.data?.fund_transfer_list ?? []) as Record<string, unknown>[];
      for (const r of rows) {
        if (!r?.recipient_id) continue;
        await svc.from("aeps_settlement_accounts").upsert({
          user_id: user.id, recipient_id: String(r.recipient_id),
          account: String(r.account ?? ""), ifsc: String(r.ifsc ?? ""), holder_name: (r.name as string) ?? null,
        }, { onConflict: "user_id,recipient_id" });
      }
      return json({
        ok: true,
        unsettled_fund: Number(d?.data?.unsettled_fund ?? 0) || 0,
        remaining_limit: Number(d?.data?.remaining_limit ?? 0) || 0,
        accounts: rows.map((r) => ({ recipient_id: String(r.recipient_id), name: r.name ?? "", account: r.account ?? "", ifsc: r.ifsc ?? "" })),
        message: ekoMsg(d),
      });
    }

    if (action === "add_account") {
      const { account, ifsc, bank_id } = body;
      if (!account || !/^\d{6,20}$/.test(String(account))) return json({ error: "Enter a valid bank account number" }, 400);
      if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(ifsc))) return json({ error: "Enter a valid IFSC code" }, 400);
      if (!bank_id) return json({ error: "Select the bank" }, 400);
      const data = await ekoJson(`${KYC_V3}/user/payment/aeps/settlement/account`, "POST", {
        initiator_id: EKO_INITIATOR_ID, user_code: userCode, service_code: 39,
        bank_id: Number(bank_id), ifsc: String(ifsc).toUpperCase(), account: String(account),
      });
      if (!ekoOk(data)) {
        // 1335 = holder-name mismatch (Eko returns both names), 1334 = bank sent no name.
        const senderName = data?.data?.sender_name, recipientName = data?.data?.recipient_name;
        const detail = senderName && recipientName ? ` (agent: ${senderName}, account holder: ${recipientName})` : "";
        return json({ error: `${ekoMsg(data)}${detail}`, raw: scrub(data) }, 400);
      }
      const recipientId = String(data?.data?.recipient_id ?? "");
      if (recipientId) {
        await svc.from("aeps_settlement_accounts").upsert({
          user_id: user.id, recipient_id: recipientId, bank_id: Number(bank_id),
          account: String(account), ifsc: String(ifsc).toUpperCase(),
        }, { onConflict: "user_id,recipient_id" });
      }
      return json({ ok: true, recipient_id: recipientId, message: ekoMsg(data) });
    }

    if (action === "settle") {
      const { amount, recipient_id, payment_mode } = body;
      const amt = Number(amount);
      const pm = Number(payment_mode);
      if (!(amt > 0)) return json({ error: "Enter a valid amount" }, 400);
      if (amt > 200000) return json({ error: "Maximum ₹2,00,000 per settlement" }, 400);
      if (![4, 5, 13].includes(pm)) return json({ error: "Pick NEFT, IMPS or RTGS" }, 400);
      const { data: rec } = await svc.from("aeps_settlement_accounts").select("recipient_id").eq("user_id", user.id).eq("recipient_id", String(recipient_id)).maybeSingle();
      if (!rec) return json({ error: "Pick one of your registered settlement accounts" }, 400);

      const clientRefId = `BHS${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
      const { data: row, error: insErr } = await svc.from("aeps_settlements").insert({
        user_id: user.id, client_ref_id: clientRefId, amount: amt,
        recipient_id: String(recipient_id), payment_mode: pm, status: "pending",
      }).select("id").single();
      if (insErr) return json({ error: "Could not record the settlement", detail: insErr.message }, 500);

      let result: any = null;
      let transportError: string | null = null;
      try {
        result = await ekoJson(`${KYC_V3}/user/payment/aeps/settlement`, "POST", {
          initiator_id: EKO_INITIATOR_ID, client_ref_id: clientRefId, user_code: userCode,
          amount: amt, recipient_id: Number(recipient_id), payment_mode: pm,
        });
      } catch (e) { transportError = String(e); }
      if (transportError) {
        await svc.from("aeps_settlements").update({ status: "pending_reconciliation", message: transportError, updated_at: new Date().toISOString() }).eq("id", row.id);
        return json({ error: "Eko did not respond in time. This settlement is being verified — do NOT retry it.", client_ref_id: clientRefId, status: "pending_reconciliation" }, 504);
      }
      const ok = ekoOk(result);
      const d = result?.data ?? {};
      // tx_status: 0=Success, 2=Initiated, 4=Refunded, 5=Hold. Refunded = failed.
      const txStat = String(d.tx_status ?? result?.tx_status ?? "");
      const finalStatus = !ok || txStat === "1" || txStat === "4" ? "failed"
        : txStat === "2" || txStat === "3" || txStat === "5" ? "pending_reconciliation"
        : "success";
      await svc.from("aeps_settlements").update({
        status: finalStatus, tid: d.tid ?? null, bank_ref_num: d.bank_ref_num || null,
        fee: d.totalfee != null && d.totalfee !== "" ? Number(d.totalfee) : (d.fee != null && d.fee !== "" ? Number(d.fee) : null),
        gst: d.gst != null && d.gst !== "" ? Number(d.gst) : null,
        message: ekoMsg(result), response: scrub(result), updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (!ok) return json({ ok: false, error: ekoMsg(result), client_ref_id: clientRefId }, 400);
      return json({ ok: true, client_ref_id: clientRefId, status: finalStatus, message: ekoMsg(result), tid: d.tid ?? null, bank_ref_num: d.bank_ref_num || null, total_fee: d.totalfee ?? d.fee ?? null, amount: amt });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = String(e);
    console.error("AEPS Cashout error:", msg);
    if (msg.includes("EKO_KEYS_MISSING")) return json({ error: "AEPS is not configured." }, 503);
    return json({ error: "Cashout request failed", detail: msg }, 500);
  }
});
