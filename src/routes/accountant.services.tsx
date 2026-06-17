import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wrench, Search, Pencil, IndianRupee, Loader2, Check, X, RefreshCw, Layers, Percent } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/accountant/services")({
  head: () => ({ meta: [{ title: "Services & Commission — BharatOne Accountant" }] }),
  component: ServicesPage,
});

type Svc = {
  id: string; name: string; category: string | null; category_id: string | null; service_charge: number; is_active: boolean;
  company_commission: number; distributor_commission: number; dro_commission: number; tro_commission: number; retailer_commission: number;
};
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const COMM: [string, keyof Svc][] = [["Company", "company_commission"], ["Distributor", "distributor_commission"], ["DRO", "dro_commission"], ["TRO", "tro_commission"], ["Retailer", "retailer_commission"]];

function ServicesPage() {
  const [rows, setRows] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState<Svc | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await supabase.from("services").select("id,name,category,category_id,service_charge,is_active,company_commission,distributor_commission,dro_commission,tro_commission,retailer_commission").order("category").order("name");
      setRows((data as Svc[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => rows.filter((r) => (cat === "all" || r.category === cat) && (!q || r.name.toLowerCase().includes(q.toLowerCase()))), [rows, q, cat]);

  const openEdit = (s: Svc) => { setEdit(s); setForm({ service_charge: s.service_charge, company_commission: s.company_commission, distributor_commission: s.distributor_commission, dro_commission: s.dro_commission, tro_commission: s.tro_commission, retailer_commission: s.retailer_commission }); };
  const charge = Number(form.service_charge) || 0;
  const totalPct = COMM.reduce((a, [, k]) => a + (Number(form[k]) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.001;
  const amt = (pct: any) => Math.round((charge * (Number(pct) || 0) / 100) * 100) / 100;

  const save = async () => {
    if (!pctOk) return toast.error("Commission split must total 100%", { description: `Currently ${totalPct}%` });
    setSaving(true);
    const { error } = await supabase.rpc("update_service_commission", {
      p_id: edit!.id, p_company: Number(form.company_commission) || 0, p_distributor: Number(form.distributor_commission) || 0,
      p_dro: Number(form.dro_commission) || 0, p_tro: Number(form.tro_commission) || 0, p_retailer: Number(form.retailer_commission) || 0, p_charge: charge,
    });
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Commission updated"); setEdit(null); load();
  };

  const inp = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title="Services & Commission" subtitle="Service charges and the company/distributor/DRO/TRO/retailer commission split."
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Layers className="h-3.5 w-3.5" /> Services</p><p className="text-2xl font-extrabold">{rows.length}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Avg. charge</p><p className="text-2xl font-extrabold">{rows.length ? inr(Math.round(rows.reduce((a, r) => a + Number(r.service_charge || 0), 0) / rows.length)) : "—"}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Percent className="h-3.5 w-3.5" /> Categories</p><p className="text-2xl font-extrabold">{cats.length}</p></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inp + " w-56 pl-8"} placeholder="Search service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className={inp + " w-48"} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Distrib.</th><th className="px-3 py-2">DRO</th><th className="px-3 py-2">TRO</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2 text-right">Edit</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No services. Admin can add them in Service Catalog.</td></tr>
                : filtered.map((s) => (<tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{s.name}{!s.is_active && <span className="ml-1 text-[10px] text-muted-foreground">(off)</span>}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.category ?? "—"}</td>
                  <td className="px-3 py-2 font-semibold">{inr(s.service_charge)}</td>
                  <td className="px-3 py-2">{s.company_commission}% <span className="text-[11px] text-muted-foreground">({inr(s.service_charge * s.company_commission / 100)})</span></td>
                  <td className="px-3 py-2">{s.distributor_commission}%</td><td className="px-3 py-2">{s.dro_commission}%</td><td className="px-3 py-2">{s.tro_commission}%</td>
                  <td className="px-3 py-2 text-india-green">{s.retailer_commission}% <span className="text-[11px]">({inr(s.service_charge * s.retailer_commission / 100)})</span></td>
                  <td className="px-3 py-2 text-right"><button onClick={() => openEdit(s)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit</button></td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="font-display text-lg font-extrabold">{edit.name}</p><p className="text-sm text-muted-foreground">{edit.category}</p></div><button onClick={() => setEdit(null)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
            <div className="mt-4"><label className="text-[11px] font-semibold text-muted-foreground">Total Cost of Service (₹)</label><input type="number" min="0" className={inp + " h-10"} value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: e.target.value })} /></div>
            <div className="mb-2 mt-4 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Commission split (%)</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pctOk ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Total: {totalPct}% {pctOk ? "✓" : "(must be 100%)"}</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COMM.map(([label, key]) => (<div key={key}><label className="text-[11px] font-semibold text-muted-foreground">{label} (%)</label><input type="number" min="0" max="100" className={inp} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /><p className="mt-0.5 text-[11px] text-muted-foreground">= {inr(amt(form[key]))}</p></div>))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-india-green text-white hover:bg-india-green/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</Button>
              <Button variant="outline" onClick={() => setEdit(null)}><X className="h-4 w-4" /> Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </AccountantShell>
  );
}
