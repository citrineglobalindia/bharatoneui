import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Loader2, RefreshCw, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const ROLE_CAPS: Record<string, string[]> = {
  admin: ["Full platform control", "Approvals, catalog, users, settings", "Finance, risk, audit"],
  accountant: ["Verify payments & top-ups", "Withdrawals & company account", "Service payments ledger"],
  qc: ["KYC verification & approval", "Old JSKO IDs", "Re-QC, request documents"],
  operator: ["Handle assigned applications", "Upload result docs", "Chat with retailers"],
  telecaller: ["Follow up rejected cases", "Re-route to accountant"],
  distributor: ["View mapped retailers", "Commissions & network", "District map"],
  "master-distributor": ["Oversee distributors"],
  bde: ["Leads & merchant onboarding"],
  dro: ["District operations"], tro: ["Taluk operations"],
  retailer: ["Apply services", "Wallet & applications", "Support & chat"],
  hr_staff: ["HR operations"], manager: ["Team oversight"], employee: ["Basic access"],
};

export function RolesPermissions() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("admin_list_users"); setUsers((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const counts = useMemo(() => { const m: Record<string, number> = {}; users.forEach((u) => (u.roles || []).forEach((r: string) => { m[r] = (m[r] || 0) + 1; })); return m; }, [users]);
  const roles = Object.keys(ROLE_CAPS);
  const selUsers = useMemo(() => users.filter((u) => (u.roles || []).includes(sel)), [users, sel]);

  if (sel) return (
    <div className="space-y-4">
      <button onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All roles</button>
      <h2 className="flex items-center gap-2 text-lg font-extrabold capitalize"><Users className="h-5 w-5 text-admin" /> {sel} <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-xs font-bold text-india-green">{selUsers.length}</span></h2>
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Capabilities</p><ul className="list-disc pl-5 text-sm">{(ROLE_CAPS[sel] || []).map((c) => <li key={c}>{c}</li>)}</ul></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{selUsers.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No users with this role.</td></tr> : selUsers.map((u) => <tr key={u.id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{u.display_name}</td><td className="px-3 py-2 text-muted-foreground">{u.email}</td><td className="px-3 py-2">{u.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><LockKeyhole className="h-5 w-5 text-admin" /> Roles &amp; Permissions</h2><p className="text-sm text-muted-foreground">Roles, their capabilities and live user counts. Assign roles in User Management.</p></div><Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <button key={r} onClick={() => setSel(r)} className="rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition hover:shadow-elev">
              <div className="flex items-center justify-between"><p className="font-bold capitalize">{r}</p><span className="rounded-full bg-india-green/10 px-2 py-0.5 text-xs font-bold text-india-green">{counts[r] || 0}</span></div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">{(ROLE_CAPS[r] || []).slice(0, 3).map((c) => <li key={c}>• {c}</li>)}</ul>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-india-green">View users <ChevronRight className="h-3.5 w-3.5" /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
