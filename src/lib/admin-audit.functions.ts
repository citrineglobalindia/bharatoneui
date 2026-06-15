import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type AuditInput = {
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeChanges?: Json;
  afterChanges?: Json;
  outcome?: "success" | "failure";
  metadata?: Json;
};

function validateAuditInput(input: AuditInput): AuditInput {
  if (!input || typeof input !== "object") throw new Error("Invalid audit entry");
  if (typeof input.module !== "string" || input.module.length < 2 || input.module.length > 80) throw new Error("Invalid module");
  if (typeof input.action !== "string" || input.action.length < 2 || input.action.length > 120) throw new Error("Invalid action");
  if (input.targetType && input.targetType.length > 80) throw new Error("Invalid target type");
  if (input.targetId && input.targetId.length > 160) throw new Error("Invalid target ID");
  return input;
}

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const getAdminAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("admin_audit_logs")
      .select("id, actor_name, module, action, target_type, target_id, before_changes, after_changes, outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error("Unable to load audit history");
    return { logs: data ?? [] };
  });

export const recordAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAuditInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      actor_user_id: context.userId,
      actor_name: profile?.display_name ?? "Administrator",
      module: data.module,
      action: data.action,
      target_type: data.targetType ?? null,
      target_id: data.targetId ?? null,
      before_changes: data.beforeChanges ?? null,
      after_changes: data.afterChanges ?? null,
      outcome: data.outcome ?? "success",
      metadata: { ...(typeof data.metadata === "object" && data.metadata && !Array.isArray(data.metadata) ? data.metadata : {}), ip: getRequestIP({ xForwardedFor: true }) ?? "unknown" },
    });
    if (error) throw new Error("Unable to record audit entry");
    return { ok: true };
  });