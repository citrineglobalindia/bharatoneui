// Domestic Money Transfer (DMT) gateway — Eko EPS, Fino rail.
//
// WHAT REPLACED WHAT
// ------------------
// There was no DMT backend at all. /money-transfer was a static form whose Send
// button called toast.success("IMPS transfer initiated") and did nothing else.
// This is the real thing.
//
// THE FLOW EKO ACTUALLY IMPLEMENTS (/customer/payment/dmt-fino)
//   1  GET  /sender/{mobile}                 profile — does this sender exist?
//   2  POST /sender/{mobile}                 onboard: name, dob, residence_address
//   3  PUT  /sender/{mobile}/otp             eKYC — Aadhaar + biometric PID block
//   4  PUT  /sender/{mobile}/otp/verify      eKYC OTP: otp, otp_ref_id, kyc_request_id
//   5  GET  /sender/{mobile}/recipients      list
//   6  POST /sender/{mobile}/recipient       add: recipient_mobile, name, ifsc, account
//   7  POST /dmt-fino/otp                    transaction OTP → otp_ref_id
//   8  POST /dmt-fino                        transfer: recipient_id, amount, otp, otp_ref_id
//
// TWO THINGS THAT SHAPE THE WHOLE DESIGN
//
// * There is no IMPS/NEFT/RTGS choice. Step 8 takes initiator_id, recipient_id,
//   amount, customer_id, otp, otp_ref_id and client_ref_id — nothing else. The
//   rail decides. The old mock offered the retailer a three-way toggle that was
//   pure decoration, and it is not coming back.
//
// * A transfer spans two calls with a human in between reading an OTP off a
//   phone. So the wallet is debited at step 8, NOT step 7. An OTP the customer
//   never reads back costs nobody anything, and dmt_expire_stale_otps tidies the
//   row up after fifteen minutes.
//
// MONEY RULES, same as BBPS and for the same reasons:
//   debit → call → refund only on a DEFINITE failure. Awaited and On Hold are
//   held as pending_reconciliation and never auto-refunded, because refunding a
//   transfer the bank later completes means paying it out of our own pocket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const EKO_ENV = (Deno.env.get("EKO_ENV") ?? "staging").toLowerCase();
const IS_PROD = EKO_ENV === "production" || EKO_ENV === "prod";
// Same base as BBPS: v3 under /ekoicici on production, /ekoapi on staging.
const BASE = (Deno.env.get("EKO_DMT_BASE_URL") ?? "").trim().replace(/\/+$/, "")
  || (IS_PROD ? "https://api.eko.in/ekoicici/v3" : "https://staging.eko.in/ekoapi/v3");

const EKO_INITIATOR_ID = Deno.env.get("EKO_INITIATOR_ID") ?? "";
const EKO_DEVELOPER_KEY = Deno.env.get("EKO_DEVELOPER_KEY") ?? "";
const EKO_AUTH_KEY = Deno.env.get("EKO_AUTH_KEY") ?? "";

const ALLOWED_ROLES = ["retailer", "operator", "admin"];
const MOBILE = /^[6-9]\d{9}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));

async function hmacB64(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function ekoHeaders() {
  if (!EKO_AUTH_KEY || !EKO_DEVELOPER_KEY || !EKO_INITIATOR_ID) throw new Error("EKO_KEYS_MISSING");
  const ts = String(Date.now());
  return {
    "developer_key": EKO_DEVELOPER_KEY,
    "x-developer-key": EKO_DEVELOPER_KEY,
    "secret-key": await hmacB64(btoa(EKO_AUTH_KEY), ts),
    "secret-key-timestamp": ts,
    "content-type": "application/json",
  } as Record<string, string>;
}
async function parseEko(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { /* not JSON */ }
  const snip = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { response_status_id: -1, status: -1, message: `Eko HTTP ${res.status} — ${snip || "empty response"}` };
}
async function ekoGet(path: string, query: Record<string, string> = {}) {
  const url = `${BASE}${path}?${new URLSearchParams({ initiator_id: EKO_INITIATOR_ID, ...query })}`;
  return parseEko(await fetch(url, { method: "GET", headers: await ekoHeaders() }));
}
async function ekoSend(path: string, method: "POST" | "PUT", body: Record<string, unknown>) {
  return parseEko(await fetch(`${BASE}${path}`, {
    method, headers: await ekoHeaders(),
    body: JSON.stringify({ initiator_id: EKO_INITIATOR_ID, ...body }),
  }));
}

const ekoOk = (d: any) => !!d && (d.response_status_id === 0 || d.status === 0);

// Eko returns HTTP 200 with a generic message on a validation failure and names
// the offending field only in invalid_params. Discarding that is what turned an
// afternoon of BBPS debugging into a whole afternoon.
const ekoMsg = (d: any) => {
  const base = String(d?.message ?? "Unexpected response from Eko");
  const bad = d?.invalid_params && typeof d.invalid_params === "object" ? Object.keys(d.invalid_params) : [];
  return bad.length ? `${base} (${bad.join(", ")})` : base;
};

/**
 * Is this a "the service is not switched on" answer rather than a real error?
 *
 * Worth telling apart. A retailer seeing "Something went wrong" when the truth
 * is "BharatOne has not been given this service yet" will ring support, and
 * support will spend a day looking for a bug that does not exist.
 */
const looksUnprovisioned = (d: any) => {
  const m = `${d?.message ?? ""}`.toLowerCase();
  return /not (allowed|enabled|activated|subscribed|permitted)|no mapping rule|service.*(disabled|unavailable)|unauthori[sz]ed service/.test(m);
};

const refId = (p: string) => `${p}${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = String(body.action ?? "");

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", user.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ALLOWED_ROLES.includes(r))) {
    return json({ error: "This account is not permitted to send money" }, 403);
  }

  const { data: modOn } = await svc.rpc("module_enabled", { _key: "retailer.dmt" });
  if (modOn === false) return json({ error: "Money transfer is currently unavailable." }, 503);

  const { data: settings } = await svc.from("app_settings").select("key,value")
    .in("key", ["dmt_enabled", "dmt_max_per_transaction"]);
  const setting = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]));
  const serviceLive = String(setting.dmt_enabled ?? "false") === "true";
  const maxPerTxn = Number(setting.dmt_max_per_transaction ?? 25000);

  // `config` must answer even when the service is off — it is how the screen
  // knows to say so.
  if (action === "config") {
    const { data: w } = await svc.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    const { count: slabs } = await svc.from("dmt_commission_slabs")
      .select("id", { count: "exact", head: true }).eq("active", true);
    return json({
      enabled: serviceLive,
      keys_set: !!(EKO_DEVELOPER_KEY && EKO_AUTH_KEY && EKO_INITIATOR_ID),
      env: EKO_ENV, base: BASE,
      wallet_balance: Number((w as any)?.balance ?? 0),
      max_per_transaction: maxPerTxn,
      commission_slabs: slabs ?? 0,
    });
  }

  if (!serviceLive) {
    return json({
      error: "Money transfer is not switched on yet. Our banking partner has to enable the remittance service before any transfer can reach a bank.",
      not_enabled: true,
    }, 503);
  }

  const mine = async (senderId: string) => {
    const { data } = await svc.from("dmt_senders").select("*").eq("id", senderId).maybeSingle();
    if (!data || data.agent_id !== user.id) return null;
    return data as any;
  };

  try {
    // ── Sender ────────────────────────────────────────────────────────────
    if (action === "sender_lookup") {
      const mobile = String(body.mobile ?? "");
      if (!MOBILE.test(mobile)) return json({ error: "Enter the customer's 10-digit mobile number" }, 400);

      const { data: agent } = await svc.from("aeps_agents").select("eko_user_code").eq("user_id", user.id).maybeSingle();
      const d = await ekoGet(`/customer/payment/dmt-fino/sender/${mobile}`, {
        client_ref_id: refId("DMS"),
        user_code: String((agent as any)?.eko_user_code ?? ""),
      });
      if (!ekoOk(d) && looksUnprovisioned(d)) {
        return json({ error: "Money transfer is not enabled on this account yet.", not_enabled: true }, 503);
      }

      const p = d?.data ?? {};
      const known = ekoOk(d) && (p.name || p.customer_id || p.is_verified != null);
      const verified = String(p.state ?? p.status ?? "").toLowerCase().includes("verif")
        || p.is_verified === true || Number(p.is_verified) === 1;

      // Mirror locally so the retailer's own list survives, and so a sender
      // another retailer registered is never silently claimed.
      const { data: existing } = await svc.from("dmt_senders").select("*").eq("mobile", mobile).maybeSingle();
      if (existing && (existing as any).agent_id !== user.id) {
        return json({
          error: "This customer is already registered by another BharatOne retailer. They must be served there, or contact support.",
        }, 409);
      }
      if (known) {
        await svc.from("dmt_senders").upsert({
          agent_id: user.id, mobile,
          name: p.name ?? (existing as any)?.name ?? null,
          provider_ref: p.customer_id ?? p.id ?? null,
          kyc_state: verified ? "verified" : "unregistered",
          is_verified: verified,
          updated_at: new Date().toISOString(),
        }, { onConflict: "mobile" });
      }
      const { data: local } = await svc.from("dmt_senders").select("*").eq("mobile", mobile).maybeSingle();
      return json({ ok: true, known, verified, sender: local ?? null, message: ekoMsg(d) });
    }

    if (action === "sender_onboard") {
      const { mobile, name, dob, residence_address } = body;
      if (!MOBILE.test(String(mobile ?? ""))) return json({ error: "Enter the customer's 10-digit mobile number" }, 400);
      if (!String(name ?? "").trim()) return json({ error: "Enter the customer's name" }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dob ?? ""))) return json({ error: "Enter the date of birth as YYYY-MM-DD" }, 400);
      if (!String(residence_address ?? "").trim()) return json({ error: "Enter the customer's address" }, 400);

      // Same guard as the lookup: a sender belongs to whoever registered them.
      // Without this, the upsert below would quietly move another retailer's
      // customer — and their monthly limit — onto this account.
      const { data: owner } = await svc.from("dmt_senders").select("agent_id").eq("mobile", String(mobile)).maybeSingle();
      if (owner && (owner as any).agent_id !== user.id) {
        return json({ error: "This customer is already registered by another BharatOne retailer." }, 409);
      }

      const d = await ekoSend(`/customer/payment/dmt-fino/sender/${mobile}`, "POST", {
        client_ref_id: refId("DMS"),
        name: String(name).trim(), dob: String(dob),
        residence_address: String(residence_address).trim(),
      });
      if (!ekoOk(d)) {
        if (looksUnprovisioned(d)) return json({ error: "Money transfer is not enabled on this account yet.", not_enabled: true }, 503);
        return json({ ok: false, error: ekoMsg(d) }, 400);
      }
      await svc.from("dmt_senders").upsert({
        agent_id: user.id, mobile: String(mobile), name: String(name).trim(),
        provider_ref: d?.data?.customer_id ?? null,
        kyc_state: "unregistered", is_verified: false, last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "mobile" });
      return json({ ok: true, message: ekoMsg(d) });
    }

    // eKYC uses the same fingerprint device the retailer already has for AePS.
    if (action === "sender_ekyc") {
      const { sender_id, aadhaar, piddata } = body;
      const s = await mine(String(sender_id ?? ""));
      if (!s) return json({ error: "Customer not found" }, 404);
      if (!/^\d{12}$/.test(String(aadhaar ?? ""))) return json({ error: "Enter the customer's 12-digit Aadhaar number" }, 400);
      if (!piddata) return json({ error: "Capture the customer's fingerprint" }, 400);

      const d = await ekoSend(`/customer/payment/dmt-fino/sender/${s.mobile}/otp`, "PUT", {
        client_ref_id: refId("DMK"), aadhar: String(aadhaar), piddata: String(piddata),
      });
      if (!ekoOk(d)) {
        await svc.from("dmt_senders").update({ last_error: ekoMsg(d), updated_at: new Date().toISOString() }).eq("id", s.id);
        return json({ ok: false, error: ekoMsg(d) }, 400);
      }
      await svc.from("dmt_senders").update({
        kyc_state: "otp_sent",
        otp_ref_id: d?.data?.otp_ref_id ?? null,
        kyc_request_id: d?.data?.kyc_request_id ?? null,
        last_error: null, updated_at: new Date().toISOString(),
      }).eq("id", s.id);
      return json({ ok: true, message: ekoMsg(d) });
    }

    if (action === "sender_verify_otp") {
      const { sender_id, otp } = body;
      const s = await mine(String(sender_id ?? ""));
      if (!s) return json({ error: "Customer not found" }, 404);
      if (!/^\d{4,8}$/.test(String(otp ?? ""))) return json({ error: "Enter the one-time password" }, 400);
      if (!s.otp_ref_id) return json({ error: "Start the verification again — the reference has expired." }, 409);

      const d = await ekoSend(`/customer/payment/dmt-fino/sender/${s.mobile}/otp/verify`, "PUT", {
        client_ref_id: refId("DMV"), otp: String(otp),
        otp_ref_id: s.otp_ref_id, kyc_request_id: s.kyc_request_id,
      });
      if (!ekoOk(d)) return json({ ok: false, error: ekoMsg(d) }, 400);

      await svc.from("dmt_senders").update({
        kyc_state: "verified", is_verified: true,
        name: d?.data?.name ?? s.name,
        otp_ref_id: null, kyc_request_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", s.id);

      // Eko charges ₹11 + GST once per registered sender. Collected here so it
      // lands in the retailer's ledger with a reason, rather than BharatOne
      // absorbing it silently on every new customer. A failure to collect is
      // deliberately not fatal — the customer is verified at the bank either
      // way, and leaving the two out of step would be worse.
      let kycCharge = 0;
      try {
        const { data: c } = await svc.rpc("dmt_charge_sender_kyc", { _sender: s.id });
        if ((c as any)?.charged) kycCharge = Number((c as any).amount ?? 0);
      } catch (e) { console.error("dmt kyc charge:", String(e)); }

      return json({ ok: true, message: ekoMsg(d), kyc_charge: kycCharge });
    }

    // ── Beneficiaries ─────────────────────────────────────────────────────
    if (action === "recipients") {
      const s = await mine(String(body.sender_id ?? ""));
      if (!s) return json({ error: "Customer not found" }, 404);

      const d = await ekoGet(`/customer/payment/dmt-fino/sender/${s.mobile}/recipients`, { client_ref_id: refId("DMR") });
      const list = Array.isArray(d?.data?.recipient_list) ? d.data.recipient_list
                 : Array.isArray(d?.data) ? d.data : [];

      // Eko is the authority on who the recipients are. The local rows exist so
      // a transfer receipt can still name the beneficiary after Eko drops them.
      for (const r of list) {
        const acct = String(r.account ?? r.account_number ?? "");
        const ifsc = String(r.ifsc ?? "").toUpperCase();
        if (!acct || !IFSC.test(ifsc)) continue;
        await svc.from("dmt_beneficiaries").upsert({
          sender_id: s.id,
          name: String(r.recipient_name ?? r.name ?? "Beneficiary"),
          account_number: acct, ifsc,
          bank_name: r.bank ?? r.bank_name ?? null,
          provider_ref: r.recipient_id != null ? String(r.recipient_id) : null,
          verified: !!(r.verified ?? r.is_verified),
          verified_name: r.verified_name ?? r.bank_account_name ?? null,
          active: true,
        }, { onConflict: "sender_id,account_number,ifsc" });
      }
      const { data: local } = await svc.rpc("dmt_my_beneficiaries", { _sender: s.id });
      return json({ ok: ekoOk(d), list: local ?? [], message: ekoMsg(d) });
    }

    if (action === "add_recipient") {
      const { sender_id, name, account, ifsc, recipient_mobile, bank_name } = body;
      const s = await mine(String(sender_id ?? ""));
      if (!s) return json({ error: "Customer not found" }, 404);
      if (!s.is_verified) return json({ error: "Verify the customer before adding a beneficiary." }, 409);
      if (!String(name ?? "").trim()) return json({ error: "Enter the beneficiary's name" }, 400);
      if (!/^\d{6,20}$/.test(String(account ?? ""))) return json({ error: "Enter a valid account number" }, 400);
      if (!IFSC.test(String(ifsc ?? "").toUpperCase())) return json({ error: "Enter a valid IFSC code" }, 400);
      if (!MOBILE.test(String(recipient_mobile ?? ""))) return json({ error: "Enter the beneficiary's 10-digit mobile number" }, 400);

      const d = await ekoSend(`/customer/payment/dmt-fino/sender/${s.mobile}/recipient`, "POST", {
        client_ref_id: refId("DMB"),
        recipient_mobile: String(recipient_mobile),
        recipient_name: String(name).trim(),
        ifsc: String(ifsc).toUpperCase(),
        account: String(account),
      });
      if (!ekoOk(d)) return json({ ok: false, error: ekoMsg(d) }, 400);

      const p = d?.data ?? {};
      const { data: row } = await svc.from("dmt_beneficiaries").upsert({
        sender_id: s.id, name: String(name).trim(),
        account_number: String(account), ifsc: String(ifsc).toUpperCase(),
        bank_name: bank_name ?? p.bank ?? null,
        provider_ref: p.recipient_id != null ? String(p.recipient_id) : null,
        // Only claim the account is verified when the BANK has given a name
        // back. A name we typed in ourselves proves nothing.
        verified: !!(p.verified_name ?? p.bank_account_name),
        verified_name: p.verified_name ?? p.bank_account_name ?? null,
        active: true,
      }, { onConflict: "sender_id,account_number,ifsc" }).select("*").single();

      return json({ ok: true, beneficiary: row, message: ekoMsg(d) });
    }

    if (action === "remove_recipient") {
      // Eko's specification exposes no delete. Hiding it locally is honest about
      // that: it disappears from this retailer's list and stays at Eko.
      const { beneficiary_id } = body;
      const { data: b } = await svc.from("dmt_beneficiaries").select("id,sender_id").eq("id", beneficiary_id).maybeSingle();
      if (!b) return json({ error: "Beneficiary not found" }, 404);
      const s = await mine(String((b as any).sender_id));
      if (!s) return json({ error: "Beneficiary not found" }, 404);
      await svc.from("dmt_beneficiaries").update({ active: false }).eq("id", (b as any).id);
      return json({ ok: true, message: "Removed from your list." });
    }

    // ── Transfer, part one: ask for the OTP ───────────────────────────────
    if (action === "send_otp") {
      const { sender_id, beneficiary_id, amount } = body;
      const s = await mine(String(sender_id ?? ""));
      if (!s) return json({ error: "Customer not found" }, 404);
      if (!s.is_verified) return json({ error: "This customer has not completed verification." }, 409);

      const { data: b } = await svc.from("dmt_beneficiaries")
        .select("*").eq("id", beneficiary_id).eq("sender_id", s.id).maybeSingle();
      if (!b) return json({ error: "Beneficiary not found" }, 404);
      if (!(b as any).provider_ref) {
        return json({ error: "This beneficiary is not registered with the bank yet. Add them again." }, 409);
      }

      const amt = Math.round(Number(amount));
      if (!(amt > 0)) return json({ error: "Enter the amount to send" }, 400);
      if (amt > maxPerTxn) return json({ error: `The most that can be sent in one transfer is ₹${maxPerTxn.toLocaleString("en-IN")}.` }, 400);

      // The monthly cap is checked and RESERVED here rather than at payment, so
      // two tabs cannot both slip under the same remaining balance.
      const { data: lim, error: limErr } = await svc.rpc("dmt_check_and_reserve_limit", { _sender: s.id, _amount: amt });
      if (limErr) return json({ error: limErr.message }, 400);
      if (!(lim as any)?.ok) return json({ error: (lim as any)?.message ?? "Monthly limit reached" }, 400);

      // Give the reservation back if the OTP never goes out. Decrementing by the
      // amount rather than restoring the value we read a moment ago, because
      // another till may have reserved against the same sender in between.
      const releaseLimit = async () => {
        await svc.rpc("dmt_release_limit", { _sender: s.id, _amount: amt });
      };

      const { data: q } = await svc.rpc("dmt_quote", { _mode: "ANY", _amount: amt });
      const fee = Number((q as any)?.fee ?? 0);

      const clientRefId = refId("DMT");
      const d = await ekoSend("/customer/payment/dmt-fino/otp", "POST", {
        client_ref_id: clientRefId,
        recipient_id: Number((b as any).provider_ref),
        amount: amt,
        customer_id: s.mobile,
      });
      if (!ekoOk(d)) {
        await releaseLimit();
        if (looksUnprovisioned(d)) return json({ error: "Money transfer is not enabled on this account yet.", not_enabled: true }, 503);
        return json({ ok: false, error: ekoMsg(d) }, 400);
      }

      const { data: txn } = await svc.from("dmt_transactions").insert({
        agent_id: user.id, sender_id: s.id, beneficiary_id: (b as any).id,
        sender_mobile: s.mobile, sender_name: s.name,
        beneficiary_name: (b as any).name, account_number: (b as any).account_number,
        ifsc: (b as any).ifsc, bank_name: (b as any).bank_name,
        recipient_ref: String((b as any).provider_ref),
        mode: "ANY", amount: amt, fee,
        client_ref_id: clientRefId,
        otp_ref_id: d?.data?.otp_ref_id ?? null,
        otp_sent_at: new Date().toISOString(),
        status: "awaiting_otp",
      }).select("id").single();

      return json({
        ok: true, transfer_id: (txn as any)?.id, client_ref_id: clientRefId,
        fee, total_debit: amt + fee,
        message: `We have sent a one-time password to ${s.mobile}. Ask the customer to read it out.`,
      });
    }

    // ── Transfer, part two: the money moves ───────────────────────────────
    if (action === "transfer") {
      const { transfer_id, otp } = body;
      if (!/^\d{4,8}$/.test(String(otp ?? ""))) return json({ error: "Enter the one-time password" }, 400);

      const { data: t } = await svc.from("dmt_transactions").select("*").eq("id", transfer_id).maybeSingle();
      if (!t || (t as any).agent_id !== user.id) return json({ error: "Transfer not found" }, 404);
      if ((t as any).status !== "awaiting_otp") {
        return json({ error: "This transfer has already been submitted.", status: (t as any).status }, 409);
      }

      // Debit BEFORE the call. Calling first and debiting on success loses the
      // money every time a response goes missing.
      const { error: debErr } = await svc.rpc("dmt_debit_wallet", { p_txn: (t as any).id });
      if (debErr) {
        const short = /INSUFFICIENT_WALLET_BALANCE/.test(debErr.message);
        await svc.from("dmt_transactions").update({
          status: "failed", message: debErr.message, updated_at: new Date().toISOString(),
        }).eq("id", (t as any).id);
        return json({
          error: short
            ? "Not enough wallet balance for this transfer and its charge. Top up and start again."
            : "Could not reserve the amount",
          detail: debErr.message,
        }, 400);
      }

      let result: any = null, transportError: string | null = null;
      try {
        result = await ekoSend("/customer/payment/dmt-fino", "POST", {
          client_ref_id: (t as any).client_ref_id,
          recipient_id: Number((t as any).recipient_ref),
          amount: Number((t as any).amount),
          customer_id: (t as any).sender_mobile,
          otp: String(otp),
          otp_ref_id: (t as any).otp_ref_id,
        });
      } catch (e) { transportError = String(e); }

      if (transportError) {
        // Held, never refunded on a guess. The bank may well have completed it.
        await svc.from("dmt_transactions").update({
          status: "pending_reconciliation", message: transportError, updated_at: new Date().toISOString(),
        }).eq("id", (t as any).id);
        return json({
          error: "The bank did not respond in time. This transfer is being verified — do NOT send it again.",
          client_ref_id: (t as any).client_ref_id, status: "pending_reconciliation",
        }, 504);
      }

      const d = result?.data ?? {};
      const ok = ekoOk(result);
      // 0 Success, 1 Fail, 2 Awaited, 3 Refund Pending, 4 Refunded, 5 On Hold.
      const raw = d.tx_status ?? result?.tx_status;
      const tx = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      const inFlight = tx === 2 || tx === 5;
      const status = ok && tx !== 1 ? "success" : inFlight ? "pending_reconciliation" : "failed";

      await svc.from("dmt_transactions").update({
        status,
        tid: d.tid ?? null,
        utr: d.bank_ref_num ?? d.utr ?? d.rrn ?? null,
        provider_ref: d.bank_ref_num ?? d.tid ?? null,
        message: ekoMsg(result),
        response: result,
        updated_at: new Date().toISOString(),
      }).eq("id", (t as any).id);

      if (status === "success") {
        const { error: cErr } = await svc.rpc("settle_dmt_commission", { p_txn: (t as any).id });
        if (cErr) console.error("dmt commission:", cErr.message);
        return json({
          ok: true, client_ref_id: (t as any).client_ref_id,
          utr: d.bank_ref_num ?? d.utr ?? null, tid: d.tid ?? null,
          amount: Number((t as any).amount), fee: Number((t as any).fee),
          message: ekoMsg(result),
        });
      }

      if (inFlight) {
        console.warn("dmt awaiting confirmation, money held:", (t as any).client_ref_id, "tx_status", tx);
        return json({
          ok: false, pending: true, client_ref_id: (t as any).client_ref_id,
          error: "The bank has not confirmed this transfer yet. The amount is held and will be settled or refunded automatically — do NOT send it again.",
        }, 202);
      }

      const { error: rErr } = await svc.rpc("dmt_refund_wallet", { p_txn: (t as any).id });
      if (rErr) console.error("dmt refund:", rErr.message);
      return json({ ok: false, error: ekoMsg(result), refunded: !rErr, client_ref_id: (t as any).client_ref_id }, 400);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = String(e);
    if (msg.includes("EKO_KEYS_MISSING")) return json({ error: "Money transfer is not configured." }, 503);
    return json({ error: "Money transfer request failed", detail: msg }, 500);
  }
});
