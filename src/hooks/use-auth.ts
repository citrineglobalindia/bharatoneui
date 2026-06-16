import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole =
  | "admin" | "accountant" | "qc" | "retailer"
  | "manager" | "hr_staff" | "employee";

const ROLE_PRIORITY: AppRole[] = [
  "admin", "accountant", "qc", "manager", "hr_staff", "retailer", "employee",
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load(session: { user: User } | null) {
      const u = session?.user ?? null;
      if (!active) return;
      setUser(u);
      if (u) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        const { data: prof } = await supabase
          .from("profiles").select("display_name").eq("id", u.id).maybeSingle();
        if (!active) return;
        setRoles(((r ?? []).map((x) => x.role) as AppRole[]));
        setDisplayName(prof?.display_name ?? u.email ?? "");
      } else {
        setRoles([]);
        setDisplayName("");
      }
      if (active) setLoading(false);
    }
    supabase.auth.getSession().then(({ data }) => load(data.session as never));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session as never));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const role: AppRole | null =
    ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
  const hasRole = (r: AppRole) => roles.includes(r);
  const signOut = async () => { await supabase.auth.signOut(); };

  return { user, role, roles, hasRole, displayName, loading, signOut };
}
