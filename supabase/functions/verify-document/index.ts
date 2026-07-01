// BharatOne — document verification (OCR) gateway. SCAFFOLD.
// Verifies a PAN/Aadhaar against an OCR / government validation provider.
// Implement callOcr() and set ocr_config.active = true + the provider key to go live.
// Only masked references are stored; never persist full Aadhaar or biometrics.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OCR_API_KEY = Deno.env.get("OCR_API_KEY") ?? "";

// ---- Implement the real OCR / validation call here ----
async function callOcr(_docType: string, _payload: Record<string, unknown>): Promise<{
  status: "match" | "mismatch"; extracted?: unknown; ref?: string;
}> {
  // TODO: POST document/number to the provider, map response, return masked `extracted`.
  throw new Error("OCR_INTEGRATION_PENDING");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (!roleList.some((r) => ["admin", "qc"].includes(r))) return json({ error: "Only QC/Admin" }, 403);

  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const registrationId = body.registrationId ? String(body.registrationId) : null;
  const docType = String(body.docType ?? "");
  const value = String(body.value ?? "");
  if (!["pan", "aadhaar"].includes(docType)) return json({ error: "docType must be pan or aadhaar" }, 400);

  const { data: cfg } = await svc.from("ocr_config").select("*").eq("id", 1).maybeSingle();
  const configured = !!cfg?.active && !!OCR_API_KEY;
  const masked = value ? value.slice(-4) : null;

  if (!configured) {
    const { data: row } = await svc.from("document_verifications")
      .insert({ registration_id: registrationId, doc_type: docType, input_value: masked, match_status: "not_configured", provider: cfg?.provider ?? null })
      .select("id").single();
    return json({ status: "not_configured", id: row?.id, message: "OCR provider not configured yet. Add OCR_API_KEY + ocr_config.active and implement callOcr()." });
  }

  try {
    const r = await callOcr(docType, { value, registrationId });
    const { data: row } = await svc.from("document_verifications")
      .insert({ registration_id: registrationId, doc_type: docType, input_value: masked, match_status: r.status, extracted: r.extracted ?? null, provider: cfg?.provider ?? null, provider_ref: r.ref ?? null })
      .select("id").single();
    return json({ status: r.status, id: row?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await svc.from("document_verifications").insert({ registration_id: registrationId, doc_type: docType, input_value: masked, match_status: "error", provider: cfg?.provider ?? null });
    return json({ status: "error", message: msg });
  }
});
