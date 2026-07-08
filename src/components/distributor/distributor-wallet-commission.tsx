import { useState } from "react";
import {
  CalendarDays, Filter, Wallet, ArrowDownCircle, ArrowUpCircle, PiggyBank, Clock, Hourglass,
  Percent,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  demoWalletTotals, demoWalletTrend, demoWalletTxns, demoCommissionTotals,
  demoCommissionByService, demoTopRetailersByCommission, demoPayouts, demoCommissionStructure,
} from "@/components/distributor/distributor-demo";

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#94a3b8"];
const medal = ["🥇", "🥈", "🥉"];

function Kpi({ icon: Icon, label, value, sub, iconBg, iconColor }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-extrabold leading-tight">{value}</p>
          {sub && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{sub}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconBg}`}><Icon className={`h-5 w-5 ${iconColor}`} /></span>
      </div>
    </div>
  );
}

function SmallCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 h-9 text-sm font-semibold transition-colors ${active ? "bg-blue-600 text-white shadow-soft" : "text-muted-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function CommissionDonut({ showAmount }: { showAmount?: boolean }) {
  const total = demoCommissionByService.reduce((s, x) => s + x.earned, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={demoCommissionByService} dataKey="earned" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={2}>
              {demoCommissionByService.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => inr(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-sm font-extrabold">{inr(total)}</p></div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {demoCommissionByService.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
            {showAmount && <span className="font-semibold">{inr(s.earned)}</span>}
            <span className="w-10 text-right font-semibold text-muted-foreground">{((s.earned / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayoutsTable({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-3 text-sm font-bold">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-2">Payout ID</th>
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2 text-right">Amount</th>
              <th className="py-2 pr-2">Mode</th>
              <th className="py-2 pr-2">UTR / Reference</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {demoPayouts.map((p) => (
              <tr key={p.payout_id} className="border-t border-border/70">
                <td className="py-2 pr-2 font-mono text-xs">{p.payout_id}</td>
                <td className="py-2 pr-2">{p.date}</td>
                <td className="py-2 pr-2 text-right font-semibold">{inr(p.amount)}</td>
                <td className="py-2 pr-2">{p.mode}</td>
                <td className="py-2 pr-2 font-mono text-xs">{p.utr}</td>
                <td className="py-2 text-right"><span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DistributorWalletCommission() {
  const [tab, setTab] = useState<"wallet" | "commission">("wallet");
  const w = demoWalletTotals;

  const commTotalRow = demoCommissionByService.reduce(
    (a, s) => ({ earned: a.earned + s.earned, paid: a.paid + s.paid, pending: a.pending + s.pending }),
    { earned: 0, paid: 0, pending: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Wallet className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Wallet &amp; Commission Reports</h1>
            <p className="text-sm text-muted-foreground">Track wallet balance, transactions and commission earnings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-10 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" /> This month</span>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-10 text-sm font-semibold hover:bg-muted"><Filter className="h-4 w-4" /> Filter</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
        <TabBtn active={tab === "wallet"} onClick={() => setTab("wallet")}>Wallet Overview</TabBtn>
        <TabBtn active={tab === "commission"} onClick={() => setTab("commission")}>Commission Overview</TabBtn>
      </div>

      {tab === "wallet" ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={Wallet} label="Current Wallet Balance" value={inr(w.balance)} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <Kpi icon={ArrowDownCircle} label="Total Added" value={inr(w.added)} sub={`${w.addedCount} Transactions`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <Kpi icon={ArrowUpCircle} label="Total Used" value={inr(w.used)} sub={`${w.usedCount} Transactions`} iconBg="bg-rose-100" iconColor="text-rose-600" />
            <Kpi icon={PiggyBank} label="Closing Balance" value={inr(w.closing)} iconBg="bg-violet-100" iconColor="text-violet-600" />
            <Kpi icon={Clock} label="Hold / In-Transit" value={inr(w.hold)} sub={`${w.holdCount} Transactions`} iconBg="bg-orange-100" iconColor="text-orange-600" />
            <Kpi icon={Hourglass} label="Pending Settlement" value={inr(w.pending)} sub={`${w.pendingCount} Transactions`} iconBg="bg-teal-100" iconColor="text-teal-600" />
          </div>

          {/* Trend + txns */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
              <p className="mb-1 text-sm font-bold">Wallet Balance Trend</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={demoWalletTrend} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wbal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-[10px]" interval={2} />
                    <YAxis tickLine={false} axisLine={false} className="text-[10px]" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" name="Balance" stroke="#3b82f6" strokeWidth={2} fill="url(#wbal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Wallet Transactions</p>
              <div className="space-y-2">
                {demoWalletTxns.map((t) => (
                  <div key={t.txn_id} className="flex items-center gap-2 border-t border-border/70 pt-2 first:border-0 first:pt-0">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.amount >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
                      {t.amount >= 0 ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> : <ArrowUpCircle className="h-4 w-4 text-rose-600" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.description}</p>
                      <p className="text-[11px] text-muted-foreground">{t.date} · {t.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{t.amount >= 0 ? "+" : "−"}{inr(Math.abs(t.amount))}</p>
                      <p className="text-[11px] text-muted-foreground">Bal {inr(t.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commission strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SmallCard label="Total Commission" value={inr(demoCommissionTotals.earned)} color="text-blue-600" />
            <SmallCard label="Paid" value={inr(demoCommissionTotals.paid)} color="text-emerald-600" />
            <SmallCard label="Pending" value={inr(demoCommissionTotals.pending)} color="text-orange-600" />
            <SmallCard label="Returned" value={inr(demoCommissionTotals.returned)} color="text-rose-600" />
          </div>

          {/* Commission by service + top retailers */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Commission by Service</p>
              <CommissionDonut />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Top Retailers by Commission</p>
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-2">Rank</th>
                    <th className="py-1.5 pr-2">Retailer</th>
                    <th className="py-1.5 pr-2 text-right">Service Count</th>
                    <th className="py-1.5 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {demoTopRetailersByCommission.map((r, i) => (
                    <tr key={r.name} className="border-t border-border/70">
                      <td className="py-2 pr-2">{i < 3 ? <span className="text-base">{medal[i]}</span> : <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">{i + 1}</span>}</td>
                      <td className="py-2 pr-2 font-semibold">{r.name}</td>
                      <td className="py-2 pr-2 text-right">{r.count.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right font-semibold">{inr(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payouts */}
          <PayoutsTable title="Commission Payouts" />
        </>
      ) : (
        <>
          {/* Commission overview donut + summary */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Commission Overview</p>
              <CommissionDonut showAmount />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Commission Summary</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Service</th>
                      <th className="py-2 pr-2 text-right">Earned</th>
                      <th className="py-2 pr-2 text-right">Paid</th>
                      <th className="py-2 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoCommissionByService.map((s) => (
                      <tr key={s.name} className="border-t border-border/70">
                        <td className="py-2 pr-2 font-semibold">{s.name}</td>
                        <td className="py-2 pr-2 text-right">{inr(s.earned)}</td>
                        <td className="py-2 pr-2 text-right text-emerald-600">{inr(s.paid)}</td>
                        <td className="py-2 text-right text-orange-600">{inr(s.pending)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-2 pr-2">Total</td>
                      <td className="py-2 pr-2 text-right">{inr(commTotalRow.earned)}</td>
                      <td className="py-2 pr-2 text-right">{inr(commTotalRow.paid)}</td>
                      <td className="py-2 text-right">{inr(commTotalRow.pending)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent payouts */}
          <PayoutsTable title="Recent Commission Payouts" />

          {/* Commission structure cards */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 text-sm font-bold">Commission Structure</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {demoCommissionStructure.map((c, i) => (
                <div key={c.name} className="rounded-xl border border-border bg-muted/30 p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: COLORS[i % COLORS.length] + "22" }}>
                    <Percent className="h-4 w-4" style={{ color: COLORS[i % COLORS.length] }} />
                  </span>
                  <p className="mt-2 truncate text-sm font-semibold">{c.name}</p>
                  <p className="text-[11px] font-bold text-emerald-600">{c.rate}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
