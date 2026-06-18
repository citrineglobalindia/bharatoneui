import { useEffect, useMemo, useState } from "react";
import { Users, IndianRupee, FileText, Wallet, TrendingUp, Clock3, Loader2, RefreshCw, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const statusTone: Record<string, string> = { submitted: "bg-saffron/10 text-saffron", in_progress: "bg-amber-500/10 text-amber-600", approved: "bg-india-green/10 text-india-green", completed: "bg-india-green/10 text-india-green", rejected: "bg-rose-500/10 text-rose-600" };

function Stat({ icon: Icon, label, value, tone }: any) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p></div></div></div>;
}

export function DistributorDashboardReal() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_dashboard"); setD(data ?? {}); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-extrabold">Distributor Dashboard</h1><p className="text-sm text-muted-foreground">Your network and commission overview.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Users} label="My Retailers" value={d?.retailers ?? 0} tone="bg-blue-500/10 text-blue-600" />
          <Stat icon={Users} label="Active Retailers" value={d?.active_retailers ?? 0} tone="bg-india-green/10 text-india-green" />
          <Stat icon={FileText} label="Applications" value={d?.applications ?? 0} tone="bg-saffron/10 text-saffron" />
          <Stat icon={TrendingUp} label="Commission Earned" value={inr(d?.earned ?? 0)} tone="bg-india-green/10 text-india-green" />
          <Stat icon={Clock3} label="Commission Pending" value={inr(d?.pending ?? 0)} tone="bg-amber-500/10 text-amber-600" />
          <Stat icon={Wallet} label="Wallet Balance" value={inr(d?.wallet ?? 0)} tone="bg-violet-500/10 text-violet-600" />
        </div>
      )}
    </div>
  );
}

export function DistributorRetailersReal() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_retailers"); setRows((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((r) => !q || [r.name, r.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))), [rows, q]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-2xl font-extrabold">My Retailers</h1><p className="text-sm text-muted-foreground">Retailers mapped to your distributorship.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search retailer" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Joined</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
          : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No retailers assigned yet. Admin assigns retailers to you.</td></tr>
          : filtered.map((r) => (<tr key={r.id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{r.name}</td><td className="px-3 py-2 text-muted-foreground">{r.email}</td><td className="px-3 py-2">{inr(r.wallet)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.is_active ? "Active" : "Inactive"}</span></td><td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}

export function DistributorCommissionsReal() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "earned" | "pending">("all");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_commissions"); setRows((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const totals = useMemo(() => ({ earned: rows.filter((r) => r.earned).reduce((a, r) => a + Number(r.amount || 0), 0), pending: rows.filter((r) => !r.earned && r.status !== "rejected").reduce((a, r) => a + Number(r.amount || 0), 0), count: rows.length }), [rows]);
  const filtered = useMemo(() => tab === "all" ? rows : tab === "earned" ? rows.filter((r) => r.earned) : rows.filter((r) => !r.earned && r.status !== "rejected"), [rows, tab]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-2xl font-extrabold">Commissions</h1><p className="text-sm text-muted-foreground">Your distributor commission from retailer applications.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="Earned" value={inr(totals.earned)} tone="bg-india-green/10 text-india-green" />
        <Stat icon={Clock3} label="Pending" value={inr(totals.pending)} tone="bg-amber-500/10 text-amber-600" />
        <Stat icon={FileText} label="Applications" value={totals.count} tone="bg-saffron/10 text-saffron" />
      </div>
      <div className="flex gap-1.5">{(["all", "earned", "pending"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 h-8 text-xs font-semibold capitalize transition ${tab === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{k}</button>)}</div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Application</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Earned</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
          : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No commission records yet.</td></tr>
          : filtered.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-3 py-2 font-mono text-xs">{r.application_no}</td><td className="px-3 py-2">{r.retailer_name}</td><td className="px-3 py-2"><div className="font-medium">{r.service_name}</div><div className="text-[11px] text-muted-foreground">{r.category_name}</div></td><td className="px-3 py-2 font-semibold text-india-green">{inr(r.amount)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[r.status] ?? "bg-muted"}`}>{r.status.replace("_", " ")}</span></td><td className="px-3 py-2">{r.earned ? <span className="text-xs font-bold text-india-green">Earned</span> : <span className="text-xs text-muted-foreground">Pending</span>}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}

export function DistributorApplicationsReal() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_applications"); setRows((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((r) => (status === "all" || r.status === status) && (!q || [r.application_no, r.retailer_name, r.service_name].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q.toLowerCase())))), [rows, q, status]);
  const today = rows.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-2xl font-extrabold">Retailer Applications</h1><p className="text-sm text-muted-foreground">Every service your retailers apply for — live.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={FileText} label="Total Applications" value={rows.length} tone="bg-saffron/10 text-saffron" />
        <Stat icon={Clock3} label="Today" value={today} tone="bg-amber-500/10 text-amber-600" />
        <Stat icon={TrendingUp} label="Your Commission (earned)" value={inr(rows.filter((r) => ["approved","completed"].includes(r.status)).reduce((a, r) => a + Number(r.distributor_commission_amount || 0), 0))} tone="bg-india-green/10 text-india-green" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-60 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search app, retailer, service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{["submitted","in_progress","approved","completed","rejected"].map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Application</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Your Commission</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
          : filtered.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No applications from your retailers yet.</td></tr>
          : filtered.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-3 py-2 font-mono text-xs">{r.application_no}</td><td className="px-3 py-2">{r.retailer_name}</td><td className="px-3 py-2"><div className="font-medium">{r.service_name}</div><div className="text-[11px] text-muted-foreground">{r.category_name}</div></td><td className="px-3 py-2">{inr(r.service_charge)}</td><td className="px-3 py-2 text-india-green">{inr(r.distributor_commission_amount)}</td><td className="px-3 py-2">{r.payment_verified ? <span className="text-xs font-bold text-emerald-600">Verified</span> : <span className="text-xs text-muted-foreground">Pending</span>}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[r.status] ?? "bg-muted"}`}>{r.status.replace("_"," ")}</span></td><td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}

export function DistributorSalesReal() {
  const [d, setD] = useState<any>(null); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_sales"); setD(data ?? {}); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const daily = (d?.daily as any[]) ?? []; const maxD = Math.max(1, ...daily.map((x) => Number(x.amount || 0)));
  const cats = (d?.by_category as any[]) ?? []; const maxC = Math.max(1, ...cats.map((x) => Number(x.amount || 0)));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-extrabold">Sales Dashboard</h1><p className="text-sm text-muted-foreground">Your network's sales and commission trends.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={IndianRupee} label="Gross Sales" value={inr(d?.gross)} tone="bg-saffron/10 text-saffron" />
          <Stat icon={TrendingUp} label="Earned Commission" value={inr(d?.earned)} tone="bg-india-green/10 text-india-green" />
          <Stat icon={Clock3} label="Pending Commission" value={inr(d?.pending)} tone="bg-amber-500/10 text-amber-600" />
          <Stat icon={FileText} label="Applications" value={d?.apps ?? 0} tone="bg-blue-500/10 text-blue-600" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Daily sales (14 days)</p><div className="flex h-40 items-end gap-2">{daily.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : daily.map((x, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-india-green" style={{ height: `${(Number(x.amount || 0) / maxD) * 100}%`, minHeight: "2px" }} title={inr(x.amount)} /><span className="text-[9px] text-muted-foreground">{x.d}</span></div>)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Sales by category</p>{cats.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : cats.map((x) => <div key={x.name} className="mb-2"><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{x.name} ({x.cnt})</span><span className="font-bold">{inr(x.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-saffron" style={{ width: `${(Number(x.amount || 0) / maxC) * 100}%` }} /></div></div>)}</div>
      </>)}
    </div>
  );
}

export function DistributorOfficersReal() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState("");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_agents"); setRows((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((r) => !q || [r.name, r.email, r.district].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))), [rows, q]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-2xl font-extrabold">Field Agents</h1><p className="text-sm text-muted-foreground">Retailers operating under your distributorship, ranked by activity.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search agent" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Agent</th><th className="px-3 py-2">District</th><th className="px-3 py-2">Applications</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Status</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No agents mapped.</td></tr> : filtered.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-3 py-2"><div className="font-semibold">{r.name}</div><div className="text-[11px] text-muted-foreground">{r.email}</div></td><td className="px-3 py-2">{r.district || "—"}</td><td className="px-3 py-2 font-semibold">{r.apps}</td><td className="px-3 py-2 text-india-green">{inr(r.earned)}</td><td className="px-3 py-2">{inr(r.wallet)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.is_active ? "Active" : "Inactive"}</span></td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

export function DistributorServicesReal() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "inlink" | "api" | "backend">("all");
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.from("services").select("id,name,category,service_type,service_charge,distributor_commission,logo_url,is_active").eq("is_active", true).order("category").order("name"); setRows((data as any[]) ?? []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  const TYPE_LABEL: Record<string, string> = { inlink: "Redirect", api: "API Integrated", backend: "Backend" };
  const TYPES = [
    { key: "all" as const, label: "All" },
    { key: "inlink" as const, label: "Redirect" },
    { key: "api" as const, label: "API Integrated" },
    { key: "backend" as const, label: "Backend" },
  ];
  const tBadge: Record<string, string> = { inlink: "bg-sky-100 text-sky-700", api: "bg-violet-100 text-violet-700", backend: "bg-emerald-100 text-emerald-700" };

  const filtered = useMemo(() => rows.filter((r) =>
    (type === "all" || r.service_type === type) &&
    (!q || [r.name, r.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [rows, q, type]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length, inlink: 0, api: 0, backend: 0 };
    rows.forEach((r) => { if (m[r.service_type] != null) m[r.service_type]++; });
    return m;
  }, [rows]);

  // Group filtered services by category (category-wise distribution)
  const byCategory = useMemo(() => {
    const m = new Map<string, any[]>();
    filtered.forEach((s) => { const k = s.category || "Uncategorised"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const palette = ["from-sky-500 to-blue-600","from-emerald-500 to-green-600","from-orange-500 to-amber-600","from-violet-500 to-fuchsia-600","from-rose-500 to-pink-600","from-cyan-500 to-teal-600"];

  const Card = ({ s }: { s: any }) => {
    const g = palette[(s.name?.charCodeAt(0) || 0) % palette.length];
    return (
      <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev">
        <div className="flex items-center gap-3 border-b border-border p-4">
          {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-xl border border-border bg-white object-contain p-1" />
            : <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${g} text-lg font-extrabold text-white shadow-soft`}>{(s.name?.[0] || "S").toUpperCase()}</span>}
          <div className="min-w-0"><p className="truncate font-bold leading-tight">{s.name}</p><p className="truncate text-[11px] text-muted-foreground">{s.category || "—"}</p></div>
        </div>
        <div className="space-y-2 p-4">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tBadge[s.service_type] || "bg-muted text-muted-foreground"}`}>{TYPE_LABEL[s.service_type] || s.service_type}</span>
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">Charge</span><b>{inr(s.service_charge)}</b></div>
          <div className="flex items-center justify-between rounded-lg bg-india-green/5 px-3 py-2 text-sm"><span className="text-muted-foreground">Your commission</span><b className="text-india-green">{s.distributor_commission}%</b></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-2xl font-extrabold">Services Live</h1><p className="text-sm text-muted-foreground">Active services your retailers can offer, grouped by category and type, with your commission %.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} className={`inline-flex items-center gap-1.5 rounded-full px-3 h-9 text-xs font-semibold transition ${type === t.key ? "bg-india-green text-white shadow-soft" : "border border-border bg-card hover:bg-muted"}`}>
            {t.label}<span className={`rounded-full px-1.5 text-[10px] font-bold ${type === t.key ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>{typeCounts[t.key] ?? 0}</span>
          </button>
        ))}
        <div className="relative ml-auto w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        : byCategory.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No active services{type !== "all" ? ` of type "${TYPE_LABEL[type]}"` : ""}.</p>
        : <div className="space-y-6">{byCategory.map(([cat, list]) => (
            <section key={cat}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-display text-base font-extrabold">{cat}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{list.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((s) => <Card key={s.id} s={s} />)}</div>
            </section>
          ))}</div>}
    </div>
  );
}
