import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Users, Search, Download, IndianRupee, Activity, CheckCircle2, Clock, XCircle,
  Wallet, ArrowDownLeft, ArrowUpRight, Filter, ChevronRight, Eye, Pencil, Ban, Power,
  Store, ArrowLeft, Mail, MapPin, Phone, CalendarDays, BadgeCheck, Layers, TrendingUp,
} from "lucide-react";
import { RegionalShell, type RegionalConfig } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  type RetailerActivity, type RetailerStatus, type WalletTxn,
  inr, fmtDate, fmtDateTime, enrichRetailer, activitySummary, findRetailer, walletHistory,
} from "@/components/regional/regional-mock-data";

const accentTone = (cfg: RegionalConfig): "rose" | "saffron" => (cfg.accent === "rose" ? "rose" : "saffron");

const STATUS_STYLE: Record<RetailerStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Suspended: "bg-rose-50 text-rose-700 border-rose-200",
};

const TXN_STATUS_STYLE: Record<WalletTxn["status"], string> = {
  Success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
};

/* ===================== Listing Screen ===================== */
export function RetailerActivityList({ cfg, rows, district }: { cfg: RegionalConfig; rows: RetailerActivity[]; district: boolean }) {
  const navigate = useNavigate();
  const data = useMemo(() => rows.map(enrichRetailer), [rows]);
  const summary = useMemo(() => activitySummary(rows), [rows]);

  const [query, setQuery] = useState("");
  const [taluk, setTaluk] = useState("all");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");
  const [txnStatus, setTxnStatus] = useState("all");
  const [minBal, setMinBal] = useState("");
  const [maxBal, setMaxBal] = useState("");
  const [localStatus, setLocalStatus] = useState<Record<string, RetailerStatus>>({});

  const taluks = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.taluk)))], [rows]);
  const services = useMemo(() => ["all", ...Array.from(new Set(data.flatMap((d) => d.serviceCategories)))].filter((s) => s !== "—"), [data]);

  const effStatus = (id: string, base: RetailerStatus) => localStatus[id] ?? base;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = minBal ? Number(minBal) : -Infinity;
    const hi = maxBal ? Number(maxBal) : Infinity;
    return data.filter((d) => {
      const st = effStatus(d.id, d.status);
      if (taluk !== "all" && d.taluk !== taluk) return false;
      if (service !== "all" && !d.serviceCategories.includes(service)) return false;
      if (status !== "all" && st !== status) return false;
      if (txnStatus === "pending" && d.pendingTxns === 0) return false;
      if (txnStatus === "failed" && d.failedTxns === 0) return false;
      if (d.walletBalance < lo || d.walletBalance > hi) return false;
      if (!q) return true;
      return [d.id, d.name, d.phone, d.taluk, d.district].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, query, taluk, service, status, txnStatus, minBal, maxBal, localStatus]);

  const setRetailerStatus = (id: string, next: RetailerStatus) => {
    setLocalStatus((m) => ({ ...m, [id]: next }));
    toast.success(`Retailer ${id} marked ${next}`);
  };

  const resetFilters = () => {
    setQuery(""); setTaluk("all"); setService("all"); setStatus("all"); setTxnStatus("all"); setMinBal(""); setMaxBal("");
  };

  const exportCsv = () => {
    const headers = ["Agent ID", "Name", "Mobile", "District", "Taluk", "Services", "Total Txn", "Success", "Pending", "Failed", "Wallet Balance", "Wallet Credit", "Wallet Debit", "Last Txn", "Status"];
    const lines = filtered.map((d) => [
      d.id, d.name, d.phone, d.district, d.taluk, d.serviceCategories.join("|"),
      d.totalTxns, d.successTxns, d.pendingTxns, d.failedTxns,
      d.walletBalance, d.walletCredit, d.walletDebit, fmtDate(d.lastTxnAt), effStatus(d.id, d.status),
    ].join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${cfg.shortName}-retailer-activity.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const selectCls = "h-9 rounded-lg border border-border bg-white px-3 text-sm font-medium outline-none";

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          title="Retailer Activity"
          subtitle={`Monitor retailer transactions, services and wallets across ${cfg.scope}.`}
          actions={
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 h-9 text-sm font-semibold shadow-elev hover:bg-slate-800">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          }
        />

        {/* Hero overview banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-elev">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Network Snapshot</p>
              <p className="font-display text-3xl font-extrabold mt-1">{summary.totalRetailers} Retailers</p>
              <p className="text-xs text-white/70 mt-0.5">{summary.totalTxns.toLocaleString("en-IN")} transactions · {inr(summary.commission)} commission</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-5">
              <HeroStat label="Active" value={String(summary.activeRetailers)} accent="text-emerald-300" />
              <HeroStat label="Inactive" value={String(summary.inactiveRetailers)} accent="text-rose-300" />
              <HeroStat label="Wallet Balance" value={inr(summary.walletBalance)} accent="text-sky-300" />
              <HeroStat label="Success Rate" value={`${summary.totalTxns ? Math.round((summary.successTxns / summary.totalTxns) * 100) : 0}%`} accent="text-orange-300" />
            </div>
          </div>
        </div>

        {/* Retailers */}
        <section className="space-y-2.5">
          <SectionLabel icon={<Users className="h-3.5 w-3.5" />} text="Retailers" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Total Retailers" value={String(summary.totalRetailers)} icon={<Users className="h-5 w-5" />} tone={accentTone(cfg)} />
            <StatCard label="Active Retailers" value={String(summary.activeRetailers)} icon={<Store className="h-5 w-5" />} tone="green" />
            <StatCard label="Inactive Retailers" value={String(summary.inactiveRetailers)} icon={<Ban className="h-5 w-5" />} tone="rose" />
          </div>
        </section>

        {/* Transactions */}
        <section className="space-y-2.5">
          <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} text="Transactions" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Transactions" value={summary.totalTxns.toLocaleString("en-IN")} icon={<Activity className="h-5 w-5" />} tone="violet" />
            <StatCard label="Successful Txns" value={summary.successTxns.toLocaleString("en-IN")} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
            <StatCard label="Pending Txns" value={summary.pendingTxns.toLocaleString("en-IN")} icon={<Clock className="h-5 w-5" />} tone="saffron" />
            <StatCard label="Failed Txns" value={summary.failedTxns.toLocaleString("en-IN")} icon={<XCircle className="h-5 w-5" />} tone="rose" />
          </div>
        </section>

        {/* Wallet */}
        <section className="space-y-2.5">
          <SectionLabel icon={<Wallet className="h-3.5 w-3.5" />} text="Wallet & Commission" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Wallet Balance" value={inr(summary.walletBalance)} icon={<Wallet className="h-5 w-5" />} tone="sky" />
            <StatCard label="Total Wallet Credits" value={inr(summary.walletCredit)} icon={<ArrowDownLeft className="h-5 w-5" />} tone="green" />
            <StatCard label="Total Wallet Debits" value={inr(summary.walletDebit)} icon={<ArrowUpRight className="h-5 w-5" />} tone="rose" />
            <StatCard label="Commission Generated" value={inr(summary.commission)} icon={<IndianRupee className="h-5 w-5" />} tone="violet" />
          </div>
        </section>

        {/* Advanced filters */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-soft space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Advanced Filters
            <button onClick={resetFilters} className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800 normal-case">Reset</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-9 flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Agent ID, name, mobile…" className="bg-transparent flex-1 text-sm outline-none" />
            </div>
            {district && (
              <select value={taluk} onChange={(e) => setTaluk(e.target.value)} className={selectCls}>
                {taluks.map((t) => <option key={t} value={t}>{t === "all" ? "All Taluks" : t}</option>)}
              </select>
            )}
            <select value={service} onChange={(e) => setService(e.target.value)} className={selectCls}>
              {services.map((s) => <option key={s} value={s}>{s === "all" ? "All Services" : s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
            <select value={txnStatus} onChange={(e) => setTxnStatus(e.target.value)} className={selectCls}>
              <option value="all">Any Txn Status</option>
              <option value="pending">Has Pending</option>
              <option value="failed">Has Failed</option>
            </select>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 h-9">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={minBal} onChange={(e) => setMinBal(e.target.value)} placeholder="Min ₹" inputMode="numeric" className="w-16 bg-transparent text-sm outline-none" />
              <span className="text-muted-foreground text-xs">–</span>
              <input value={maxBal} onChange={(e) => setMaxBal(e.target.value)} placeholder="Max ₹" inputMode="numeric" className="w-16 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Showing <span className="font-bold text-slate-700">{filtered.length}</span> of {data.length} retailers</p>
        </div>

        {/* Listing table */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2.5 font-bold">Sl</th>
                  <th className="text-left px-3 py-2.5 font-bold">Agent ID</th>
                  <th className="text-left px-3 py-2.5 font-bold">Retailer</th>
                  <th className="text-left px-3 py-2.5 font-bold">Mobile</th>
                  {district && <th className="text-left px-3 py-2.5 font-bold">District</th>}
                  <th className="text-left px-3 py-2.5 font-bold">Taluk</th>
                  <th className="text-left px-3 py-2.5 font-bold">Services</th>
                  <th className="text-right px-3 py-2.5 font-bold">Total</th>
                  <th className="text-right px-3 py-2.5 font-bold text-emerald-600">Success</th>
                  <th className="text-right px-3 py-2.5 font-bold text-amber-600">Pending</th>
                  <th className="text-right px-3 py-2.5 font-bold text-rose-600">Failed</th>
                  <th className="text-right px-3 py-2.5 font-bold">Wallet Bal</th>
                  <th className="text-right px-3 py-2.5 font-bold">Credit</th>
                  <th className="text-right px-3 py-2.5 font-bold">Debit</th>
                  <th className="text-right px-3 py-2.5 font-bold">Txn Value</th>
                  <th className="text-left px-3 py-2.5 font-bold">Last Txn</th>
                  <th className="text-left px-3 py-2.5 font-bold">Status</th>
                  <th className="text-right px-3 py-2.5 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const st = effStatus(d.id, d.status);
                  return (
                    <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`${cfg.basePath}/retailers/${d.id}` as string} className="font-mono font-bold text-sky-600 hover:underline inline-flex items-center gap-1">
                          {d.id} <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.shop}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{d.phone}</td>
                      {district && <td className="px-3 py-2.5 text-xs">{d.district}</td>}
                      <td className="px-3 py-2.5 text-xs">{d.taluk}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {d.serviceCategories.slice(0, 3).map((s) => (
                            <span key={s} className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{s}</span>
                          ))}
                          {d.serviceCategories.length > 3 && <span className="text-[10px] text-muted-foreground">+{d.serviceCategories.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{d.totalTxns}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{d.successTxns}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{d.pendingTxns}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{d.failedTxns}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{inr(d.walletBalance)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{inr(d.walletCredit)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{inr(d.walletDebit)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{inr(d.walletCredit + d.walletDebit)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(d.lastTxnAt)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[st]}`}>{st}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate({ to: `${cfg.basePath}/retailers/${d.id}` as string })} title="View" className="h-7 w-7 rounded-md border border-border bg-white hover:bg-muted flex items-center justify-center text-slate-600"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => toast.info(`Edit ${d.id} (demo)`)} title="Edit" className="h-7 w-7 rounded-md border border-border bg-white hover:bg-muted flex items-center justify-center text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                          {st === "Active" ? (
                            <button onClick={() => setRetailerStatus(d.id, "Suspended")} title="Suspend" className="h-7 w-7 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600"><Ban className="h-3.5 w-3.5" /></button>
                          ) : (
                            <button onClick={() => setRetailerStatus(d.id, "Active")} title="Activate" className="h-7 w-7 rounded-md border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600"><Power className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={district ? 18 : 17} className="px-4 py-8 text-center text-sm text-muted-foreground">No retailers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}

/* ===================== Detail Screen ===================== */
export function RetailerActivityDetail({ cfg }: { cfg: RegionalConfig }) {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const d = useMemo(() => findRetailer(id), [id]);
  const history = useMemo(() => (d ? walletHistory(d) : []), [d]);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredHistory = useMemo(() => {
    return history.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      const ts = new Date(t.date).getTime();
      if (from && ts < new Date(from).getTime()) return false;
      if (to && ts > new Date(to).getTime() + 864e5) return false;
      return true;
    });
  }, [history, typeFilter, statusFilter, from, to]);

  if (!d) {
    return (
      <RegionalShell cfg={cfg}>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Retailer <span className="font-mono font-bold">{id}</span> not found.</p>
          <Link to={`${cfg.basePath}/retailers` as string} className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-sky-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to list</Link>
        </div>
      </RegionalShell>
    );
  }

  const selectCls = "h-9 rounded-lg border border-border bg-white px-3 text-sm font-medium outline-none";
  const txnTotal = d.totalTxns;
  const pct = (n: number) => (txnTotal ? Math.round((n / txnTotal) * 100) : 0);

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <button onClick={() => navigate({ to: `${cfg.basePath}/retailers` as string })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Retailer Activity
        </button>

        {/* Profile */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${cfg.accent === "rose" ? "from-rose-500 to-pink-600" : "from-amber-500 to-orange-600"} text-white flex items-center justify-center text-2xl font-extrabold shrink-0`}>
              {d.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold">{d.name}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[d.status]}`}>{d.status}</span>
              </div>
              <p className="font-mono text-sm font-bold text-sky-600">{d.id}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 mt-3 text-sm">
                <Info icon={<Store className="h-3.5 w-3.5" />} label="Shop" value={d.shop} />
                <Info icon={<Phone className="h-3.5 w-3.5" />} label="Mobile" value={d.phone} />
                <Info icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={d.email} />
                <Info icon={<MapPin className="h-3.5 w-3.5" />} label="District" value={d.district} />
                <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Taluk" value={d.taluk} />
                <Info icon={<CalendarDays className="h-3.5 w-3.5" />} label="Registered" value={fmtDate(d.registeredOn)} />
                <Info icon={<Activity className="h-3.5 w-3.5" />} label="Last Transaction" value={fmtDateTime(d.lastTxnAt)} />
                <Info icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Address" value={d.address} />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Transaction Summary</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total" value={d.totalTxns.toLocaleString("en-IN")} icon={<Activity className="h-5 w-5" />} tone="violet" />
            <StatCard label="Successful" value={`${d.successTxns} (${pct(d.successTxns)}%)`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
            <StatCard label="Pending" value={String(d.pendingTxns)} icon={<Clock className="h-5 w-5" />} tone="saffron" />
            <StatCard label="Failed" value={String(d.failedTxns)} icon={<XCircle className="h-5 w-5" />} tone="rose" />
            <StatCard label="Cancelled" value={String(d.cancelledTxns)} icon={<Ban className="h-5 w-5" />} tone="sky" />
          </div>
        </div>

        {/* Service usage */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-bold flex items-center gap-2"><Layers className="h-4 w-4" /> Service Usage Details</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Per-service requests, outcomes and revenue generated.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-right px-3 py-2.5 font-bold">Requests</th>
                  <th className="text-right px-3 py-2.5 font-bold text-emerald-600">Success</th>
                  <th className="text-right px-3 py-2.5 font-bold text-amber-600">Pending</th>
                  <th className="text-right px-3 py-2.5 font-bold text-rose-600">Failed</th>
                  <th className="text-right px-4 py-2.5 font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {d.services.map((s) => (
                  <tr key={s.key} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                        <span className="font-semibold">{s.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{s.requests}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{s.success}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{s.pending}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{s.failed}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{inr(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wallet overview */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Wallet Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Current Balance" value={inr(d.walletBalance)} icon={<Wallet className="h-5 w-5" />} tone="sky" />
            <StatCard label="Total Credits" value={inr(d.walletCredit)} icon={<ArrowDownLeft className="h-5 w-5" />} tone="green" />
            <StatCard label="Total Debits" value={inr(d.walletDebit)} icon={<ArrowUpRight className="h-5 w-5" />} tone="rose" />
            <StatCard label="Commission Earned" value={inr(d.commissionEarned)} icon={<TrendingUp className="h-5 w-5" />} tone="violet" />
            <StatCard label="Charges Deducted" value={inr(d.chargesDeducted)} icon={<IndianRupee className="h-5 w-5" />} tone="saffron" />
          </div>
        </div>

        {/* Wallet transaction history */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4" /> Wallet Transaction History</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} />
              <span className="text-xs text-muted-foreground">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
                <option value="all">All Types</option>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
                <option value="all">All Status</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Date</th>
                  <th className="text-left px-3 py-2.5 font-bold">Transaction ID</th>
                  <th className="text-left px-3 py-2.5 font-bold">Channel</th>
                  <th className="text-left px-3 py-2.5 font-bold">Type</th>
                  <th className="text-right px-3 py-2.5 font-bold">Amount</th>
                  <th className="text-left px-4 py-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(t.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.id}</td>
                    <td className="px-3 py-2.5 text-xs">{t.channel}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${t.type === "Credit" ? "text-emerald-700" : "text-rose-700"}`}>
                        {t.type === "Credit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{t.type}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${t.type === "Credit" ? "text-emerald-700" : "text-rose-700"}`}>{t.type === "Credit" ? "+" : "−"}{inr(t.amount)}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TXN_STATUS_STYLE[t.status]}`}>{t.status}</span></td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-semibold text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}