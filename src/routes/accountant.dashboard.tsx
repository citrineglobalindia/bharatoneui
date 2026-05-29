import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Calculator, Wallet, ArrowDownToLine, FileCheck2, ArrowRight, ArrowUpRight, Banknote, IndianRupee, Clock,
} from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import {
  REGISTRATION_PAYMENTS, WALLET_REQUESTS, WITHDRAWALS, MAIN_ACCOUNT, ACC_WEEKLY, pendingCount, inr,
} from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/dashboard")({
  head: () => ({
    meta: [
      { title: "Accountant Dashboard — BharatOne" },
      { name: "description", content: "Approvals, settlements, wallet and payout management." },
    ],
  }),
  component: AccountantDashboard,
});

function AccountantDashboard() {
  const regP = pendingCount(REGISTRATION_PAYMENTS);
  const walP = pendingCount(WALLET_REQUESTS);
  const wdlP = pendingCount(WITHDRAWALS);

  return (
    <AccountantShell>
      <div className="space-y-6">
        <PageHeader
          icon={<Calculator className="h-5 w-5" />}
          title="Accountant Console"
          subtitle="Verify payments, approve wallet & withdrawal requests, manage commissions."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[11px] font-bold">
              <IndianRupee className="h-3 w-3" /> Finance Ops
            </span>
          }
          actions={
            <Link to="/accountant/registrations" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-4 h-9 text-sm font-semibold shadow-elev hover:bg-emerald-700">
              Open Approvals <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Registration Payments" value={String(regP)} delta={{ value: "awaiting verify", positive: false }} icon={<FileCheck2 className="h-5 w-5" />} tone="violet" />
          <StatCard label="Wallet Requests" value={String(walP)} delta={{ value: "to approve", positive: false }} icon={<Wallet className="h-5 w-5" />} tone="sky" />
          <StatCard label="Withdrawals" value={String(wdlP)} delta={{ value: "to settle", positive: false }} icon={<ArrowDownToLine className="h-5 w-5" />} tone="rose" />
          <StatCard label="Main A/C Balance" value={inr(MAIN_ACCOUNT.balance)} delta={{ value: "+8.2% this week", positive: true }} icon={<Banknote className="h-5 w-5" />} tone="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Cashflow — Credit vs Debit</h3>
                <p className="text-[11px] text-muted-foreground">Wallet recharges vs payouts/withdrawals</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={ACC_WEEKLY}>
                  <defs>
                    <linearGradient id="cAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="credit" stroke="#10b981" fill="url(#cAcc)" strokeWidth={2} />
                  <Area type="monotone" dataKey="debit" stroke="#f43f5e" fill="url(#dAcc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3">Float Balances</h3>
            <div className="space-y-3">
              {[
                { label: "AEPS Float", value: MAIN_ACCOUNT.aepsFloat, pct: 80, color: "bg-emerald-500" },
                { label: "BBPS Float", value: MAIN_ACCOUNT.bbpsFloat, pct: 40, color: "bg-sky-500" },
                { label: "Recharge Float", value: MAIN_ACCOUNT.rechargeFloat, pct: 55, color: "bg-violet-500" },
              ].map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{f.label}</span>
                    <span className="font-bold">{inr(f.value)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <Link to="/accountant/main-recharge" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 h-9 text-xs font-bold hover:bg-emerald-100 w-full justify-center">
              <Banknote className="h-4 w-4" /> Recharge Main Account
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" /> Pending Approvals</h3>
              <p className="text-[11px] text-muted-foreground">Top items awaiting your action</p>
            </div>
            <Link to="/accountant/wallet-requests" className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Request</th>
                  <th className="text-left px-4 py-2.5 font-bold">Type</th>
                  <th className="text-left px-4 py-2.5 font-bold">Name</th>
                  <th className="text-right px-4 py-2.5 font-bold">Amount</th>
                  <th className="text-right px-4 py-2.5 font-bold">Open</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...WALLET_REQUESTS.filter((r) => r.status === "Pending").map((r) => ({ id: r.id, type: "Wallet", name: r.name, amount: r.amount, to: "/accountant/wallet-requests" as const })),
                  ...WITHDRAWALS.filter((r) => r.status === "Pending").map((r) => ({ id: r.id, type: "Withdrawal", name: r.name, amount: r.amount, to: "/accountant/withdrawals" as const })),
                ].slice(0, 6).map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-2.5 text-xs">{r.type}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{inr(r.amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={r.to} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                        Review <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AccountantShell>
  );
}
