import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { MOCK_TXNS, inr, type Txn } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — BharatOne" }] }),
  component: WalletPage,
});

const cols: Column<Txn>[] = [
  { key: "date", header: "Date", cell: (r) => <span className="text-xs">{r.date}</span> },
  { key: "service", header: "Description", cell: (r) => r.service },
  { key: "amount", header: "Debit/Credit", cell: (r) => <span className={r.amount > 0 ? "font-semibold text-rose-700" : "font-semibold text-emerald-700"}>{r.amount > 0 ? `- ${inr(r.amount)}` : `+ ${inr(r.commission)}`}</span>, className: "text-right" },
  { key: "balance", header: "Balance", cell: () => <span className="font-mono text-sm">{inr(0)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function WalletPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="My Wallet" subtitle="Manage your retailer wallet, load funds and view ledger" />

        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Available Balance</p>
            <p className="font-display text-4xl font-extrabold mt-1">₹0.00</p>
            <p className="text-xs opacity-90">Updated just now</p>
            <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
              <button className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><Plus className="h-3.5 w-3.5" /> Load</button>
              <button className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><ArrowDownToLine className="h-3.5 w-3.5" /> Settle</button>
              <button className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><ArrowUpFromLine className="h-3.5 w-3.5" /> Transfer</button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <StatCard label="Settled Today" value={inr(0)} icon={<ArrowDownToLine className="h-5 w-5" />} tone="green" />
            <StatCard label="Pending Settlement" value={inr(264.07)} icon={<Wallet className="h-5 w-5" />} tone="violet" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <SectionCard title="Load Wallet" description="Add funds via UPI / Net Banking / Card">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <Field label="Amount (₹)" hint="Min ₹500"><Input type="number" placeholder="0" /></Field>
              <Field label="Method">
                <Select><option>UPI</option><option>Net Banking</option><option>Debit Card</option></Select>
              </Field>
              <PrimaryButton type="submit" className="w-full">Continue to Pay</PrimaryButton>
            </form>
          </SectionCard>
          <div className="lg:col-span-2">
            <SectionCard title="Recent Ledger" description="Latest credits and debits">
              <DataTable columns={cols} rows={MOCK_TXNS.slice(0, 6)} />
            </SectionCard>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}