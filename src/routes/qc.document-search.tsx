import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSearch, Search } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { QueueTable } from "@/components/qc/queue-table";
import { QC_APPLICANTS } from "@/components/qc/mock-data";

export const Route = createFileRoute("/qc/document-search")({
  head: () => ({ meta: [{ title: "Document Search — QC Portal" }] }),
  component: DocSearchPage,
});

const DOC_TYPES = ["All", "Aadhaar", "PAN", "GST", "Selfie", "Video KYC", "Cancelled Cheque", "Shop Photo"] as const;

function DocSearchPage() {
  const [query, setQuery] = useState("");
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>("All");

  const data = useMemo(() => {
    return QC_APPLICANTS.filter((a) => {
      if (docType !== "All" && !a.documents.some((d) => d.label.toLowerCase().includes(docType.toLowerCase()))) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.pan.toLowerCase().includes(q) ||
        a.aadhaar.toLowerCase().includes(q)
      );
    });
  }, [query, docType]);

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<FileSearch className="h-5 w-5" />}
          title="Document Search"
          subtitle="Search across all submitted KYC documents by ID, PAN, Aadhaar last-4, or applicant."
        />

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 h-11">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by PAN, Aadhaar last-4, KYC ID, name, phone…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mr-1">Document type:</span>
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`text-xs font-semibold px-3 h-7 rounded-full border transition-colors ${
                  docType === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground"><strong>{data.length}</strong> matching application{data.length === 1 ? "" : "s"}.</p>
        <QueueTable data={data} emptyLabel="No documents match your search." />
      </div>
    </QcShell>
  );
}