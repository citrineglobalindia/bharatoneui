import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardCheck, Search, Filter, ArrowRight, Download, AlertTriangle } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { QC_APPLICANTS, type KycStatus } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/kyc-queue")({
  head: () => ({
    meta: [
      { title: "KYC Review Queue — QC Portal" },
      { name: "description", content: "Review pending KYC applications." },
    ],
  }),
  component: KycQueuePage,
});

const FILTERS: { label: string; value: "All" | KycStatus }[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending Review" },
  { label: "In Review", value: "In Review" },
  { label: "On Hold", value: "On Hold" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

function KycQueuePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("All");
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    return QC_APPLICANTS.filter((a) => filter === "All" || a.status === filter).filter((a) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.pan.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="KYC Review Queue"
          subtitle="All applicant submissions awaiting Quality Control review."
          actions={
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          }
        />

        <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-9 flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, name, phone, PAN…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground mx-1" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-semibold px-3 h-8 rounded-full border transition-colors ${
                  filter === f.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-soft"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">KYC ID</th>
                  <th className="text-left px-4 py-3 font-bold">Applicant</th>
                  <th className="text-left px-4 py-3 font-bold">Documents</th>
                  <th className="text-left px-4 py-3 font-bold">Face Match</th>
                  <th className="text-left px-4 py-3 font-bold">Liveness</th>
                  <th className="text-left px-4 py-3 font-bold">Risk</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-left px-4 py-3 font-bold">Submitted</th>
                  <th className="text-right px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => {
                  const verified = a.documents.filter((d) => d.verified).length;
                  return (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold flex items-center gap-1.5">
                          {a.name}
                          {a.flags.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{a.phone} · {a.channel}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-bold">{verified}</span>
                        <span className="text-muted-foreground"> / {a.documents.length}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${a.matchScore > 90 ? "text-emerald-700" : a.matchScore > 75 ? "text-amber-700" : "text-rose-700"}`}>
                          {a.matchScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${a.livenessScore > 90 ? "text-emerald-700" : a.livenessScore > 75 ? "text-amber-700" : "text-rose-700"}`}>
                          {a.livenessScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.risk} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.status === "Pending Review" ? "pending" : a.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.submittedAt}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/qc/kyc-review/$id"
                          params={{ id: a.id }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-3 h-8 text-xs font-bold hover:bg-indigo-700"
                        >
                          Review <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No applications match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </QcShell>
  );
}