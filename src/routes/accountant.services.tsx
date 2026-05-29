import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wrench, Search, Pencil, TrendingUp, Layers, Percent, IndianRupee, Save,
  Store, Truck, Building2, CheckCircle2, AlertTriangle, Plus, Trash2, Sparkles, BarChart3,
} from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { SERVICES, inr, type ServiceRow } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/services")({
  head: () => ({ meta: [{ title: "Services & Commission — BharatOne Accountant" }] }),
  component: ServicesPage,
});

type CommMode = "flat" | "percent";
type Slab = { id: string; from: number; to: number; retailer: number; distributor: number; company: number };

// Per-service extra config kept in component state (mode + monthly volume estimate + slabs)
interface SvcConfig {
  mode: CommMode;
  monthlyVolume: number;
  slabs: Slab[];
}

const CATEGORIES = ["All", "Banking", "Recharge", "Bills", "Government", "Business"] as const;
const SLAB_SERVICES = ["SVC-AEPS", "SVC-RCH", "SVC-BBPS"];

function defaultConfig(s: ServiceRow): SvcConfig {
  const isSlab = SLAB_SERVICES.includes(s.id);
  return {
    mode: s.customerPrice > 0 ? "flat" : "percent",
    monthlyVolume: s.category === "Banking" ? 4200 : s.category === "Recharge" ? 9800 : s.category === "Bills" ? 5600 : 320,
    slabs: isSlab
      ? [
          { id: "s1", from: 0, to: 5000, retailer: s.retailerCommission, distributor: s.distributorCommission, company: s.companyMargin },
          { id: "s2", from: 5001, to: 10000, retailer: s.retailerCommission + 4, distributor: s.distributorCommission + 1, company: s.companyMargin + 2 },
          { id: "s3", from: 10001, to: 25000, retailer: s.retailerCommission + 9, distributor: s.distributorCommission + 2, company: s.companyMargin + 4 },
        ]
      : [],
  };
}

function ServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>(SERVICES);
  const [cfg, setCfg] = useState<Record<string, SvcConfig>>(() =>
    Object.fromEntries(SERVICES.map((s) => [s.id, defaultConfig(s)])),
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [edit, setEdit] = useState<ServiceRow | null>(null);

  const filtered = rows.filter(
    (r) => (cat === "All" || r.category === cat) && (q === "" || r.name.toLowerCase().includes(q.toLowerCase())),
  );

  const toggle = (id: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    const svc = rows.find((r) => r.id === id);
    if (svc) toast.success(`${svc.name} ${svc.active ? "disabled" : "enabled"}`);
  };

  // Portfolio analytics
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active);
    const avgRet = active.length ? active.reduce((a, r) => a + r.retailerCommission, 0) / active.length : 0;
    const projected = active.reduce((a, r) => {
      const c = cfg[r.id];
      const totalComm = r.retailerCommission + r.distributorCommission + r.companyMargin;
      return a + (c ? totalComm * c.monthlyVolume : 0);
    }, 0);
    const companyProjected = active.reduce((a, r) => {
      const c = cfg[r.id];
      return a + (c ? r.companyMargin * c.monthlyVolume : 0);
    }, 0);
    return { count: rows.length, active: active.length, avgRet, projected, companyProjected };
  }, [rows, cfg]);

  const saveEdit = (row: ServiceRow, conf: SvcConfig) => {
    setRows((p) => p.map((r) => (r.id === row.id ? row : r)));
    setCfg((p) => ({ ...p, [row.id]: conf }));
    toast.success("Commission updated", { description: `${row.name} · retailer ${inr(row.retailerCommission)} · distributor ${inr(row.distributorCommission)}` });
    setEdit(null);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Wrench className="h-5 w-5" />}
          title="Services Cost & Commission"
          subtitle="Configure retailer cost, customer price and the per-service commission split with live margin analytics."
        />

        {/* Analytics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={<Layers className="h-4 w-4" />} label="Total Services" value={`${stats.active}/${stats.count}`} hint="active" tone="emerald" />
          <StatTile icon={<Percent className="h-4 w-4" />} label="Avg Retailer Comm." value={inr(Math.round(stats.avgRet))} hint="per txn" tone="violet" />
          <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Projected Payouts" value={inr(Math.round(stats.projected))} hint="monthly" tone="sky" />
          <StatTile icon={<BarChart3 className="h-4 w-4" />} label="Company Margin" value={inr(Math.round(stats.companyProjected))} hint="monthly" tone="amber" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-border px-3 h-10 shadow-soft flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search service…" className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <div className="flex rounded-xl border border-border bg-white overflow-hidden shadow-soft flex-wrap">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-3 h-10 text-xs font-bold ${cat === c ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-muted"}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Service cards */}
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((r) => {
            const conf = cfg[r.id];
            const total = r.retailerCommission + r.distributorCommission + r.companyMargin;
            const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
            const isSlab = SLAB_SERVICES.includes(r.id);
            return (
              <div key={r.id} className={`rounded-xl border bg-card shadow-soft p-4 ${r.active ? "border-border" : "border-dashed border-border opacity-75"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{r.name}</p>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wide">{r.category}</span>
                      {isSlab && <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded uppercase tracking-wide inline-flex items-center gap-1"><Layers className="h-3 w-3" /> Slab</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.customerPrice ? `Cost ${inr(r.retailerCost)} → Price ${inr(r.customerPrice)}` : "Slab / percentage based pricing"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={r.active} onCheckedChange={() => toggle(r.id)} />
                    <Button variant="outline" className="h-8" onClick={() => setEdit(r)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  </div>
                </div>

                {/* Margin split bar */}
                <div className="mt-3">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${pct(r.retailerCommission)}%` }} title="Retailer" />
                    <div className="bg-violet-500" style={{ width: `${pct(r.distributorCommission)}%` }} title="Distributor" />
                    <div className="bg-slate-400" style={{ width: `${pct(r.companyMargin)}%` }} title="Company" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <Split icon={<Store className="h-3 w-3" />} tone="emerald" label="Retailer" value={inr(r.retailerCommission)} />
                    <Split icon={<Truck className="h-3 w-3" />} tone="violet" label="Distributor" value={inr(r.distributorCommission)} />
                    <Split icon={<Building2 className="h-3 w-3" />} tone="slate" label="Company" value={inr(r.companyMargin)} />
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-10 lg:col-span-2">No services found.</p>}
        </div>
        <p className="text-[11px] text-muted-foreground">Commissions are per successful transaction. Slab-based services use tiered rates by transaction amount.</p>
      </div>

      {edit && <EditDialog row={edit} conf={cfg[edit.id]} onClose={() => setEdit(null)} onSave={saveEdit} />}
    </AccountantShell>
  );
}

function StatTile({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600",
    violet: "from-violet-500 to-purple-600",
    sky: "from-sky-500 to-blue-600",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} text-white p-4 shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{label}</span>
        <span className="opacity-90">{icon}</span>
      </div>
      <p className="text-xl font-extrabold mt-1">{value}</p>
      <p className="text-[10px] opacity-80">{hint}</p>
    </div>
  );
}

function Split({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  const dot: Record<string, string> = { emerald: "text-emerald-600", violet: "text-violet-600", slate: "text-slate-500" };
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${dot[tone]}`}>{icon} {label}</span>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function NumField({ label, value, onChange, prefix }: { label: string; value: number; onChange: (n: number) => void; prefix?: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center rounded-lg border border-input bg-background h-9 px-2 focus-within:ring-2 focus-within:ring-emerald-400/40">
        {prefix && <span className="text-muted-foreground mr-1">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-transparent flex-1 text-sm outline-none w-full"
        />
      </div>
    </div>
  );
}

function EditDialog({ row, conf, onClose, onSave }: { row: ServiceRow; conf: SvcConfig; onClose: () => void; onSave: (r: ServiceRow, c: SvcConfig) => void }) {
  const [draft, setDraft] = useState<ServiceRow>({ ...row });
  const [c, setC] = useState<SvcConfig>({ ...conf, slabs: conf.slabs.map((s) => ({ ...s })) });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ServiceRow, v: number) => setDraft((d) => ({ ...d, [k]: v }));
  const totalComm = draft.retailerCommission + draft.distributorCommission + draft.companyMargin;
  const margin = draft.customerPrice - draft.retailerCost;
  const overAllocated = draft.customerPrice > 0 && totalComm > draft.customerPrice;
  const projected = totalComm * c.monthlyVolume;
  const pct = (n: number) => (totalComm > 0 ? Math.round((n / totalComm) * 100) : 0);
  const isSlab = SLAB_SERVICES.includes(row.id);

  const addSlab = () => {
    const last = c.slabs[c.slabs.length - 1];
    setC((p) => ({
      ...p,
      slabs: [...p.slabs, { id: `s${Date.now()}`, from: last ? last.to + 1 : 0, to: last ? last.to + 5000 : 5000, retailer: draft.retailerCommission, distributor: draft.distributorCommission, company: draft.companyMargin }],
    }));
  };
  const rmSlab = (id: string) => setC((p) => ({ ...p, slabs: p.slabs.filter((s) => s.id !== id) }));
  const setSlab = (id: string, k: keyof Slab, v: number) => setC((p) => ({ ...p, slabs: p.slabs.map((s) => (s.id === id ? { ...s, [k]: v } : s)) }));

  const handleSave = () => {
    if (overAllocated) return toast.error("Commission split exceeds the customer price");
    if (totalComm <= 0) return toast.error("Total commission must be greater than zero");
    setSaving(true);
    setTimeout(() => { setSaving(false); onSave(draft, c); }, 600);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2"><Sparkles className="h-5 w-5" /> {draft.name}</DialogTitle>
          <DialogDescription className="text-emerald-50/90 text-xs">{draft.category} · configure pricing and the commission split</DialogDescription>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Commission type</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["flat", "percent"] as CommMode[]).map((m) => (
                <button key={m} onClick={() => setC((p) => ({ ...p, mode: m }))} className={`px-3 h-8 text-xs font-bold inline-flex items-center gap-1 ${c.mode === m ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-muted"}`}>
                  {m === "flat" ? <IndianRupee className="h-3 w-3" /> : <Percent className="h-3 w-3" />} {m === "flat" ? "Flat ₹" : "Percentage"}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Retailer Cost (₹)" value={draft.retailerCost} onChange={(v) => set("retailerCost", v)} prefix={<IndianRupee className="h-3.5 w-3.5" />} />
            <NumField label="Customer Price (₹)" value={draft.customerPrice} onChange={(v) => set("customerPrice", v)} prefix={<IndianRupee className="h-3.5 w-3.5" />} />
          </div>

          {/* Commission split */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Retailer" value={draft.retailerCommission} onChange={(v) => set("retailerCommission", v)} prefix={c.mode === "flat" ? <IndianRupee className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />} />
              <NumField label="Distributor" value={draft.distributorCommission} onChange={(v) => set("distributorCommission", v)} prefix={c.mode === "flat" ? <IndianRupee className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />} />
              <NumField label="Company" value={draft.companyMargin} onChange={(v) => set("companyMargin", v)} prefix={c.mode === "flat" ? <IndianRupee className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />} />
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div className="bg-emerald-500" style={{ width: `${pct(draft.retailerCommission)}%` }} />
              <div className="bg-violet-500" style={{ width: `${pct(draft.distributorCommission)}%` }} />
              <div className="bg-slate-400" style={{ width: `${pct(draft.companyMargin)}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-emerald-700">Retailer {pct(draft.retailerCommission)}%</span>
              <span className="text-violet-700">Distributor {pct(draft.distributorCommission)}%</span>
              <span className="text-slate-600">Company {pct(draft.companyMargin)}%</span>
            </div>
          </div>

          {/* Live insights */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border bg-white p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total / txn</p>
              <p className="font-extrabold text-emerald-700">{c.mode === "flat" ? inr(totalComm) : `${totalComm}%`}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gross margin</p>
              <p className={`font-extrabold ${margin >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{inr(margin)}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Proj. monthly</p>
              <p className="font-extrabold text-sky-700">{c.mode === "flat" ? inr(Math.round(projected)) : "—"}</p>
            </div>
          </div>

          <NumField label="Estimated monthly transactions" value={c.monthlyVolume} onChange={(v) => setC((p) => ({ ...p, monthlyVolume: v }))} />

          {overAllocated && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" /> Commission split ({inr(totalComm)}) exceeds the customer price ({inr(draft.customerPrice)}).
            </div>
          )}

          {/* Slabs */}
          {isSlab && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-bold inline-flex items-center gap-1.5"><Layers className="h-4 w-4 text-sky-600" /> Amount Slabs</span>
                <Button variant="outline" className="h-7 text-xs" onClick={addSlab}><Plus className="h-3.5 w-3.5" /> Add slab</Button>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1">
                  <span>From ₹</span><span>To ₹</span><span>Retailer</span><span>Distrib.</span><span>Company</span><span></span>
                </div>
                {c.slabs.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <input type="number" value={s.from} onChange={(e) => setSlab(s.id, "from", Number(e.target.value))} className="h-8 rounded border border-input bg-background px-2 text-xs" />
                    <input type="number" value={s.to} onChange={(e) => setSlab(s.id, "to", Number(e.target.value))} className="h-8 rounded border border-input bg-background px-2 text-xs" />
                    <input type="number" value={s.retailer} onChange={(e) => setSlab(s.id, "retailer", Number(e.target.value))} className="h-8 rounded border border-input bg-background px-2 text-xs" />
                    <input type="number" value={s.distributor} onChange={(e) => setSlab(s.id, "distributor", Number(e.target.value))} className="h-8 rounded border border-input bg-background px-2 text-xs" />
                    <input type="number" value={s.company} onChange={(e) => setSlab(s.id, "company", Number(e.target.value))} className="h-8 rounded border border-input bg-background px-2 text-xs" />
                    <button onClick={() => rmSlab(s.id)} className="h-8 w-8 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center" aria-label="Remove slab"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {c.slabs.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No slabs configured.</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mr-auto"><CheckCircle2 className="h-3.5 w-3.5" /> Changes apply to new transactions</div>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || overAllocated} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Commission"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
