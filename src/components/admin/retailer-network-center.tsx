import { useMemo, useState } from "react";
import {
  Activity, BadgeIndianRupee, Ban, CheckCircle2, Download, MapPin, Power,
  Search, Store, TrendingUp, Wallet, type LucideIcon,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type KycStatus = "Verified" | "Pending" | "Rejected";
type RState = "Active" | "Suspended";
type Retailer = {
  id: string; name: string; shop: string; phone: string; district: string; taluk: string;
  kyc: KycStatus; wallet: number; txnToday: number; revenue: number; tier: "Platinum" | "Gold" | "Silver";
  state: RState; officer: string;
};

const KPI: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[] = [
  { label: "Total retailers", value: "8,412", detail: "+126 this month", icon: Store, tone: "bg-admin-soft text-admin" },
  { label: "Active today", value: "6,940", detail: "82.5% engagement", icon: Activity, tone: "bg-admin-success-soft text-admin-success" },
  { label: "Wallet float", value: "₹2.84Cr", detail: "78% liquidity", icon: Wallet, tone: "bg-admin-warning-soft text-admin-warning" },
  { label: "KYC pending", value: "116", detail: "34 high priority", icon: BadgeIndianRupee, tone: "bg-admin-danger-soft text-admin-danger" },
];

const GROWTH = [
  { m: "Jan", retailers: 6120 }, { m: "Feb", retailers: 6580 }, { m: "Mar", retailers: 7010 },
  { m: "Apr", retailers: 7440 }, { m: "May", retailers: 7980 }, { m: "Jun", retailers: 8412 },
];

const SEED: Retailer[] = [
  { id: "RT-1001", name: "Harshitha N", shop: "Sri Sai Digital", phone: "9876789876", district: "Bengaluru Urban", taluk: "Anekal", kyc: "Verified", wallet: 18420, txnToday: 155, revenue: 18420, tier: "Platinum", state: "Active", officer: "TRO-7711" },
  { id: "RT-1002", name: "Ravi Kumar", shop: "Ravi Net Café", phone: "9123456780", district: "Bengaluru Urban", taluk: "Anekal", kyc: "Verified", wallet: 12110, txnToday: 137, revenue: 12110, tier: "Gold", state: "Active", officer: "TRO-7711" },
  { id: "RT-1003", name: "Anita Desai", shop: "Anita e-Seva", phone: "9871122334", district: "Bengaluru Urban", taluk: "Anekal", kyc: "Pending", wallet: 0, txnToday: 0, revenue: 0, tier: "Silver", state: "Suspended", officer: "TRO-7711" },
  { id: "RT-1004", name: "Vikram Singh", shop: "VS Online", phone: "9912345678", district: "Bengaluru Urban", taluk: "Hoskote", kyc: "Verified", wallet: 15230, txnToday: 124, revenue: 15230, tier: "Gold", state: "Active", officer: "TRO-7712" },
  { id: "RT-1005", name: "Sunita Rao", shop: "Sunita Mini Bank", phone: "9845001122", district: "Bengaluru Urban", taluk: "Hoskote", kyc: "Verified", wallet: 21940, txnToday: 142, revenue: 21940, tier: "Platinum", state: "Active", officer: "TRO-7712" },
  { id: "RT-1006", name: "Manoj Gupta", shop: "Manoj Digital Point", phone: "9800223344", district: "Bengaluru Urban", taluk: "Devanahalli", kyc: "Rejected", wallet: 0, txnToday: 0, revenue: 0, tier: "Silver", state: "Suspended", officer: "TRO-7715" },
  { id: "RT-1007", name: "Lakshmi Iyer", shop: "Lakshmi Seva Kendra", phone: "9810334455", district: "Bengaluru Urban", taluk: "Devanahalli", kyc: "Verified", wallet: 19560, txnToday: 150, revenue: 19560, tier: "Gold", state: "Active", officer: "TRO-7715" },
  { id: "RT-1010", name: "Suresh Babu", shop: "Suresh e-Mitra", phone: "9840667788", district: "Bengaluru Urban", taluk: "Yelahanka", kyc: "Verified", wallet: 24330, txnToday: 153, revenue: 24330, tier: "Platinum", state: "Active", officer: "TRO-7714" },
];

const KYC_TONE: Record<KycStatus, string> = {
  Verified: "bg-admin-success-soft text-admin-success",
  Pending: "bg-admin-warning-soft text-admin-warning",
  Rejected: "bg-admin-danger-soft text-admin-danger",
};
const TIER_TONE: Record<Retailer["tier"], string> = {
  Platinum: "bg-admin-soft text-admin",
  Gold: "bg-admin-warning-soft text-admin-warning",
  Silver: "bg-muted text-muted-foreground",
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function RetailerNetworkCenter() {
  const [rows, setRows] = useState<Retailer[]>(SEED);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Retailer | null>(SEED[0]);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchTab = tab === "All" || (tab === "Active" || tab === "Suspended" ? r.state === tab : r.kyc === tab);
      const matchQ = !t || `${r.id} ${r.name} ${r.shop} ${r.phone} ${r.taluk}`.toLowerCase().includes(t);
      return matchTab && matchQ;
    });
  }, [rows, tab, query]);

  const toggleState = (id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, state: r.state === "Active" ? "Suspended" : "Active" } : r));
    const r = rows.find((x) => x.id === id);
    toast.success(`${id} ${r?.state === "Active" ? "suspended" : "reactivated"}`);
  };
  const approveKyc = (id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, kyc: "Verified", state: "Active" } : r));
    toast.success(`${id} KYC verified`);
  };

  const exportRows = () => {
    downloadCsv("retailer-network.csv", ["ID", "Name", "Shop", "Phone", "District", "Taluk", "KYC", "Wallet", "Txn today", "Revenue", "Tier", "State", "Officer"],
      rows.map((r) => [r.id, r.name, r.shop, r.phone, r.district, r.taluk, r.kyc, String(r.wallet), String(r.txnToday), String(r.revenue), r.tier, r.state, r.officer]));
    toast.success("Retailer network exported");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((k) => { const Icon = k.icon; return (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", k.tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{k.value}</p><p className="mt-1 text-[10px] font-semibold text-muted-foreground">{k.detail}</p>
          </div>
        ); })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.7fr)]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold">Network growth</h2><p className="text-[10px] text-muted-foreground">Onboarded retailers · last 6 months</p></div><span className="inline-flex items-center gap-1 rounded-lg bg-admin-success-soft px-2 py-1 text-[9px] font-extrabold text-admin-success"><TrendingUp className="h-3 w-3" /> +37.4%</span></div>
          <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={GROWTH} margin={{ left: -10, right: 5 }}><defs><linearGradient id="rtGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--admin)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--admin)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={10} /><YAxis tickLine={false} axisLine={false} fontSize={10} domain={["dataMin - 200", "dataMax + 200"]} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} /><Area type="monotone" dataKey="retailers" stroke="var(--admin)" strokeWidth={2.5} fill="url(#rtGrowth)" /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
          <h2 className="text-sm font-extrabold">Retailer profile</h2>
          {selected ? (
            <div className="mt-3 space-y-3 text-[11px]">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-admin font-display text-sm font-extrabold text-admin-foreground">{selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div><p className="text-sm font-extrabold">{selected.name}</p><p className="text-[10px] text-muted-foreground">{selected.shop} · {selected.id}</p></div></div>
              <div className="grid grid-cols-2 gap-2">
                {[["Phone", selected.phone], ["Taluk", selected.taluk], ["Wallet", inr(selected.wallet)], ["Revenue", inr(selected.revenue)], ["Txn today", String(selected.txnToday)], ["Officer", selected.officer]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-muted/50 px-2.5 py-2"><p className="text-[8px] font-bold uppercase text-muted-foreground">{l}</p><p className="font-bold">{v}</p></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", KYC_TONE[selected.kyc])}>KYC {selected.kyc}</span>
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", TIER_TONE[selected.tier])}>{selected.tier}</span>
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", selected.state === "Active" ? "bg-admin-success-soft text-admin-success" : "bg-admin-danger-soft text-admin-danger")}>{selected.state}</span>
              </div>
              <div className="flex gap-2 pt-1">
                {selected.kyc !== "Verified" && <Button size="sm" variant="outline" className="h-8 flex-1 gap-1 text-[10px] text-admin-success" onClick={() => approveKyc(selected.id)}><CheckCircle2 className="h-3 w-3" /> Verify KYC</Button>}
                <Button size="sm" variant="outline" className={cn("h-8 flex-1 gap-1 text-[10px]", selected.state === "Active" ? "text-admin-danger" : "text-admin-success")} onClick={() => toggleState(selected.id)}>{selected.state === "Active" ? <><Ban className="h-3 w-3" /> Suspend</> : <><Power className="h-3 w-3" /> Activate</>}</Button>
              </div>
            </div>
          ) : <p className="mt-3 text-[11px] text-muted-foreground">Select a retailer from the table.</p>}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="All">All</TabsTrigger><TabsTrigger value="Active">Active</TabsTrigger><TabsTrigger value="Suspended">Suspended</TabsTrigger><TabsTrigger value="Pending">KYC pending</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportRows}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left">
          <thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Retailer", "Location", "KYC", "Tier", "Wallet", "Txn", "Revenue", "State", "Action"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className={cn("cursor-pointer text-[11px] transition hover:bg-muted/30", selected?.id === r.id && "bg-admin-soft/40")} onClick={() => setSelected(r)}>
                <td className="px-4 py-3"><p className="font-bold">{r.name}</p><p className="font-mono text-[9px] text-muted-foreground">{r.shop} · {r.id}</p></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-3 w-3 text-muted-foreground" />{r.taluk}</span></td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", KYC_TONE[r.kyc])}>{r.kyc}</span></td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", TIER_TONE[r.tier])}>{r.tier}</span></td>
                <td className="px-4 py-3 font-semibold">{inr(r.wallet)}</td>
                <td className="px-4 py-3 font-semibold">{r.txnToday}</td>
                <td className="px-4 py-3 font-extrabold">{inr(r.revenue)}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", r.state === "Active" ? "bg-admin-success-soft text-admin-success" : "bg-admin-danger-soft text-admin-danger")}>{r.state}</span></td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    {r.kyc !== "Verified" && <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-success" onClick={() => approveKyc(r.id)}><CheckCircle2 className="h-3 w-3" /> Verify</Button>}
                    <Button size="sm" variant="outline" className={cn("h-7 gap-1 px-2 text-[10px]", r.state === "Active" ? "text-admin-danger" : "text-admin-success")} onClick={() => toggleState(r.id)}>{r.state === "Active" ? <><Ban className="h-3 w-3" /> Suspend</> : <><Power className="h-3 w-3" /> Activate</>}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">No retailers match.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
