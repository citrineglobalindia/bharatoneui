// BharatOne — service-proxy: relays a retailer request to an admin-configured API service.
// The API key is read from an Edge Function secret named by service_api_config.secret_ref,
// so credentials are never exposed to the client.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireUser } from "../_shared/caller.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Signed-in callers only. This function attaches OUR third-party API key to
  // the outbound request, so an open door here means strangers spending our
  // API quota — and, for identity-verification services, querying them under
  // our account. service_api_config is empty today, so nothing is reachable
  // yet; the check goes in before the first row is added, not after.
  const gate = await requireUser(req, cors);
  if ("deny" in gate) return gate.deny;

  try {
    const { service_id, params } = await req.json();
    if (!service_id) return json({ error: "service_id required" }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg, error } = await supabase.from("service_api_config").select("*").eq("service_id", service_id).maybeSingle();
    if (error || !cfg || !cfg.endpoint) return json({ error: "Service not configured" }, 400);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.auth_type !== "none" && cfg.secret_ref) {
      const key = Deno.env.get(cfg.secret_ref);
      if (!key) return json({ error: `Secret '${cfg.secret_ref}' is not set in Edge Function secrets` }, 400);
      headers[cfg.auth_header || "Authorization"] = cfg.auth_type === "bearer" ? `Bearer ${key}` : key;
    }
    const method = (cfg.method || "POST").toUpperCase();
    const body = method === "GET" ? undefined : JSON.stringify({ ...(cfg.request_template || {}), ...(params || {}) });
    const resp = await fetch(cfg.endpoint, { method, headers, body });
    const text = await resp.text();
    let parsed: unknown; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return json({ ok: resp.ok, status: resp.status, data: parsed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
