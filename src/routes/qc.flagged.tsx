import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { QueueTable } from "@/components/qc/queue-table";
import { QC_APPLICANTS } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/flagged")({
  head: () => ({ meta: [{ title: "Flagged Cases — QC Portal" }] }),
  component: FlaggedPage,
});

function FlaggedPage() {
  const [query, setQuery] = useState("");
  const data = useMemo(() => {
    return QC_APPLICANTS
      .filter((a) => a.flags.length > 0 || a.risk === "High")
      .filter((a) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.phone.includes(q);
      });
  }, [query]);

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Flagged Cases"
          subtitle="High-risk applications and submissions with verification flags."
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <p><strong>{data.length}</strong> cases require additional verification. Review the flags before approving.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-9">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flagged cases…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <QueueTable data={data} emptyLabel="No flagged cases." />
      </div>
    </QcShell>
  );
}