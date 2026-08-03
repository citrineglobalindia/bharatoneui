// BBPS (Bharat Connect) gateway — Eko EPS.
//
// ⚠ Written against Eko's LIVE production behaviour (captured 2 Aug 2026) where
// it differs from their OpenAPI spec, and against their machine-readable docs
// at eps.eko.in/docs/bbps-*.md where those are more precise. See
// _field-notes.md beside this file.
//
// Bills are funded from the retailer's BharatOne wallet: debit -> pay -> refund
// on failure. The refund rule is deliberately conservative; see tx_status below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const EKO_ENV = (Deno.env.get("EKO_ENV") ?? "staging").toLowerCase();
const IS_PROD = EKO_ENV === "production" || EKO_ENV === "prod";
const BBPS_BASE = (Deno.env.get("EKO_BBPS_BASE_URL") ?? "").trim().replace(/\/+$/, "")
  || (IS_PROD ? "https://api.eko.in/ekoicici/v3" : "https://staging.eko.in/ekoapi/v3");

const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";

const ALLOWED_ROLES = ["retailer", "operator", "admin", "accountant"];

const RESERVED = new Set([
  "initiator_id", "client_ref_id", "operator_id", "phone_operator_code", "amount",
  "sender_name", "source_ip", "latlong", "billfetchresponse", "developer_key", "secret-key",
]);

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function ekoHeaders(contentType = "application/json") {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) throw new Error("EKO_KEYS_MISSING");
  const ts = String(Date.now());
  return {
    "developer_key": EKO_DEVELOPER_KEY,
    "x-developer-key": EKO_DEVELOPER_KEY,
    "secret-key": await hmacB64(btoa(EKO_AUTH_KEY), ts),
    "secret-key-timestamp": ts,
    "content-type": contentType,
  } as Record<string, string>;
}
async function parseEko(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { /* not JSON */ }
  const snip = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { response_status_id: -1, status: -1, message: `Eko HTTP ${res.status} — ${snip || "empty response"}` };
}
async function ekoGet(path: string, query: Record<string, string>) {
  const url = `${BBPS_BASE}${path}?${new URLSearchParams({ initiator_id: EKO_INITIATOR_ID, ...query }).toString()}`;
  return parseEko(await fetch(url, { method: "GET", headers: await ekoHeaders() }));
}
async function ekoPostJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BBPS_BASE}${path}`, {
    method: "POST", headers: await ekoHeaders("application/json"),
    body: JSON.stringify({ initiator_id: EKO_INITIATOR_ID, ...body }),
  });
  return parseEko(res);
}

const ekoOk = (d: any) => !!d && (d.response_status_id === 0 || d.status === 0);

// On validation failure Eko returns HTTP 200, a generic message, and names the
// offending field only in invalid_params. Discarding that made a precise error
// unreadable, so it is appended here.
const ekoMsg = (d: any) => {
  const base = String(d?.message ?? "Unexpected response from Eko");
  const bad = d?.invalid_params && typeof d.invalid_params === "object"
    ? Object.keys(d.invalid_params) : [];
  return bad.length ? `${base} (${bad.join(", ")})` : base;
};

const listOf = (d: any): any[] => {
  const c = d?.param_attributes?.list_elements
    ?? d?.data?.categories ?? d?.data?.operators ?? d?.data?.locations
    ?? d?.data?.parameters ?? d?.data;
  return Array.isArray(c) ? c : [];
};
const attrs = (d: any): any => d?.param_attributes ?? d?.data ?? {};

const extraParams = (raw: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(k) || RESERVED.has(k)) continue;
    const s = String(v ?? "").trim();
    if (s) out[k] = s.slice(0, 200);
  }
  return out;
};

// Eko documents the fetched bill amount as `bill_amount` IN PAISE — "divide by
// 100 for rupees" — while the amount sent on payment is in rupees. Reading the
// paise figure as rupees would show a ₹3,361 bill as ₹3,36,100 and debit a
// retailer's wallet for it.
const billAmountRupees = (b: any): number | null => {
  if (b?.bill_amount != null && b.bill_amount !== "") {
    const paise = Number(b.bill_amount);
    return Number.isFinite(paise) ? Math.round(paise) / 100 : null;
  }
  if (b?.amount != null && b.amount !== "") {
    const rupees = Number(b.amount);
    return Number.isFinite(rupees) ? rupees : null;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const sourceIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "1.1.1.1";

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = String(body.action ?? "");

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", user.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ALLOWED_ROLES.includes(r))) return json({ error: "This account is not permitted to use Bill Payments" }, 403);

  const { data: modOn } = await svc.rpc("module_enabled", { _key: "retailer.bbps" });
  if (modOn === false) return json({ error: "Bill Payments are currently unavailable." }, 503);

  const { data: prof } = await svc.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const { data: agent } = await svc.from("aeps_agents").select("mobile, latlong").eq("user_id", user.id).maybeSingle();
  const senderName = String((prof as any)?.display_name ?? "BharatOne Retailer").slice(0, 50);
  const fallbackLatlong = (agent as any)?.latlong || "12.9716,77.5946";

  try {
    if (action === "config") {
      const { data: w } = await svc.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      const { count: slabCount } = await svc
        .from("bbps_commission_slabs").select("id", { count: "exact", head: true }).eq("active", true);
      return json({
        env: EKO_ENV, base: BBPS_BASE,
        keys_set: !!(EKO_DEVELOPER_KEY && EKO_AUTH_KEY && EKO_INITIATOR_ID),
        wallet_balance: Number((w as any)?.balance ?? 0),
        sender_name: senderName,
        commission_slabs: slabCount ?? 0,
      });
    }

    if (action === "categories") {
      const d = await ekoGet("/customer/payment/bbps/categories", {});
      const list = listOf(d).map((c: any) => ({
        id: String(c.operator_category_id ?? c.id ?? c.category_id ?? ""),
        name: String(c.operator_category_name ?? c.category_name ?? c.name ?? ""),
        active: String(c.status ?? "1") === "1",
      })).filter((c: any) => c.id && c.name && c.active)
         .map(({ id, name }: any) => ({ id, name }));
      return json({ ok: ekoOk(d), list, message: ekoMsg(d) });
    }

    if (action === "locations") {
      const d = await ekoGet("/customer/payment/bbps/locations", {});
      const list = listOf(d).map((l: any) => ({
        code: String(l.operator_location_id ?? l.location_id ?? l.id ?? ""),
        name: String(l.operator_location_name ?? l.location_name ?? l.name ?? ""),
      })).filter((l: any) => l.code && l.name);
      return json({ ok: ekoOk(d), list, message: ekoMsg(d) });
    }

    if (action === "operators") {
      const { category, location } = body;
      const d = await ekoGet("/customer/payment/bbps/operators", {
        ...(category ? { category: String(category) } : {}),
        ...(location ? { location: String(location) } : {}),
      });
      const list = listOf(d).map((o: any) => ({
        code: String(o.operator_id ?? o.id ?? ""),
        name: String(o.name ?? o.operator_name ?? ""),
        // Eko's docs: bill fetch is "required for operators where
        // billFetchResponse = 1". This is the authoritative flag; the operator
        // parameters endpoint reports fetchBill=1 even where fetch is not
        // provisioned, which is misleading.
        fetch_bill: Number(o.billFetchResponse ?? 0) === 1,
        location_id: o.location_id != null ? String(o.location_id) : null,
      })).filter((o: any) => o.code && o.name);
      return json({ ok: ekoOk(d), list, message: ekoMsg(d) });
    }

    if (action === "operator_params") {
      const { operator_code } = body;
      if (!operator_code) return json({ error: "Select an operator" }, 400);
      const d = await ekoGet(`/customer/payment/bbps/operator/${encodeURIComponent(String(operator_code))}/parameters`, {});
      const a = attrs(d);
      const list = listOf(d).map((p: any) => ({
        name: String(p.param_name ?? p.name ?? ""),
        label: String(p.param_label ?? p.label ?? p.param_name ?? ""),
        type: String(p.param_type ?? p.type ?? "text").toLowerCase(),
        regex: p.regex ? String(p.regex) : null,
        error_message: p.error_message ? String(p.error_message) : null,
        required: true,
      })).filter((p: any) => p.name);
      return json({
        ok: ekoOk(d), list, message: ekoMsg(d),
        operator_name: a.operator_name ?? null,
        fetch_bill: Number(a.fetchBill ?? 0) === 1,
      });
    }

    if (action === "fetch_bill") {
      const { operator_code, utility_acc_no, confirmation_mobile_no, latlong, dob, cycle_number } = body;
      if (!operator_code) return json({ error: "Select an operator" }, 400);
      if (!utility_acc_no) return json({ error: "Enter the account / consumer number" }, 400);
      if (!/^\d{10}$/.test(String(confirmation_mobile_no ?? ""))) return json({ error: "Enter the customer's 10-digit mobile number" }, 400);

      const d = await ekoGet("/customer/payment/bbps/bill", {
        ...extraParams(body.params),
        utility_acc_no: String(utility_acc_no),
        confirmation_mobile_no: String(confirmation_mobile_no),
        sender_name: senderName,
        // phone_operator_code is what production validates; operator_id is what
        // the spec documents. Sending both survives either being corrected.
        phone_operator_code: String(operator_code),
        operator_id: String(operator_code),
        source_ip: sourceIp,
        latlong: String(latlong || fallbackLatlong),
        ...(dob ? { dob: String(dob) } : {}),
        ...(cycle_number ? { cycle_number: String(cycle_number) } : {}),
      });
      if (!ekoOk(d)) return json({ ok: false, error: ekoMsg(d) }, 400);
      const b = attrs(d);
      return json({
        ok: true, message: ekoMsg(d),
        bill: {
          customer_name: b.customer_name ?? b.customername ?? null,
          amount: billAmountRupees(b),
          bill_number: b.bill_number ?? b.billnumber ?? null,
          bill_date: b.bill_date ?? b.billdate ?? null,
          due_date: b.duedate ?? b.due_date ?? null,
          convenience_fee: b.convenience_fee != null ? Number(b.convenience_fee) : 0,
        },
        // Opaque token — must be echoed back verbatim on pay where the operator
        // requires it.
        billfetchresponse: b.billfetchresponse != null
          ? String(b.billfetchresponse)
          : (typeof b === "object" ? JSON.stringify(b) : String(b)),
      });
    }

    if (action === "pay_bill") {
      const {
        category, operator_code, operator_name, amount, utility_acc_no,
        confirmation_mobile_no, customer_name, bill_number, latlong,
        convenience_fee, billfetchresponse, dob, postalcode,
      } = body;

      if (!operator_code) return json({ error: "Select an operator" }, 400);
      if (!utility_acc_no) return json({ error: "Enter the account / consumer number" }, 400);
      if (!/^\d{10}$/.test(String(confirmation_mobile_no ?? ""))) return json({ error: "Enter the customer's 10-digit mobile number" }, 400);
      const amt = Number(amount);
      if (!(amt > 0)) return json({ error: "Enter a valid amount" }, 400);
      const fee = Number(convenience_fee ?? 0) || 0;

      const clientRefId = `BBP${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
      const { data: txn, error: insErr } = await svc.from("bbps_transactions").insert({
        agent_id: user.id, category: String(category ?? "Bill Payment"), operator_code: String(operator_code),
        operator_name: operator_name ?? null, account_number: String(utility_acc_no),
        customer_mobile: String(confirmation_mobile_no), customer_name: customer_name ?? null,
        bill_number: bill_number ?? null, amount: amt, convenience_fee: fee,
        client_ref_id: clientRefId, status: "pending",
      }).select("id").single();
      if (insErr) return json({ error: "Could not record the payment", detail: insErr.message }, 500);

      const { error: debErr } = await svc.rpc("bbps_debit_wallet", { p_txn: txn.id });
      if (debErr) {
        await svc.from("bbps_transactions").update({ status: "failed", message: debErr.message, updated_at: new Date().toISOString() }).eq("id", txn.id);
        const short = /INSUFFICIENT_WALLET_BALANCE/.test(debErr.message);
        return json({ error: short ? "Not enough wallet balance for this bill. Recharge your wallet and try again." : "Could not reserve the amount", detail: debErr.message }, 400);
      }

      let result: any = null, transportError: string | null = null;
      try {
        result = await ekoPostJson("/customer/payment/bbps", {
          ...extraParams(body.params),
          client_ref_id: clientRefId,
          utility_acc_no: String(utility_acc_no),
          confirmation_mobile_no: String(confirmation_mobile_no),
          sender_name: senderName,
          phone_operator_code: String(operator_code),
          operator_id: String(operator_code),
          // Rupees, per Eko's pay-bill reference — unlike the fetched bill
          // amount, which they return in paise.
          amount: String(amt),
          source_ip: sourceIp,
          latlong: String(latlong || fallbackLatlong),
          ...(billfetchresponse ? { billfetchresponse: String(billfetchresponse) } : {}),
          ...(dob ? { dob: String(dob) } : {}),
          ...(postalcode ? { postalcode: Number(postalcode) } : {}),
        });
      } catch (e) { transportError = String(e); }

      if (transportError) {
        await svc.from("bbps_transactions").update({ status: "pending_reconciliation", message: transportError, updated_at: new Date().toISOString() }).eq("id", txn.id);
        return json({ error: "The biller did not respond in time. This payment is being verified — do NOT retry it.", client_ref_id: clientRefId, status: "pending_reconciliation" }, 504);
      }

      const d = attrs(result);
      const ok = ekoOk(result);

      // tx_status: 0 Success, 1 Fail, 2 Awaited, 3 Refund Pending, 4 Refunded,
      // 5 On Hold. Treating anything non-zero as a failure and refunding would,
      // on an Awaited or On Hold payment, hand the retailer their money back
      // while the biller still collects it. Those two states are left held and
      // reconciled later; only a definite failure is refunded.
      const txRaw = result?.tx_status;
      const tx = txRaw === undefined || txRaw === null || txRaw === "" ? null : Number(txRaw);
      const inFlight = tx === 2 || tx === 5;
      const settledFail = tx === 1 || tx === 3 || tx === 4 || (tx === null && !ok);

      const status = ok && tx !== 1 ? "success" : inFlight ? "pending_reconciliation" : "failed";
      await svc.from("bbps_transactions").update({
        status,
        tid: d.tid ?? null,
        provider_ref: d.operator_ref_id ?? d.tid ?? d.txn_id ?? null,
        message: `${ekoMsg(result)}${result?.txstatus_desc ? ` — ${result.txstatus_desc}` : ""}`,
        response: result,
        updated_at: new Date().toISOString(),
      }).eq("id", txn.id);

      if (status === "success") {
        const { error: cErr } = await svc.rpc("settle_bbps_commission", { p_txn: txn.id });
        if (cErr) console.error("bbps commission:", cErr.message);
        return json({
          ok: true, client_ref_id: clientRefId, tid: d.tid ?? null,
          operator_ref_id: d.operator_ref_id ?? null,
          message: ekoMsg(result), amount: amt,
        });
      }

      if (inFlight) {
        console.warn("bbps awaiting confirmation, money held:", clientRefId, "tx_status", tx);
        return json({
          ok: false, pending: true, client_ref_id: clientRefId, tid: d.tid ?? null,
          error: "The biller has not confirmed this payment yet. The amount is held and will be settled or refunded automatically — do NOT retry it.",
        }, 202);
      }

      if (settledFail) {
        const { error: rErr } = await svc.rpc("bbps_refund_wallet", { p_txn: txn.id });
        if (rErr) console.error("bbps refund:", rErr.message);
        return json({ ok: false, error: ekoMsg(result), refunded: !rErr, client_ref_id: clientRefId }, 400);
      }

      const { error: rErr } = await svc.rpc("bbps_refund_wallet", { p_txn: txn.id });
      if (rErr) console.error("bbps refund:", rErr.message);
      return json({ ok: false, error: ekoMsg(result), refunded: !rErr, client_ref_id: clientRefId }, 400);
    }

    if (action === "operator_by_mobile") {
      const { customer_mobile } = body;
      if (!/^\d{10}$/.test(String(customer_mobile ?? ""))) return json({ error: "Enter a 10-digit mobile number" }, 400);
      const d = await ekoGet(`/customer/payment/bbps/recharge/${encodeURIComponent(String(customer_mobile))}/operator`, {});
      return json({ ok: ekoOk(d), message: ekoMsg(d), raw: attrs(d) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = String(e);
    if (msg.includes("EKO_KEYS_MISSING")) return json({ error: "Bill payments are not configured." }, 503);
    return json({ error: "Bill payment request failed", detail: msg }, 500);
  }
});
