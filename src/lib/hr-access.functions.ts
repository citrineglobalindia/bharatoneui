import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HrAccess = {
  userId: string;
  displayName: string;
  department: string;
  role: "hr_staff" | "manager";
  scopeLabel: string;
  canManage: boolean;
  canViewRestrictedReports: boolean;
};

export const getHrAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HrAccess> => {
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("display_name, department, is_active")
          .eq("id", context.userId)
          .single(),
        context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      ]);

    if (profileError || rolesError || !profile?.is_active) {
      throw new Error("Your HR access profile is unavailable or inactive.");
    }

    const roleNames = roles?.map((item) => item.role) ?? [];
    const role = roleNames.includes("hr_staff")
      ? "hr_staff"
      : roleNames.includes("manager")
        ? "manager"
        : null;

    if (!role) throw new Error("You do not have access to HR command centers.");

    return {
      userId: context.userId,
      displayName: profile.display_name,
      department: profile.department,
      role,
      scopeLabel: role === "hr_staff" ? "All departments" : `${profile.department} department`,
      canManage: role === "hr_staff",
      canViewRestrictedReports: role === "hr_staff",
    };
  });