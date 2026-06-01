import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Users, Activity, Layers, IndianRupee, Download, Search, Network, TrendingUp,
  Store, Coins, ChevronRight, Building2, MapPinned,
} from "lucide-react";
import { toast } from "sonner";
import { DistributorShell } from "@/components/distributor/distributor-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  RETAILERS, OFFICERS, SERVICE_META, WEEKLY, MONTHLY, inr, serviceTotal,
  retailerCommission, aggregateServices, summarize, officerSummary, topRetailers,
  exportRetailersCsv, type Retailer,
} from "@/components/distributor/distributor-data";

const HEX = "#0ea5e9";

/* ---------------- Dashboard ---------------- */
export function DistributorDashboard() {
  const s = useMemo(() => summarize(RETAILERS), []);
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const top = useMemo(() => topRetailers(RETAILERS), []);
  const dros = OFFICERS.filter((o) => o.role === "DRO");

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Karthik's Distributor Dashboard"
          subtitle="Live oversight of DRO, TRO and retailer network across the zone."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
              <Activity className="h-3 w-3" /> Live Network
            </span>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="DROs / TROs" value={`${dros.length} / ${OFFICERS.length - dros.length}`} delta={{ value: "officers mapped", positive: true }} icon={<Building2 className="h-5 w-5" />} tone="rose" />
          <StatCard label="Retailers" value={String(s.totalRetailers)} delta={{ value: `${s.activeToday} active today`, positive: true }} icon={<Users className="h-5 w-5" />} tone="sky" />
          <StatCard label="Services Today" value={s.servicesToday.toLocaleString("en-IN")} delta={{ value: "across all services", positive: true }} icon={<Layers className="h-5 w-5" />} tone="violet" />
          <StatCard label="Commission Today" value={inr(s.commissionToday)} delta={{ value: "+9.6% vs avg", positive: true }} icon={<Coins className="h-5 w-5" />} tone="green" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today Revenue" value={inr(s.revenueToday)} icon={<IndianRupee className="h-5 w-5" />} tone="saffron" />
          <StatCard label="This Week" value={s.weekServices.toLocaleString("en-IN")} delta={{ value: "services", positive: true }} icon={<Activity className="h-5 w-5" />} tone="sky" />
          <StatCard label="This Month" value={s.monthServices.toLocaleString("en-IN")} delta={{ value: "services", positive: true }} icon={<TrendingUp className="h-5 w-5" />} tone="violet" />
          <StatCard label="Active Shops" value={`${Math.round((s.activeToday / s.totalRetailers) * 100)}%`} delta={{ value: "live now", positive: true }} icon={<Store className="h-5 w-5" />} tone="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Daily Services & Commission</h3>
                <p className="text-[11px] text-muted-foreground">Network volume over the last 7 days</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={WEEKLY}>
                  <defs>
                    <linearGradient id="dsvc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="services" stroke={HEX} fill="url(#dsvc)" strokeWidth={2} />
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
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: HEX }} /> Top Retailers by Volume</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill={HEX} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: HEX }} /> Monthly Commission Trend</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="commission" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Network Map ---------------- */
export function DistributorNetwork() {
  const dros = OFFICERS.filter((o) => o.role === "DRO");
  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Network Map"
          subtitle="DRO → TRO → Retailer hierarchy mapped under you."
        />
        <div className="space-y-5">
          {dros.map((dro) => {
            const ds = officerSummary(dro.id);
            const tros = OFFICERS.filter((o) => o.parentId === dro.id);
            return (
              <div key={dro.id} className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-rose-50 to-white px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-extrabold">{dro.name[0]}</div>
                    <div>
                      <p className="font-bold flex items-center gap-2">{dro.name}
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase">DRO</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{dro.scope} · {dro.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div><p className="text-lg font-extrabold">{tros.length}</p><p className="text-[10px] uppercase text-muted-foreground">TROs</p></div>
                    <div><p className="text-lg font-extrabold">{ds.retailers}</p><p className="text-[10px] uppercase text-muted-foreground">Retailers</p></div>
                    <div><p className="text-lg font-extrabold">{ds.services}</p><p className="text-[10px] uppercase text-muted-foreground">Services</p></div>
                    <div><p className="text-lg font-extrabold text-emerald-600">{inr(ds.commission)}</p><p className="text-[10px] uppercase text-muted-foreground">Commission</p></div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tros.map((tro) => {
                    const ts = officerSummary(tro.id);
                    const rets = RETAILERS.filter((r) => r.troId === tro.id);
                    return (
                      <div key={tro.id} className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-extrabold">{tro.name[0]}</div>
                            <div>
                              <p className="text-sm font-bold flex items-center gap-1.5">{tro.name}
                                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded uppercase">TRO</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPinned className="h-2.5 w-2.5" />{tro.scope}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-sky-700">{inr(ts.commission)}</span>
                        </div>
                        <ul className="space-y-1">
                          {rets.map((r) => (
                            <li key={r.id} className="flex items-center gap-2 text-[11px] rounded-md bg-white px-2 py-1 border border-border">
                              <span className={`h-1.5 w-1.5 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold truncate flex-1">{r.name}</span>
                              <span className="text-muted-foreground">{serviceTotal(r)} svc</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Retailers ---------------- */
export function DistributorRetailers() {
  const [query, setQuery] = useState("");
  const [dro, setDro] = useState("all");
  const [onlyActive, setOnlyActive] = useState(false);
  const navigate = useNavigate();
  const dros = OFFICERS.filter((o) => o.role === "DRO");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RETAILERS.filter((r) => {
      if (dro !== "all" && r.droId !== dro) return false;
      if (onlyActive && !r.active) return false;
      if (!q) return true;
      return [r.name, r.shop, r.phone, r.id, r.taluk].some((v) => v.toLowerCase().includes(q));
    });
  }, [query, dro, onlyActive]);

  const oname = (id: string) => OFFICERS.find((o) => o.id === id)?.name ?? "—";

  return (
    <DistributorShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          title="Retailers"
          subtitle="Every retailer mapped under your DRO/TRO officers with daily activity."
          actions={
            <button
              onClick={() => { exportRetailersCsv(filtered, "distributor-retailers.csv"); toast.success("CSV exported"); }}
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
          <select value={dro} onChange={(e) => setDro(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-medium">
            <option value="all">All DROs</option>
            {dros.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
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
                  <th className="text-left px-3 py-2.5 font-bold">DRO / TRO</th>
                  {SERVICE_META.map((s) => <th key={s.key} className="text-right px-2 py-2.5 font-bold">{s.key}</th>)}
                  <th className="text-right px-3 py-2.5 font-bold">Total</th>
                  <th className="text-right px-3 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/distributor/retailers/$id", params: { id: r.id } })}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <div className="leading-tight">
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.shop} · {r.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] leading-tight">
                      <p className="font-semibold">{oname(r.droId)}</p>
                      <p className="text-muted-foreground">{oname(r.troId)} · {r.taluk}</p>
                    </td>
                    {SERVICE_META.map((s) => <td key={s.key} className="px-2 py-2.5 text-right tabular-nums">{r.today[s.key] || "—"}</td>)}
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{serviceTotal(r)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{inr(retailerCommission(r))}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">No retailers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Services Live ---------------- */
export function DistributorServices() {
  const navigate = useNavigate();
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const total = mix.reduce((sum, m) => sum + m.count, 0);
  const activeRetailers = RETAILERS.filter((r) => r.active).length;
  const liveServices = mix.filter((m) => m.count > 0).length;

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Layers className="h-5 w-5" />}
          title="Services Live"
          subtitle="Daily / weekly / monthly service activity across the network."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {liveServices} live now
            </span>
          }
        />

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold">Live Service List</h3>
            <span className="text-[11px] font-semibold text-muted-foreground">{activeRetailers} active retailers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Service</th>
                  <th className="text-left px-3 py-2.5 font-bold">Status</th>
                  <th className="text-right px-3 py-2.5 font-bold">Today</th>
                  <th className="text-right px-3 py-2.5 font-bold">Share</th>
                  <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {mix.map((m) => {
                  const live = m.count > 0;
                  return (
                    <tr key={m.key} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/distributor/services/$key", params: { key: m.key } })}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                          <div className="leading-tight">
                            <p className="font-semibold">{m.label}</p>
                            <p className="text-[11px] text-muted-foreground">{m.key}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${live ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          {live ? "Live" : "Idle"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{m.count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{total ? Math.round((m.count / total) * 100) : 0}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{inr(m.rate)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{inr(m.commission)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {mix.map((m) => (
            <div key={m.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ background: m.color }} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{m.key}</p>
              <p className="font-display text-2xl font-extrabold mt-1">{m.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{total ? Math.round((m.count / total) * 100) : 0}% · {inr(m.commission)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Service Counts (Today)</h3>
            <div className="h-72">
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
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Weekly Services & Revenue</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="services" fill={HEX} radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="r" dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3">Monthly Service Volume</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={MONTHLY}>
                <defs>
                  <linearGradient id="msvc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={HEX} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={HEX} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="services" stroke={HEX} fill="url(#msvc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}

/* ---------------- Commissions ---------------- */
export function DistributorCommissions() {
  const mix = useMemo(() => aggregateServices(RETAILERS), []);
  const totalComm = mix.reduce((sum, m) => sum + m.commission, 0);
  const ranked = useMemo(
    () => [...RETAILERS].map((r) => ({ r, comm: retailerCommission(r) })).sort((a, b) => b.comm - a.comm),
    [],
  );
  const oname = (id: string) => OFFICERS.find((o) => o.id === id)?.name ?? "—";
  const monthComm = MONTHLY.reduce((s, m) => s + m.commission, 0);

  return (
    <DistributorShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Coins className="h-5 w-5" />}
          title="Commissions"
          subtitle="Commission earned across services and retailers in your network."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Commission Today" value={inr(totalComm)} delta={{ value: "all services", positive: true }} icon={<Coins className="h-5 w-5" />} tone="green" />
          <StatCard label="This Month" value={inr(MONTHLY[MONTHLY.length - 1].commission)} delta={{ value: "+6.1% MoM", positive: true }} icon={<TrendingUp className="h-5 w-5" />} tone="sky" />
          <StatCard label="6-Month Total" value={inr(monthComm)} icon={<IndianRupee className="h-5 w-5" />} tone="violet" />
          <StatCard label="Top Service" value={[...mix].sort((a, b) => b.commission - a.commission)[0].key} delta={{ value: "by commission", positive: true }} icon={<Layers className="h-5 w-5" />} tone="saffron" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Commission by Service</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={mix}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="commission" radius={[6, 6, 0, 0]}>
                    {mix.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Monthly Commission</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={MONTHLY}>
                  <defs>
                    <linearGradient id="mcomm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Area type="monotone" dataKey="commission" stroke="#10b981" fill="url(#mcomm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Commission by Retailer</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Retailer</th>
                  <th className="text-left px-3 py-2.5 font-bold">TRO</th>
                  <th className="text-right px-3 py-2.5 font-bold">Services</th>
                  <th className="text-right px-4 py-2.5 font-bold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ r, comm }) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.shop}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{oname(r.troId)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{serviceTotal(r)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(comm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DistributorShell>
  );
}
