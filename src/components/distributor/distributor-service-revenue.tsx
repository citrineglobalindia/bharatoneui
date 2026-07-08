import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Filter, CalendarDays, IndianRupee, Receipt, ShoppingBag, Layers, TrendingUp, Download, Info } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#94a3b8"];

function Kpi({ icon: Icon, label, value, delta, sub, iconBg, iconColor }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconBg}`}><Icon className={`h-5 w-5 ${iconColor}`} /></span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-extrabold leading-tight">{value}</p>
          {delta && <p className="text-[10px] font-bold text-emerald-600">{delta}</p>}
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function DistributorServiceRevenue() {
  const [sales, setSales] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"amount" | "pct">("amount");

  async function load() {
    setLoading(true);
    try { await ensureStaffSession(); const { data } = await supabase.rpc("distributor_sales"); setSales((data as any) ?? {}); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const model = useMemo(() => {
    const cats = ((sales?.by_category as any[]) ?? []).map((x) => ({ name: x.name || "Other", amount: Number(x.amount || 0), cnt: Number(x.cnt || 0) }));
    const daily = ((sales?.daily as any[]) ?? []).map((x) => ({ d: x.d, amount: Number(x.amount || 0) }));
    const sorted = [...cats].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restAmt = rest.reduce((a, s) => a + s.amount, 0);
    const restCnt = rest.reduce((a, s) => a + s.cnt, 0);
    const display = restAmt > 0 ? [...top, { name: "Others", amount: restAmt, cnt: restCnt }] : top;
    const total = display.reduce((a, s) => a + s.amount, 0) || 0;
    const totalTxns = display.reduce((a, s) => a + s.cnt, 0) || 0;
    const last7 = daily.slice(-7).reduce((a, x) => a + x.amount, 0);
    const prev7 = daily.slice(-14, -7).reduce((a, x) => a + x.amount, 0);
    const share = (amt: number) => (total > 0 ? amt / total : 0);

    const rows = display.map((s) => {
      const tw = Math.round(share(s.amount) * last7);
      const lw = Math.round(share(s.amount) * prev7);
      const growth = lw > 0 ? ((tw - lw) / lw) * 100 : tw > 0 ? 100 : 0;
      return { ...s, pct: total > 0 ? (s.amount / total) * 100 : 0, aov: s.cnt > 0 ? s.amount / s.cnt : 0, tw, lw, growth };
    });

    const trend = daily.map((day) => {
      const row: any = { day: day.d };
      display.forEach((s) => { row[s.name] = Math.round(share(s.amount) * day.amount); });
      return row;
    });

    const compare = rows.map((r) => ({ name: r.name, thisWeek: r.tw, lastWeek: r.lw, thisPct: last7 > 0 ? +(r.tw / last7 * 100).toFixed(1) : 0, lastPct: prev7 > 0 ? +(r.lw / prev7 * 100).toFixed(1) : 0 }));

    return { display, total, totalTxns, aov: totalTxns > 0 ? total / totalTxns : 0, servicesUsed: cats.filter((c) => c.cnt > 0).length || display.length, highest: rows[0] ?? null, rows, trend, compare, twGrowth: prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0 };
  }, [sales]);

  const g = (n: number) => (n >= 0 ? `▲ ${n.toFixed(1)}%` : `▼ ${Math.abs(n).toFixed(1)}%`);
  const gCls = (n: number) => (n >= 0 ? "text-emerald-600" : "text-rose-600");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Service-wise Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed revenue insights across all services</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-10 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" /> This month</span>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-10 text-sm font-semibold text-muted-foreground"><Filter className="h-4 w-4" /> Filter</button>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi icon={IndianRupee} label="Total Revenue" value={inr(model.total)} delta={g(model.twGrowth)} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <Kpi icon={Receipt} label="Total Transactions" value={model.totalTxns.toLocaleString("en-IN")} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <Kpi icon={ShoppingBag} label="Average Order Value" value={inr(Math.round(model.aov))} iconBg="bg-violet-100" iconColor="text-violet-600" />
            <Kpi icon={Layers} label="Total Services Used" value={String(model.servicesUsed)} iconBg="bg-orange-100" iconColor="text-orange-600" />
            <Kpi icon={TrendingUp} label="Highest Revenue Service" value={model.highest?.name ?? "—"} sub={model.highest ? `${inr(model.highest.amount)} (${model.highest.pct.toFixed(1)}%)` : ""} iconBg="bg-cyan-100" iconColor="text-cyan-600" />
          </div>

          {/* Trend + Share */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
              <p className="mb-1 text-sm font-bold">Revenue Trend by Service</p>
              <div className="h-64">
                {model.trend.length === 0 ? <div className="grid h-full place-items-center text-xs text-muted-foreground">No trend data.</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.trend} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      {model.display.map((s, i) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />)}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-1 text-sm font-bold">Revenue Share by Service</p>
              <div className="relative h-44">
                {model.display.length === 0 ? <div className="grid h-full place-items-center text-xs text-muted-foreground">No data</div> : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={model.display} dataKey="amount" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2}>
                          {model.display.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => inr(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="text-[10px] text-muted-foreground">Total Revenue</p><p className="text-sm font-extrabold">{inr(model.total)}</p></div></div>
                  </>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {model.rows.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-[11px]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="flex-1 truncate text-muted-foreground">{s.name}</span><span className="font-semibold">{inr(s.amount)}</span><span className="w-10 text-right text-muted-foreground">{s.pct.toFixed(1)}%</span></div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary table + comparison */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Service-wise Revenue Summary</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="py-2 pr-2">#</th><th className="py-2 pr-2">Service</th><th className="py-2 pr-2 text-right">Transactions</th><th className="py-2 pr-2 text-right">Revenue</th><th className="py-2 pr-2 text-right">Revenue %</th><th className="py-2 pr-2 text-right">Avg Order</th><th className="py-2 text-right">Growth %</th></tr>
                  </thead>
                  <tbody>
                    {model.rows.map((s, i) => (
                      <tr key={s.name} className="border-t border-border/70">
                        <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2"><span className="inline-flex items-center gap-1.5 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{s.name}</span></td>
                        <td className="py-2 pr-2 text-right">{s.cnt.toLocaleString("en-IN")}</td>
                        <td className="py-2 pr-2 text-right font-semibold">{inr(s.amount)}</td>
                        <td className="py-2 pr-2 text-right">{s.pct.toFixed(1)}%</td>
                        <td className="py-2 pr-2 text-right">{inr(Math.round(s.aov))}</td>
                        <td className={`py-2 text-right font-semibold ${gCls(s.growth)}`}>{g(s.growth)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-2 pr-2" /><td className="py-2 pr-2">Total</td>
                      <td className="py-2 pr-2 text-right">{model.totalTxns.toLocaleString("en-IN")}</td>
                      <td className="py-2 pr-2 text-right">{inr(model.total)}</td>
                      <td className="py-2 pr-2 text-right">100%</td>
                      <td className="py-2 pr-2 text-right">{inr(Math.round(model.aov))}</td>
                      <td className={`py-2 text-right ${gCls(model.twGrowth)}`}>{g(model.twGrowth)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button onClick={() => downloadReport(model)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Download Report</button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Revenue Comparison (This Week vs Last Week)</p>
                <div className="flex rounded-lg border border-border p-0.5 text-xs font-semibold">
                  <button onClick={() => setMode("amount")} className={`rounded-md px-2.5 py-1 ${mode === "amount" ? "bg-blue-600 text-white" : "text-muted-foreground"}`}>Amount</button>
                  <button onClick={() => setMode("pct")} className={`rounded-md px-2.5 py-1 ${mode === "pct" ? "bg-blue-600 text-white" : "text-muted-foreground"}`}>Percentage</button>
                </div>
              </div>
              <div className="h-64">
                {model.compare.length === 0 ? <div className="grid h-full place-items-center text-xs text-muted-foreground">No data</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={model.compare} margin={{ top: 10, right: 6, left: -6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-[10px]" interval={0} angle={-12} textAnchor="end" height={48} />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => mode === "amount" ? `₹${(v / 1000).toFixed(0)}k` : `${v}%`} />
                      <Tooltip formatter={(v: number) => mode === "amount" ? inr(v) : `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar name="This Week" dataKey={mode === "amount" ? "thisWeek" : "thisPct"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Last Week" dataKey={mode === "amount" ? "lastWeek" : "lastPct"} fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-blue-50/50 px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-blue-500" /> All values are calculated after distributor margin and show net revenue. Trend & week comparison are apportioned from category totals.
          </div>
        </>
      )}
    </div>
  );
}

function downloadReport(model: any) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["#", "Service", "Transactions", "Revenue", "Revenue %", "Avg Order Value", "Growth %"];
  const lines = model.rows.map((s: any, i: number) => [i + 1, s.name, s.cnt, s.amount, s.pct.toFixed(1) + "%", Math.round(s.aov), s.growth.toFixed(1) + "%"].map(esc).join(","));
  const csv = ["﻿" + header.map(esc).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `service-revenue-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
