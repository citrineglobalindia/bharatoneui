import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export type CurrentUser = { name: string; email: string; phone: string; role: string; jskoId: string; initials: string };

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", accountant: "Accountant", qc: "Quality Control", operator: "Service Operator",
  telecaller: "Telecaller", retailer: "Retailer", distributor: "Distributor", "master-distributor": "Master Distributor",
  bde: "Business Development", dro: "DRO", tro: "TRO", hr_staff: "HR", manager: "Manager", employee: "Employee",
};
function initialsOf(s: string) {
  return (s || "U").trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

export function useCurrentUser(): CurrentUser {
  const [info, setInfo] = useState<{ name: string; email: string; phone: string; role: string; jskoId: string }>(() => {
    try { const a = JSON.parse(localStorage.getItem("bharatone:auth") || "{}"); return { name: a.name || "", email: a.email || "", phone: a.phone || "", role: a.role || "", jskoId: a.jskoId || "" }; }
    catch { return { name: "", email: "", phone: "", role: "", jskoId: "" }; }
  });
  useEffect(() => {
    let on = true;
    (async () => {
      await ensureStaffSession();
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user || !on) return;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("display_name, phone").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const roles = ((r as any[]) ?? []).map((x) => x.role as string);
      const role = roles.find((x) => x !== "employee") || roles[0] || "";
      const name = (p as any)?.display_name || u.user.email?.split("@")[0] || "User";
      const phone = (p as any)?.phone || (u.user.phone ?? "") || "";
      // JSKO ID for the logged-in user (retailers). Prefer the RLS-safe RPC; fall
      // back to a direct read of the user's own registration.
      let jskoId = "";
      try {
        const { data: jid, error: jErr } = await (supabase as any).rpc("my_jsko_id");
        if (!jErr && jid) jskoId = String(jid);
        if (!jskoId) {
          const { data: reg } = await supabase.from("retailer_registrations")
            .select("jsko_id, application_id").eq("auth_user_id", u.user.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          jskoId = (reg as any)?.jsko_id || (reg as any)?.application_id || "";
        }
      } catch { /* ignore */ }
      if (!on) return;
      setInfo({ name, email: u.user.email || "", phone, role, jskoId });
      try {
        const a = JSON.parse(localStorage.getItem("bharatone:auth") || "{}");
        localStorage.setItem("bharatone:auth", JSON.stringify({ ...a, name, email: u.user.email, phone, role: role || a.role, jskoId }));
      } catch {}
    })();
    return () => { on = false; };
  }, []);
  return { name: info.name || "User", email: info.email, phone: info.phone, role: ROLE_LABEL[info.role] || info.role || "", jskoId: info.jskoId || "", initials: initialsOf(info.name || info.email) };
}
