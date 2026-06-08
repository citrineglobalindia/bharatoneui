import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Users, Activity, Layers, IndianRupee, Download, Search, MapPin, TrendingUp, Store, Grid3x3, CheckCircle2,
  AlertTriangle, Clock, Phone, UserX,
} from "lucide-react";
import { toast } from "sonner";
import { RegionalShell, type RegionalConfig } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  type RetailerActivity, SERVICE_META, WEEKLY_SERVICES, inr,
  serviceTotal, aggregateServices, summarize, serviceRevenueModel, topByVolume, taluksSummary, exportRetailersCsv,
  inactiveTros, totalCommissionLost, fmtDate,
} from "@/components/regional/regional-mock-data";

const accentHex = (cfg: RegionalConfig) => (cfg.accent === "rose" ? "#f43f5e" : "#f59e0b");
const accentTone = (cfg: RegionalConfig): "rose" | "saffron" => (cfg.accent === "rose" ? "rose" : "saffron");

/* ---------------- Dashboard ---------------- */
export function ReportDashboard({ cfg, rows, district }: { cfg: RegionalConfig; rows: RetailerActivity[]; district: boolean }) {
  const s = useMemo(() => summarize(rows), [rows]);
  const mix = useMemo(() => aggregateServices(rows), [rows]);
  const top = useMemo(() => topByVolume(rows), [rows]);
  const taluks = useMemo(() => taluksSummary(rows), [rows]);
  const txnModel = useMemo(() => serviceRevenueModel(rows), [rows]);
  const hex = accentHex(cfg);

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-6">
        <PageHeader
          icon={<MapPin className="h-5 w-5" />}
          title={`${cfg.user.name}'s ${cfg.shortName} Dashboard`}
          subtitle={`Live service activity across ${cfg.scope}.`}
          badge={
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.accent === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <Activity className="h-3 w-3" /> Reports Only
            </span>
          }
        />

        {/* Retailer count section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Retailer Count
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Active Retailers"
              value={String(s.activeToday)}
              delta={{ value: `${Math.round((s.activeToday / Math.max(s.totalRetailers, 1)) * 100)}% of network live`, positive: true }}
              icon={<Store className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              label="Inactive Retailers"
              value={String(s.inactiveToday)}
              delta={{ value: `${Math.round((s.inactiveToday / Math.max(s.totalRetailers, 1)) * 100)}% idle today`, positive: false }}
              icon={<Store className="h-5 w-5" />}
              tone="rose"
            />
          <StatCard
            label="Total Retailers"
            value={String(s.totalRetailers)}
            delta={{ value: district ? "across the district" : "across the taluk", positive: true }}
            icon={<Users className="h-5 w-5" />}
            tone={accentTone(cfg)}
          />
        </div>
      </div>

      {/* Inactive TROs section — only for DRO (district) view */}
      {district && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <UserX className="h-3.5 w-3.5" /> Inactive TROs
          </h3>
          <InactiveTroPanel cfg={cfg} />
        </div>
      )}

      {/* Service transaction & revenue section */}
      <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Transactions & Revenue
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Transactions Today" value={s.servicesToday.toLocaleString("en-IN")} delta={{ value: "across all services", positive: true }} icon={<Layers className="h-5 w-5" />} tone="violet" />
            <StatCard label="Revenue Today" value={inr(txnModel.totalRevenue)} delta={{ value: "commission earned", positive: true }} icon={<IndianRupee className="h-5 w-5" />} tone="sky" />
          </div>
        </div>

        {/* Transaction model / calculation logic */}
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: hex }} /> Transaction Model & Calculation Logic</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">How transaction counts translate into reported revenue, per service.</p>
            </div>
            <span className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-1.5 text-[11px] font-mono font-semibold text-slate-700">
              Revenue = Σ (Transactions × Commission rate)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-right px-3 py-2.5 font-bold">Transactions</th>
                  <th className="text-right px-3 py-2.5 font-bold">Rate / Txn</th>
                  <th className="text-right px-3 py-2.5 font-bold">Calculation</th>
                  <th className="text-right px-4 py-2.5 font-bold">Revenue</th>
                  <th className="text-right px-4 py-2.5 font-bold">% Share</th>
                </tr>
              </thead>
              <tbody>
                {txnModel.model.map((m) => (
                  <tr key={m.key} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                        <div className="leading-tight">
                          <p className="font-semibold">{m.key}</p>
                          <p className="text-[11px] text-muted-foreground">{m.label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{m.count.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inr(m.rate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-[11px] text-muted-foreground">{m.count.toLocaleString("en-IN")} × {m.rate}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{inr(m.revenue)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{txnModel.totalRevenue ? Math.round((m.revenue / txnModel.totalRevenue) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{txnModel.totalCount.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{inr(txnModel.totalRevenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border">
            Commission rates are per-transaction averages set per service. Revenue for each service is its transaction count multiplied by its rate; the dashboard total is the sum across all services.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Daily Services Trend</h3>
                <p className="text-[11px] text-muted-foreground">Service volume over the last 7 days</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={WEEKLY_SERVICES}>
                  <defs>
                    <linearGradient id="svcArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={hex} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="services" stroke={hex} fill="url(#svcArea)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-1">Service Mix</h3>
            <p className="text-[11px] text-muted-foreground mb-2">Today by service type</p>
            <div className="h-52">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={mix} dataKey="count" nameKey="key" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {mix.map((m) => (
                <div key={m.key} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                  <span className="font-semibold text-slate-700">{m.key}</span>
                  <span className="ml-auto font-bold">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: hex }} /> Top Retailers by Volume</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill={hex} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: hex }} /> {district ? "Taluk-wise Breakdown" : "Service Revenue Split"}
            </h3>
            {district ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-bold">Taluk</th>
                      <th className="text-right px-3 py-2 font-bold">Retailers</th>
                      <th className="text-right px-3 py-2 font-bold">Services</th>
                      <th className="text-right px-3 py-2 font-bold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taluks.map((t) => (
                      <tr key={t.taluk} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-semibold">{t.taluk}</td>
                        <td className="px-3 py-2 text-right">{t.retailers}</td>
                        <td className="px-3 py-2 text-right font-bold">{t.services}</td>
                        <td className="px-3 py-2 text-right">{inr(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={mix}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}

/* ---------------- Inactive TRO Panel ---------------- */
function InactiveTroPanel({ cfg }: { cfg: RegionalConfig }) {
  const list = useMemo(() => inactiveTros(cfg.user.role === "DRO" ? "DRO-01" : "DRO-02"), [cfg]);
  const totalTros = useMemo(() => {
    // Count all TROs under this DRO
    return list.length + (cfg.user.role === "DRO" ? 2 : 0); // rough estimate for demo
  }, [list, cfg]);

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <p className="text-sm font-semibold text-slate-700">All TROs are currently active.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <p className="text-sm font-bold">{list.length} Inactive TRO{list.length > 1 ? "s" : ""} under your district</p>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {list.filter((t) => t.inactiveDays >= 7).length} critical (7+ days)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">TRO Officer</th>
              <th className="text-left px-3 py-2.5 font-bold">Scope</th>
              <th className="text-left px-3 py-2.5 font-bold">Last Active</th>
              <th className="text-right px-3 py-2.5 font-bold">Inactive For</th>
              <th className="text-left px-4 py-2.5 font-bold">Reason / Remark</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-extrabold">{t.name[0]}</div>
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{t.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-700">{t.scope}</td>
                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{fmtDate(t.lastActiveAt)}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    t.inactiveDays >= 14 ? "bg-rose-50 text-rose-700 border-rose-200" :
                    t.inactiveDays >= 7 ? "bg-orange-50 text-orange-700 border-orange-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {t.inactiveDays} day{t.inactiveDays > 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{t.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Retailer Activity ---------------- */
export function ReportRetailers({ cfg, rows, district }: { cfg: RegionalConfig; rows: RetailerActivity[]; district: boolean }) {
  const [query, setQuery] = useState("");
  const [taluk, setTaluk] = useState("all");
  const [onlyActive, setOnlyActive] = useState(false);

  const taluks = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.taluk)))], [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (taluk !== "all" && r.taluk !== taluk) return false;
      if (onlyActive && !r.active) return false;
      if (!q) return true;
      return [r.name, r.shop, r.phone, r.id, r.taluk].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, taluk, onlyActive]);

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          title="Retailer Activity"
          subtitle={`What each retailer is applying today across ${cfg.scope}.`}
          actions={
            <button
              onClick={() => { exportRetailersCsv(filtered, `${cfg.shortName}-retailer-activity.csv`); toast.success("CSV exported"); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 h-9 text-sm font-semibold shadow-elev hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-9 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, shop, phone…" className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          {district && (
            <select value={taluk} onChange={(e) => setTaluk(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-medium">
              {taluks.map((t) => <option key={t} value={t}>{t === "all" ? "All Taluks" : t}</option>)}
            </select>
          )}
          <button
            onClick={() => setOnlyActive((v) => !v)}
            className={`h-9 rounded-lg border px-3 text-sm font-semibold ${onlyActive ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-border text-slate-700"}`}
          >
            Active only
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Retailer</th>
                  {district && <th className="text-left px-3 py-2.5 font-bold">Taluk</th>}
                  {SERVICE_META.map((s) => <th key={s.key} className="text-right px-2 py-2.5 font-bold">{s.key}</th>)}
                  <th className="text-right px-3 py-2.5 font-bold">Total</th>
                  <th className="text-right px-4 py-2.5 font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <div className="leading-tight">
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.shop} · {r.phone}</p>
                        </div>
                      </div>
                    </td>
                    {district && <td className="px-3 py-2.5 text-xs">{r.taluk}</td>}
                    {SERVICE_META.map((s) => <td key={s.key} className="px-2 py-2.5 text-right tabular-nums">{r.today[s.key] || "—"}</td>)}
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{serviceTotal(r)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{inr(r.revenue)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">No retailers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}

/* ---------------- Service Analytics ---------------- */
export function ReportServices({ cfg, rows, district }: { cfg: RegionalConfig; rows: RetailerActivity[]; district: boolean }) {
  const mix = useMemo(() => aggregateServices(rows), [rows]);
  const total = mix.reduce((sum, m) => sum + m.count, 0);
  const hex = accentHex(cfg);

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-6">
        <PageHeader
          icon={<Layers className="h-5 w-5" />}
          title="Service Analytics"
          subtitle={`Service-wise counts and contribution across ${cfg.scope}.`}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {mix.map((m) => (
            <div key={m.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ background: m.color }} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{m.key}</p>
              <p className="font-display text-2xl font-extrabold mt-1">{m.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{total ? Math.round((m.count / total) * 100) : 0}% of total</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3">Service Counts</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={mix}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Weekly Service & Revenue</h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Last 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={WEEKLY_SERVICES}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="services" fill={hex} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> {district ? "Aggregated across all taluks in the district." : "Aggregated across all retailers in the taluk."}</p>
      </div>
    </RegionalShell>
  );
}

/* ---------------- Services Directory ---------------- */
const SERVICE_DESC: Record<string, string> = {
  AEPS: "Aadhaar-enabled cash withdrawals & balance enquiry.",
  DMT: "Domestic money transfer to any bank account.",
  Recharge: "Prepaid mobile, DTH and data card recharges.",
  BBPS: "Electricity, water, gas and utility bill payments.",
  PAN: "New PAN card application & corrections.",
  GST: "GST registration and return filing assistance.",
};

export function ReportServiceCatalog({ cfg, rows, district }: { cfg: RegionalConfig; rows: RetailerActivity[]; district: boolean }) {
  const [query, setQuery] = useState("");
  const mix = useMemo(() => aggregateServices(rows), [rows]);
  const total = mix.reduce((sum, m) => sum + m.count, 0);
  const hex = accentHex(cfg);

  const catalog = useMemo(() => {
    return mix.map((m) => {
      const offering = rows.filter((r) => r.today[m.key as keyof RetailerActivity["today"]] > 0).length;
      const live = rows.filter((r) => r.active).length;
      return {
        ...m,
        desc: SERVICE_DESC[m.key] ?? "",
        offering,
        adoption: live ? Math.round((offering / live) * 100) : 0,
        share: total ? Math.round((m.count / total) * 100) : 0,
      };
    });
  }, [mix, rows, total]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => c.key.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));
  }, [catalog, query]);

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-6">
        <PageHeader
          icon={<Grid3x3 className="h-5 w-5" />}
          title="Services Directory"
          subtitle={`All services being offered across ${cfg.scope}.`}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Services" value={String(mix.length)} delta={{ value: "live in region", positive: true }} icon={<Layers className="h-5 w-5" />} tone={accentTone(cfg)} />
          <StatCard label="Transactions Today" value={total.toLocaleString("en-IN")} delta={{ value: "all services", positive: true }} icon={<Activity className="h-5 w-5" />} tone="violet" />
          <StatCard label="Retailers Live" value={String(rows.filter((r) => r.active).length)} delta={{ value: "offering services", positive: true }} icon={<Store className="h-5 w-5" />} tone="green" />
          <StatCard label="Top Service" value={[...mix].sort((a, b) => b.count - a.count)[0]?.key ?? "—"} delta={{ value: "by volume", positive: true }} icon={<TrendingUp className="h-5 w-5" />} tone="sky" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-9 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a service…" className="bg-transparent flex-1 text-sm outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}1a` }}>
                  <Layers className="h-5 w-5" style={{ color: c.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold truncate">{c.label}</h3>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{c.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="rounded-lg bg-muted/50 py-1.5">
                  <p className="font-display text-lg font-extrabold leading-none" style={{ color: c.color }}>{c.count}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Today</p>
                </div>
                <div className="rounded-lg bg-muted/50 py-1.5">
                  <p className="font-display text-lg font-extrabold leading-none">{c.offering}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Retailers</p>
                </div>
                <div className="rounded-lg bg-muted/50 py-1.5">
                  <p className="font-display text-lg font-extrabold leading-none">{c.share}%</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Share</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1">
                  <span>Adoption</span><span>{c.adoption}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.adoption}%`, background: c.color }} />
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No services match your search.</div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> {district ? "Service offerings aggregated across all taluks." : "Service offerings across retailers in the taluk."} <span style={{ color: hex }}>·</span> Read-only</p>
      </div>
    </RegionalShell>
  );
}