import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { MOCK_APPLICATIONS, type Application } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "My Applications — BharatOne" }] }),
  component: ApplicationsPage,
});

const cols: Column<Application>[] = [
  { key: "id", header: "Application ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "type", header: "Type", cell: (r) => <span className="font-medium">{r.type}</span> },
  { key: "applicant", header: "Applicant", cell: (r) => r.applicant },
  { key: "submitted", header: "Submitted", cell: (r) => <span className="text-xs text-muted-foreground">{r.submitted}</span> },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "act", header: "", cell: () => <button className="text-xs font-bold text-india-green hover:underline">View →</button>, className: "text-right" },
];

function ApplicationsPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ClipboardList className="h-5 w-5" />}
          title="My Applications"
          subtitle="Track all your business service applications in one place"
          actions={
            <Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev">
              <Plus className="h-4 w-4" /> New Application
            </Link>
          }
        />
        <DataTable columns={cols} rows={MOCK_APPLICATIONS} />
      </div>
    </RetailerShell>
  );
}