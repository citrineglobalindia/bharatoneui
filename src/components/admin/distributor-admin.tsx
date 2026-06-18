import { useEffect, useMemo, useState } from "react";
import { Network, Users, FileText, IndianRupee, Wallet, Loader2, RefreshCw, Search, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Dist = { id: string; name: string; email: string; district: string | null; is_active: boolean; retailers: number; applications: number; commission: number; wallet: number };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = { submitted: "bg-saffron/10 text-saffron", in_progress: "bg-amber-500/10 text-amber-600", approved: "bg-india-green/10 text-india-green", completed: "bg-india-green/10 text-india-green", rejected: "bg-rose-500/10 text-rose-600" };

export function DistributorAdmin() {
  const [rows, setRows] = useState<Dist[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Dist | null>(null);

  async function load() {
    setLoading(true);
    try { await ensureStaffSession(); const { data } = await supabase.rpc("admin_distributors"); setRows((data as Dist[]) ?? []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const autoMap = async () => { const { data, error } = await supabase.rpc("auto_map_retailers_by_district"); if (error) return toast.error("Failed", { description: error.message }); toast.success(`Mapped ${(data as any)?.mapped ?? 0} retailer(s) by district`); load(); };
  const filtered = useMemo(() => rows.filter((r) => !q || [r.name, r.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))), [rows, q]);
  const totals = useMemo(() => ({ count: rows.length, retailers: rows.reduce((a, r) => a + Number(r.retailers || 0), 0), apps: rows.reduce((a, r) => a + Number(r.applications || 0), 0), comm: rows.reduce((a, r) => a + Number(r.commission || 0), 0) }), [rows]);

  if (sel) return <DistributorDetail dist={sel} onBack={() => setSel(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Network className="h-5 w-5 text-admin" /> Distributors</h2><p className="text-sm text-muted-foreground">All distributors, their mapped retailers, applications and commissions.</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={autoMap}><Network className="h-4 w-4" /> Auto-map by district</Button><Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Distributors", String(totals.count), Network, "bg-blue-500/10 text-blue-600"], ["Mapped Retailers", String(totals.retailers), Users, "bg-india-green/10 text-india-green"], ["Applications", String(totals.apps), FileText, "bg-saffron/10 text-saffron"], ["Commission Paid", inr(totals.comm), IndianRupee, "bg-violet-500/10 text-violet-600"]].map(([l, v, Icon, t]: any, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
        ))}
      </div>
      <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search distributor" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Distributor</th><th className="px-3 py-2">District</th><th className="px-3 py-2">Retailers</th><th className="px-3 py-2">Applications</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right"></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No distributors. Create one in User Management (role: Distributor).</td></tr>
              : filtered.map((d) => (<tr key={d.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2"><div className="font-semibold">{d.name}</div><div className="text-[11px] text-muted-foreground">{d.email}</div></td>
                <td className="px-3 py-2">{d.district ? <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-[11px] font-bold text-india-green">{d.district}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2">{d.retailers}</td><td className="px-3 py-2">{d.applications}</td>
                <td className="px-3 py-2 text-india-green">{inr(d.commission)}</td><td className="px-3 py-2">{inr(d.wallet)}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{d.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-3 py-2 text-right"><button onClick={() => setSel(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">View network <ChevronRight className="h-3.5 w-3.5" /></button></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DistributorDetail({ dist, onBack }: { dist: Dist; onBack: () => void }) {
  const [tab, setTab] = useState<"retailers" | "applications">("retailers");
  const [retailers, setRetailers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setLoading(true); await ensureStaffSession(); const [r, a] = await Promise.all([supabase.rpc("admin_distributor_retailers", { p_distributor: dist.id }), supabase.rpc("admin_distributor_applications", { p_distributor: dist.id })]); setRetailers((r.data as any[]) ?? []); setApps((a.data as any[]) ?? []); setLoading(false); })(); }, [dist.id]);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All distributors</button>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div><p className="flex items-center gap-2 font-display text-lg font-extrabold"><Network className="h-5 w-5 text-admin" /> {dist.name}</p><p className="text-sm text-muted-foreground">{dist.email}{dist.district ? ` · ${dist.district}` : ""} · {dist.retailers} retailers · {dist.applications} applications · {inr(dist.commission)} commission</p></div>
      </div>
      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button onClick={() => setTab("retailers")} className={`rounded-lg px-4 h-9 text-sm font-semibold ${tab === "retailers" ? "bg-admin text-admin-foreground" : "text-muted-foreground"}`}>Retailers ({retailers.length})</button>
        <button onClick={() => setTab("applications")} className={`rounded-lg px-4 h-9 text-sm font-semibold ${tab === "applications" ? "bg-admin text-admin-foreground" : "text-muted-foreground"}`}>Applications ({apps.length})</button>
      </div>
      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        : tab === "retailers" ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Applications</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>{retailers.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No retailers mapped.</td></tr>
            : retailers.map((r) => (<tr key={r.id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{r.name}</td><td className="px-3 py-2 text-muted-foreground">{r.email}</td><td className="px-3 py-2">{r.applications}</td><td className="px-3 py-2">{inr(r.wallet)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.is_active ? "Active" : "Inactive"}</span></td></tr>))}</tbody>
        </table></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Application</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Dist. Commission</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></tr></thead>
          <tbody>{apps.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No applications yet.</td></tr>
            : apps.map((a, i) => (<tr key={i} className="border-t border-border"><td className="px-3 py-2 font-mono text-xs">{a.application_no}</td><td className="px-3 py-2">{a.retailer_name}</td><td className="px-3 py-2"><div className="font-medium">{a.service_name}</div><div className="text-[11px] text-muted-foreground">{a.category_name}</div></td><td className="px-3 py-2">{inr(a.service_charge)}</td><td className="px-3 py-2 text-india-green">{inr(a.distributor_commission_amount)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[a.status] ?? "bg-muted"}`}>{a.status.replace("_", " ")}</span></td><td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-IN")}</td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
