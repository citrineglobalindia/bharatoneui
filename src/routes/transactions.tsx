import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Download, Search, Filter } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { GhostButton, Input, Select } from "@/components/retailer/section-card";
import { MOCK_TXNS, inr, type Txn } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — BharatOne" }] }),
  component: TxnPage,
});

const cols: Column<Txn>[] = [
  { key: "date", header: "Date", cell: (r) => <span className="text-xs whitespace-nowrap">{r.date}</span> },
  { key: "id", header: "Txn ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "service", header: "Service", cell: (r) => <span className="font-medium">{r.service}</span> },
  { key: "customer", header: "Customer", cell: (r) => <span className="text-muted-foreground">{r.customer}</span> },
  { key: "amount", header: "Amount", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span>, className: "text-right" },
  { key: "commission", header: "Commission", cell: (r) => <span className="text-emerald-700 font-semibold">+{inr(r.commission)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function TxnPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = MOCK_TXNS.filter((t) =>
    (status === "all" || t.status === status) &&
    (q === "" || (t.id + t.service + t.customer).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Transactions"
          subtitle="Complete history across all services with filters and export"
          actions={<GhostButton><Download className="h-3.5 w-3.5" /> Export CSV</GhostButton>}
        />

        <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID, service, customer" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">All status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <Select className="w-40">
            <option>All services</option><option>AEPS</option><option>DMT</option><option>Recharge</option><option>BBPS</option>
          </Select>
          <GhostButton><Filter className="h-3.5 w-3.5" /> More filters</GhostButton>
        </div>

        <DataTable columns={cols} rows={rows} />
      </div>
    </RetailerShell>
  );
}