import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShieldCheck, Search } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { QueueTable } from "@/components/qc/queue-table";
import { QC_APPLICANTS } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/approved")({
  head: () => ({ meta: [{ title: "Approved KYC — QC Portal" }] }),
  component: ApprovedPage,
});

function ApprovedPage() {
  const [query, setQuery] = useState("");
  const data = useMemo(() => {
    return QC_APPLICANTS.filter((a) => a.status === "Approved").filter((a) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.phone.includes(q);
    });
  }, [query]);

  const totalApproved = QC_APPLICANTS.filter((a) => a.status === "Approved").length;

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Approved Applications"
          subtitle="Successfully verified KYC applications."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI label="Total Approved" value={String(totalApproved)} accent="text-emerald-700" />
          <KPI label="This Week" value="48" accent="text-indigo-700" />
          <KPI label="Avg. Approval Time" value="2.4 hrs" accent="text-slate-700" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-9">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search approved applications…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <QueueTable data={data} emptyLabel="No approved applications." />
      </div>
    </QcShell>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}