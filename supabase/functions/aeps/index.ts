// ============================================================================
// AEPS gateway — SKELETON / READY-TO-INTEGRATE
// ----------------------------------------------------------------------------
// All AEPS calls go through here (NEVER from the browser). The frontend sends
// { operation, aadhaarLast4, amount, bankIin, pidBlock } with the agent's JWT.
// This function: authenticates the agent -> validates -> records a pending txn
// -> (TODO) calls the provider -> updates the txn -> settles commission.
//
// >>> WHEN YOU GET THE API, FILL IN callProvider() AND SET THE SECRETS. <<<
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   AEPS_BASE_URL, AEPS_API_KEY, AEPS_MERCHANT_ID, AEPS_ENC_KEY (per provider)
// Then set public.aeps_provider_config.active = true.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ALLOWED_OPS = ["balance_enquiry", "cash_withdrawal", "mini_statement", "aadhaar_pay"];
const ALLOWED_ROLES = ["retailer", "operator", "admin"];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---- Provider secrets (set these once you receive the API) ----
const AEPS_BASE_URL = Deno.env.get("AEPS_BASE_URL") ?? "";
const AEPS_API_KEY = Deno.env.get("AEPS_API_KEY") ?? "";

// ----------------------------------------------------------------------------
// callProvider(): THE ONE PLACE TO IMPLEMENT THE REAL AEPS CALL.
// Replace the throw with: encrypt the PID block per the provider spec, sign the
// payload, POST to the provider endpoint, and map their response to this shape.
// ----------------------------------------------------------------------------
async function callProvider(_op: string, _payload: Record<string, unknown>): Promise<{
  ok: boolean; rrn?: string; providerRef?: string; message?: string; raw?: unknown;
}> {
  // TODO(integration): implement using AEPS_BASE_URL / AEPS_API_KEY + RD-service PID block.
  // Example outline:
  //   const enc = encryptPid(_payload.pidBlock, AEPS_ENC_KEY);
  //   const res = await fetch(`${AEPS_BASE_URL}/${_op}`, { method:"POST", headers:{Authorization:`Bearer ${AEPS_API_KEY}`}, body: JSON.stringify({...}) });
  //   const data = await res.json();
  //   return { ok: data.status==="SUCCESS", rrn: data.rrn, providerRef: data.txnId, message: data.message, raw: mask(data) };
  throw new Error("INTEGRATION_PENDING");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  // Identify the calling agent from their JWT.
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await userClient.auth.getUser();
  const agent = u?.user;
  if (!agent) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // Role gate.
  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", agent.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ALLOWED_ROLES.includes(r))) {
    return json({ error: "This account is not permitted to run AEPS transactions" }, 403);
  }

  // Validate input.
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const operation = String(body.operation ?? "");
  const amount = Number(body.amount ?? 0);
  const aadhaarLast4 = String(body.aadhaarLast4 ?? "").slice(-4);
  const bankIin = body.bankIin ? String(body.bankIin) : null;
  if (!ALLOWED_OPS.includes(operation)) return json({ error: "Unknown operation" }, 400);
  if (["cash_withdrawal", "aadhaar_pay"].includes(operation) && !(amount > 0))
    return json({ error: "Amount is required for this operation" }, 400);

  // Load provider config.
  const { data: cfg } = await svc.from("aeps_provider_config").select("*").eq("id", 1).maybeSingle();
  const configured = !!cfg?.active && !!AEPS_BASE_URL && !!AEPS_API_KEY;

  // Record a transaction row up-front (audit trail regardless of outcome).
  const commission = Number((cfg?.commission_config ?? {})[operation] ?? 0);
  const { data: txn, error: insErr } = await svc
    .from("aeps_transactions")
    .insert({
      agent_id: agent.id, operation, amount, aadhaar_last4: aadhaarLast4, bank_iin: bankIin,
      provider: cfg?.provider_name ?? null, commission,
      status: configured ? "pending" : "not_configured",
    })
    .select("id")
    .single();
  if (insErr) return json({ error: insErr.message }, 500);

  // Not configured yet — return cleanly so the UI can show a friendly state.
  if (!configured) {
    return json({
      status: "not_configured",
      txnId: txn.id,
      message: "AEPS provider is not configured yet. Set the secrets + aeps_provider_config.active and implement callProvider().",
    }, 200);
  }

  // ---- Configured path (runs once callProvider is implemented) ----
  try {
    const result = await callProvider(operation, { aadhaarLast4, amount, bankIin, pidBlock: body.pidBlock });
    await svc.from("aeps_transactions").update({
      status: result.ok ? "success" : "failed",
      rrn: result.rrn ?? null, provider_ref: result.providerRef ?? null,
      message: result.message ?? null, response: result.raw ?? null,
    }).eq("id", txn.id);

    if (result.ok) await svc.rpc("aeps_settle_commission", { p_txn: txn.id });
    return json({ status: result.ok ? "success" : "failed", txnId: txn.id, rrn: result.rrn, message: result.message }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await svc.from("aeps_transactions").update({ status: "failed", message: msg }).eq("id", txn.id);
    return json({ status: "failed", txnId: txn.id, message: msg }, 200);
  }
});
