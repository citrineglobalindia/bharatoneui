import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Network, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Partner = { id: string; name: string; partner_type: string; territory: string | null; commission_pct: number; status: string };
type Payout = { id: string; partner_id: string; period: string; amount: number; status: string; note: string | null; created_at: string };

const db = supabase as any;
const input = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const typeLabel: Record<string, string> = { distributor: "Distributor", master_distributor: "Master Distributor", franchise: "Franchise" };
const payTone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700", on_hold: "bg-slate-100 text-slate-600" };

export function FranchisePanel() {
  const [tab, setTab] = useState<"partners" | "payouts">("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [pf, setPf] = useState({ name: "", partner_type: "distributor", territory: "", commission_pct: "" });
  const [yf, setYf] = useState({ partner_id: "", period: "", amount: "" });

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: p }, { data: y }] = await Promise.all([
      db.from("franchise_partners").select("*").order("created_at", { ascending: false }),
      db.from("franchise_payouts").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setPartners((p as Partner[]) ?? []);
    setPayouts((y as Payout[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const addPartner = async () => {
    if (!pf.name.trim()) { toast.error("Name is required"); return; }
    const { error } = await db.from("franchise_partners").insert({ name: pf.name, partner_type: pf.partner_type, territory: pf.territory || null, commission_pct: Number(pf.commission_pct) || 0 });
    if (error) return toast.error(error.message);
    toast.success("Partner added");
    setPf({ name: "", partner_type: "distributor", territory: "", commission_pct: "" });
    load();
  };
  const setCommission = async (p: Partner, pct: number) => {
    await db.from("franchise_partners").update({ commission_pct: pct }).eq("id", p.id);
    setPartners((ps) => ps.map((x) => (x.id === p.id ? { ...x, commission_pct: pct } : x)));
  };
  const toggle = async (p: Partner) => {
    const s = p.status === "active" ? "inactive" : "active";
    await db.from("franchise_partners").update({ status: s }).eq("id", p.id);
    setPartners((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: s } : x)));
  };

  const addPayout = async () => {
    if (!yf.partner_id || !yf.period.trim() || !(Number(yf.amount) > 0)) { toast.error("Partner, period and amount are required"); return; }
    const { error } = await db.from("franchise_payouts").insert({ partner_id: yf.partner_id, period: yf.period, amount: Number(yf.amount) });
    if (error) return toast.error(error.message);
    toast.success("Payout recorded");
    setYf({ partner_id: "", period: "", amount: "" });
    load();
  };
  const markPaid = async (y: Payout) => {
    await db.from("franchise_payouts").update({ status: "paid" }).eq("id", y.id);
    setPayouts((ys) => ys.map((x) => (x.id === y.id ? { ...x, status: "paid" } : x)));
  };
  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Network className="h-5 w-5 text-india-green" /> Franchise Management</h2>
          <p className="text-sm text-muted-foreground">Partners, territories, commission hierarchy and payouts.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="flex gap-2">
        {(["partners", "payouts"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 h-9 text-sm font-semibold capitalize transition ${tab === k ? "bg-india-green text-white" : "bg-muted hover:bg-muted/70"}`}>{k}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : tab === "partners" ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add partner</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input className={input} placeholder="Partner name *" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} />
              <select className={input} value={pf.partner_type} onChange={(e) => setPf({ ...pf, partner_type: e.target.value })}>
                <option value="distributor">Distributor</option><option value="master_distributor">Master Distributor</option><option value="franchise">Franchise</option>
              </select>
              <input className={input} placeholder="Territory" value={pf.territory} onChange={(e) => setPf({ ...pf, territory: e.target.value })} />
              <input className={input} placeholder="Commission %" value={pf.commission_pct} onChange={(e) => setPf({ ...pf, commission_pct: e.target.value.replace(/[^\d.]/g, "") })} />
              <button onClick={addPartner} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-bold text-white hover:bg-india-green/90"><Plus className="h-4 w-4" /> Add</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Partner</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Territory</th><th className="px-3 py-2">Commission %</th><th className="px-3 py-2 text-right">Status</th></tr></thead>
              <tbody>
                {partners.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No partners yet.</td></tr> : partners.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2">{typeLabel[p.partner_type] ?? p.partner_type}</td>
                    <td className="px-3 py-2">{p.territory || "—"}</td>
                    <td className="px-3 py-2"><input defaultValue={p.commission_pct} onBlur={(e) => setCommission(p, Number(e.target.value) || 0)} className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm" /></td>
                    <td className="px-3 py-2 text-right"><button onClick={() => toggle(p)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Record payout</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select className={input} value={yf.partner_id} onChange={(e) => setYf({ ...yf, partner_id: e.target.value })}>
                <option value="">Select partner</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className={input} placeholder="Period (e.g. Jun 2026)" value={yf.period} onChange={(e) => setYf({ ...yf, period: e.target.value })} />
              <input className={input} placeholder="Amount ₹" value={yf.amount} onChange={(e) => setYf({ ...yf, amount: e.target.value.replace(/[^\d]/g, "") })} />
              <button onClick={addPayout} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-bold text-white hover:bg-india-green/90"><Plus className="h-4 w-4" /> Record</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Partner</th><th className="px-3 py-2">Period</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
              <tbody>
                {payouts.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No payouts yet.</td></tr> : payouts.map((y) => (
                  <tr key={y.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{partnerName(y.partner_id)}</td>
                    <td className="px-3 py-2">{y.period}</td>
                    <td className="px-3 py-2 font-semibold">{inr(y.amount)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${payTone[y.status]}`}>{y.status.replace("_", " ")}</span></td>
                    <td className="px-3 py-2 text-right">{y.status !== "paid" && <button onClick={() => markPaid(y)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /> Mark paid</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
