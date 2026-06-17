import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus, Loader2, FileText, IndianRupee, TrendingUp, RefreshCw, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Applied Services — BharatOne" }] }),
  component: ApplicationsPage,
});

type Row = { id: string; application_no: string; service_name: string; category_name: string; full_name: string; status: string; service_charge: number; commission_price: number; created_at: string; result_doc_path: string | null };
const statusLabel: Record<string, string> = { submitted: "Pending", in_progress: "Processing", approved: "Approved", rejected: "Rejected", completed: "Completed" };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

const cols: Column<Row>[] = [
  { key: "application_no", header: "Application No", cell: (r) => <span className="font-mono text-xs">{r.application_no}</span> },
  { key: "service_name", header: "Service", cell: (r) => <span className="font-medium">{r.service_name}</span> },
  { key: "category_name", header: "Category", cell: (r) => <span className="text-xs text-muted-foreground">{r.category_name}</span> },
  { key: "charge", header: "Charge", cell: (r) => <span className="text-xs">{inr(r.service_charge)}</span> },
  { key: "commission", header: "Commission", cell: (r) => <span className="text-xs font-semibold text-india-green">{inr(r.commission_price)}</span> },
  { key: "created_at", header: "Submitted", cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span> },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={statusLabel[r.status] ?? r.status} /> },
  { key: "result", header: "Result", cell: (r) => r.result_doc_path ? <button onClick={() => openResult(r.result_doc_path!)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> Download</button> : <span className="text-xs text-muted-foreground">—</span>, className: "text-right" },
];

const FILTERS = ["All", "Pending", "Processing", "Approved", "Completed", "Rejected"];

async function openResult(path: string) {
  const { data, error } = await supabase.storage.from("service-attachments").createSignedUrl(path, 3600);
  if (error || !data) return;
  window.open(data.signedUrl, "_blank");
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-lg font-extrabold">{value}</p></div>
      </div>
    </div>
  );
}

function ApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("service_applications")
      .select("id,application_no,service_name,category_name,full_name,status,service_charge,commission_price,created_at,result_doc_path")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    count: rows.length,
    charges: rows.reduce((a, r) => a + Number(r.service_charge || 0), 0),
    commission: rows.filter((r) => ["approved", "completed"].includes(r.status)).reduce((a, r) => a + Number(r.commission_price || 0), 0),
    pending: rows.filter((r) => ["submitted", "in_progress"].includes(r.status)).length,
  }), [rows]);

  const filtered = useMemo(() => filter === "All" ? rows : rows.filter((r) => (statusLabel[r.status] ?? r.status) === filter), [rows, filter]);

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ClipboardList className="h-5 w-5" />}
          title="Applied Services"
          subtitle="Report of all your applied services, charges and commissions"
          actions={
            <Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev">
              <Plus className="h-4 w-4" /> Apply Service
            </Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={FileText} label="Total Applications" value={String(totals.count)} tone="bg-saffron/10 text-saffron" />
          <Stat icon={Loader2} label="In Progress" value={String(totals.pending)} tone="bg-amber-500/10 text-amber-600" />
          <Stat icon={IndianRupee} label="Total Charges" value={inr(totals.charges)} tone="bg-blue-500/10 text-blue-600" />
          <Stat icon={TrendingUp} label="Commission Earned" value={inr(totals.commission)} tone="bg-india-green/10 text-india-green" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${filter === f ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{f}</button>)}
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? <>No applications yet. Click <b className="text-foreground">Apply Service</b> to get started.</> : "No applications match this filter."}
          </div>
        ) : (
          <DataTable columns={cols} rows={filtered} />
        )}
      </div>
    </RetailerShell>
  );
}
