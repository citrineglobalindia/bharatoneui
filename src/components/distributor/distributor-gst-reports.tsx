import { useState } from "react";
import {
  CalendarDays, Filter, FileText, ReceiptIndianRupee, Coins, Landmark, Percent, FileStack,
  Download, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { demoGst, demoGstInvoices, demoApps, distributorDemoOn } from "@/components/distributor/distributor-demo";

function EmptyReport({ title, subtitle, note }: { title: string; subtitle: string; note: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">{note}</div>
    </div>
  );
}

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#94a3b8"];

function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["﻿" + head.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function Kpi({ icon: Icon, label, value, delta, iconBg, iconColor }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-extrabold leading-tight">{value}</p>
          {delta != null && <p className="mt-1 text-[11px] font-semibold text-emerald-600">▲ {delta}%</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconBg}`}><Icon className={`h-5 w-5 ${iconColor}`} /></span>
      </div>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="min-w-[140px] flex-1">
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <select className="w-full appearance-none rounded-lg border border-border bg-card px-3 h-9 pr-8 text-sm font-medium outline-none">
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
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

export function DistributorGstReports() {
  const [tab, setTab] = useState<"gst" | "txn">("gst");
  if (!distributorDemoOn()) return <EmptyReport title="GST & Transaction Reports" subtitle="View and download GST summary and transaction details" note="No report data yet. GST and transaction reports will appear here once your retailers start transacting." />;

  const g = demoGst;
  const taxTypeData = [
    { name: "CGST", value: g.cgst },
    { name: "SGST", value: g.sgst },
    { name: "IGST", value: g.igst },
  ];
  const totalGst = g.total || 1;

  const summaryRows = [
    { type: "CGST", taxable: Math.round(g.taxable / 2), cgst: g.cgst, sgst: 0, igst: 0, total: g.cgst },
    { type: "SGST", taxable: Math.round(g.taxable / 2), cgst: 0, sgst: g.sgst, igst: 0, total: g.sgst },
    { type: "IGST", taxable: g.taxable, cgst: 0, sgst: 0, igst: g.igst, total: g.igst },
  ];

  const downloadSummary = () => {
    const head = ["GST Type", "Taxable Value", "CGST", "SGST", "IGST", "Total GST", "% of Total GST"];
    const rows = summaryRows.map((r) => [
      r.type, r.taxable, r.cgst || "—", r.sgst || "—", r.igst || "—", r.total,
      ((r.total / totalGst) * 100).toFixed(1) + "%",
    ]);
    rows.push(["Total", g.taxable, g.cgst, g.sgst, g.igst, g.total, "100.0%"]);
    downloadCsv(`gst-summary-${new Date().toISOString().slice(0, 10)}.csv`, head, rows);
  };

  const downloadInvoices = () => {
    const head = ["Invoice No", "Date", "Customer", "Taxable Value", "Total GST", "Invoice Type"];
    const rows = demoGstInvoices.map((i) => [i.invoice_no, i.date, i.customer, i.taxable, i.gst, i.type]);
    downloadCsv(`gst-invoices-${new Date().toISOString().slice(0, 10)}.csv`, head, rows);
  };

  const txns = demoApps.slice(0, 25);
  const downloadTxns = () => {
    const head = ["Txn/App ID", "Date", "Retailer", "Service", "Amount", "Commission", "Status"];
    const rows = txns.map((a) => [
      a.application_no,
      new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      a.retailer_name, a.service_name, a.service_charge, a.distributor_commission_amount, a.status,
    ]);
    downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, head, rows);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><FileText className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">GST &amp; Transaction Reports</h1>
            <p className="text-sm text-muted-foreground">View and download GST summary and transaction details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-10 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" /> This month</span>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-10 text-sm font-semibold hover:bg-muted"><Filter className="h-4 w-4" /> Filter</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
        <TabBtn active={tab === "gst"} onClick={() => setTab("gst")}>GST Reports</TabBtn>
        <TabBtn active={tab === "txn"} onClick={() => setTab("txn")}>Transaction Reports</TabBtn>
      </div>

      {tab === "gst" ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={FileText} label="Total Taxable Value" value={inr(g.taxable)} delta="8.2" iconBg="bg-blue-100" iconColor="text-blue-600" />
            <Kpi icon={ReceiptIndianRupee} label="Total CGST" value={inr(g.cgst)} delta="6.1" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <Kpi icon={ReceiptIndianRupee} label="Total SGST" value={inr(g.sgst)} delta="6.1" iconBg="bg-violet-100" iconColor="text-violet-600" />
            <Kpi icon={Landmark} label="Total IGST" value={inr(g.igst)} delta="4.7" iconBg="bg-orange-100" iconColor="text-orange-600" />
            <Kpi icon={Coins} label="Total GST Amount" value={inr(g.total)} delta="7.3" iconBg="bg-teal-100" iconColor="text-teal-600" />
            <Kpi icon={FileStack} label="Total Invoices" value={g.invoices.toLocaleString("en-IN")} delta="9.4" iconBg="bg-fuchsia-100" iconColor="text-fuchsia-600" />
          </div>

          {/* Filter bar */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect label="Date Range" options={["This month", "Last month", "This quarter", "This year"]} />
              <FilterSelect label="Service" options={["All Services", "AEPS", "DMT", "Recharges", "Bill Payments"]} />
              <FilterSelect label="GST Type" options={["All", "CGST", "SGST", "IGST"]} />
              <FilterSelect label="Invoice Type" options={["All", "B2B", "B2C"]} />
              <FilterSelect label="Payment Mode" options={["All", "Bank Transfer", "UPI", "Wallet"]} />
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted">Reset</button>
                <button className="rounded-lg bg-blue-600 px-3 h-9 text-sm font-semibold text-white hover:bg-blue-700">Apply Filters</button>
              </div>
            </div>
          </div>

          {/* 3 cards row */}
          <div className="grid gap-3 lg:grid-cols-3">
            {/* Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-1 text-sm font-bold">GST Summary by Tax Type</p>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taxTypeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={2}>
                      {taxTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Total GST</p><p className="text-sm font-extrabold">{inr(g.total)}</p></div>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {taxTypeData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                    <span className="font-semibold">{inr(d.value)}</span>
                    <span className="w-10 text-right font-semibold text-muted-foreground">{((d.value / totalGst) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend line */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-1 text-sm font-bold">GST Trend (This Week)</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={g.trend} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-[10px]" />
                    <YAxis tickLine={false} axisLine={false} className="text-[10px]" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="cgst" name="CGST" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="sgst" name="SGST" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="igst" name="IGST" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By service list */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">GST Summary by Service</p>
              <div className="space-y-2">
                {g.byService.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 border-t border-border/70 pt-2 first:border-0 first:pt-0">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: COLORS[i % COLORS.length] + "22" }}>
                      <Percent className="h-3.5 w-3.5" style={{ color: COLORS[i % COLORS.length] }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">Taxable {inr(s.taxable)}</p>
                    </div>
                    <p className="text-sm font-bold">{inr(s.gst)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GST Summary table */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">GST Summary</p>
              <button onClick={downloadSummary} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Download GST Summary</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">GST Type</th>
                    <th className="py-2 pr-2 text-right">Taxable Value</th>
                    <th className="py-2 pr-2 text-right">CGST</th>
                    <th className="py-2 pr-2 text-right">SGST</th>
                    <th className="py-2 pr-2 text-right">IGST</th>
                    <th className="py-2 pr-2 text-right">Total GST</th>
                    <th className="py-2 text-right">% of Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((r) => (
                    <tr key={r.type} className="border-t border-border/70">
                      <td className="py-2 pr-2 font-semibold">{r.type}</td>
                      <td className="py-2 pr-2 text-right">{inr(r.taxable)}</td>
                      <td className="py-2 pr-2 text-right">{r.cgst ? inr(r.cgst) : "—"}</td>
                      <td className="py-2 pr-2 text-right">{r.sgst ? inr(r.sgst) : "—"}</td>
                      <td className="py-2 pr-2 text-right">{r.igst ? inr(r.igst) : "—"}</td>
                      <td className="py-2 pr-2 text-right font-semibold">{inr(r.total)}</td>
                      <td className="py-2 text-right">{((r.total / totalGst) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2 pr-2">Total</td>
                    <td className="py-2 pr-2 text-right">{inr(g.taxable)}</td>
                    <td className="py-2 pr-2 text-right">{inr(g.cgst)}</td>
                    <td className="py-2 pr-2 text-right">{inr(g.sgst)}</td>
                    <td className="py-2 pr-2 text-right">{inr(g.igst)}</td>
                    <td className="py-2 pr-2 text-right">{inr(g.total)}</td>
                    <td className="py-2 text-right">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top GST Invoices */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Top GST Invoices</p>
              <button onClick={downloadInvoices} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Download Invoices Report</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">Invoice No</th>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Customer / Retailer</th>
                    <th className="py-2 pr-2 text-right">Taxable Value</th>
                    <th className="py-2 pr-2 text-right">Total GST</th>
                    <th className="py-2 text-right">Invoice Type</th>
                  </tr>
                </thead>
                <tbody>
                  {demoGstInvoices.map((i) => (
                    <tr key={i.invoice_no} className="border-t border-border/70">
                      <td className="py-2 pr-2 font-mono text-xs">{i.invoice_no}</td>
                      <td className="py-2 pr-2">{i.date}</td>
                      <td className="py-2 pr-2 font-semibold">{i.customer}</td>
                      <td className="py-2 pr-2 text-right">{inr(i.taxable)}</td>
                      <td className="py-2 pr-2 text-right font-semibold">{inr(i.gst)}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${i.type === "B2B" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{i.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer note */}
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
            All amounts are in INR. GST is calculated as per applicable tax rates.
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Transaction Reports</p>
            <button onClick={downloadTxns} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2">Txn / App ID</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Retailer</th>
                  <th className="py-2 pr-2">Service</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2 pr-2 text-right">Commission</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((a) => (
                  <tr key={a.application_no} className="border-t border-border/70">
                    <td className="py-2 pr-2 font-mono text-xs">{a.application_no}</td>
                    <td className="py-2 pr-2">{new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="py-2 pr-2 font-semibold">{a.retailer_name}</td>
                    <td className="py-2 pr-2">{a.service_name}</td>
                    <td className="py-2 pr-2 text-right">{inr(a.service_charge)}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{inr(a.distributor_commission_amount)}</td>
                    <td className="py-2 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${["completed", "approved"].includes(a.status) ? "bg-emerald-100 text-emerald-700" : a.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{a.status.replace("_", " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
