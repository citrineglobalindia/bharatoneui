import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "My Applications — BharatOne" }] }),
  component: ApplicationsPage,
});

type Row = { id: string; application_no: string; service_name: string; category_name: string; full_name: string; status: string; service_charge: number; commission_price: number; created_at: string };

const statusMap: Record<string, string> = { submitted: "Pending", in_progress: "Processing", approved: "Approved", rejected: "Rejected", completed: "Completed" };

const cols: Column<Row>[] = [
  { key: "application_no", header: "Application No", cell: (r) => <span className="font-mono text-xs">{r.application_no}</span> },
  { key: "service_name", header: "Service", cell: (r) => <span className="font-medium">{r.service_name}</span> },
  { key: "category_name", header: "Category", cell: (r) => <span className="text-xs text-muted-foreground">{r.category_name}</span> },
  { key: "applicant", header: "Applicant", cell: (r) => r.full_name },
  { key: "charge", header: "Charge", cell: (r) => <span className="text-xs">₹{Number(r.service_charge).toLocaleString("en-IN")}</span> },
  { key: "created_at", header: "Submitted", cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span> },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={statusMap[r.status] ?? r.status} /> },
];

function ApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("service_applications")
        .select("id,application_no,service_name,category_name,full_name,status,service_charge,commission_price,created_at")
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ClipboardList className="h-5 w-5" />}
          title="My Applications"
          subtitle="Track all your service applications in one place"
          actions={
            <Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev">
              <Plus className="h-4 w-4" /> New Application
            </Link>
          }
        />
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading applications…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No applications yet. Click <b className="text-foreground">New Application</b> to apply for a service.
          </div>
        ) : (
          <DataTable columns={cols} rows={rows} />
        )}
      </div>
    </RetailerShell>
  );
}
