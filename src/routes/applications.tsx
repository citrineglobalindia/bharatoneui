import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Plus, Loader2, FileText, IndianRupee, TrendingUp, RefreshCw, Download, ChevronRight, X, FileDown, ImageDown, Share2, Paperclip, Phone, Upload } from "lucide-react";
import { toast } from "sonner";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { supabase } from "@/integrations/supabase/client";
import { downloadReceiptPDF, downloadReceiptPNG, shareReceipt, type AppReceipt } from "@/lib/application-receipt";
import { ApplicationThread } from "@/components/application-thread";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Applied Services — BharatOne" }] }),
  component: ApplicationsPage,
});

type Row = {
  id: string; application_no: string; service_name: string; category_name: string; full_name: string;
  father_name: string | null; gender: string | null; email: string | null; phone: string | null; address: string | null;
  aadhaar_number: string | null; pan_number: string | null; status: string; service_charge: number; commission_price: number;
  created_at: string; result_doc_path: string | null; result_note: string | null; form_data: any; assigned_operator: string | null;
  reupload_requested: boolean; reupload_note: string | null; reupload_path: string | null; reupload_name: string | null;
};
const statusLabel: Record<string, string> = { submitted: "Waiting for Approval", on_process: "On Process", in_progress: "On Process", waiting_approval: "Waiting for Approval", on_delay: "On Delay", approved: "Completed", rejected: "Rejected", completed: "Completed" };
const STEPS = ["submitted", "on_process", "waiting_approval", "completed"];
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const FILTERS = ["All", "On Process", "Waiting for Approval", "On Delay", "Completed", "Rejected"];

async function openResult(path: string) {
  const { data } = await supabase.storage.from("service-attachments").createSignedUrl(path, 3600);
  if (data) window.open(data.signedUrl, "_blank");
}
async function openSubmitted(path: string) {
  const { data } = await supabase.storage.from("application-files").createSignedUrl(path, 3600);
  if (data) window.open(data.signedUrl, "_blank");
}
function submittedFiles(form: any): { name: string; path: string }[] {
  if (!form || typeof form !== "object") return [];
  return Object.values(form).filter((v: any) => v && typeof v === "object" && v.__file).map((v: any) => ({ name: v.name || "Document", path: v.__file }));
}
const toReceipt = (r: Row): AppReceipt => ({
  application_no: r.application_no, status: r.status, created_at: r.created_at, full_name: r.full_name,
  father_name: r.father_name ?? undefined, gender: r.gender ?? undefined, phone: r.phone ?? undefined, email: r.email ?? undefined,
  aadhaar_number: r.aadhaar_number ?? undefined, pan_number: r.pan_number ?? undefined, address: r.address ?? undefined,
  category_name: r.category_name, service_name: r.service_name, service_charge: r.service_charge, commission_price: r.commission_price,
});

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
  const [sel, setSel] = useState<Row | null>(null);
  const [opContact, setOpContact] = useState<{ name: string; email: string | null; phone: string | null } | null>(null);
  const [reuploading, setReuploading] = useState(false);
  useEffect(() => {
    if (!sel) { setOpContact(null); return; }
    let on = true;
    (async () => { const { data } = await supabase.rpc("application_operator_contact", { _app: sel.id }); if (on) setOpContact((data as any) ?? null); })();
    return () => { on = false; };
  }, [sel]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("service_applications")
      .select("id,application_no,service_name,category_name,full_name,father_name,gender,email,phone,address,aadhaar_number,pan_number,status,service_charge,commission_price,created_at,result_doc_path,result_note,form_data,assigned_operator,reupload_requested,reupload_note,reupload_path,reupload_name")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    count: rows.length,
    charges: rows.reduce((a, r) => a + Number(r.service_charge || 0), 0),
    commission: rows.filter((r) => r.status === "completed").reduce((a, r) => a + Number(r.commission_price || 0), 0),
    pending: rows.filter((r) => !["completed", "rejected"].includes(r.status)).length,
  }), [rows]);
  const filtered = useMemo(() => filter === "All" ? rows : rows.filter((r) => (statusLabel[r.status] ?? r.status) === filter), [rows, filter]);

  const doReupload = async (r: Row, file: File) => {
    if (file.size > 50 * 1024 * 1024) return toast.error("File too large", { description: "Maximum size is 50 MB." });
    setReuploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return toast.error("Your session has expired", { description: "Please sign in again." });
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${uid}/reupload-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("application-files").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) return toast.error("Upload failed", { description: upErr.message });
      const { error } = await supabase.rpc("retailer_reupload_document", { _app: r.id, _path: path, _name: file.name });
      if (error) return toast.error("Could not submit", { description: error.message });
      toast.success("Document re-uploaded — operator notified");
      setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, reupload_path: path, reupload_name: file.name, reupload_requested: false } : x));
      setSel((s2) => s2 && s2.id === r.id ? { ...s2, reupload_path: path, reupload_name: file.name, reupload_requested: false } : s2);
    } finally { setReuploading(false); }
  };
  const cols: Column<Row>[] = [
    { key: "application_no", header: "Application ID", cell: (r) => <span className="font-mono text-xs">{r.application_no}</span> },
    { key: "service_name", header: "Service", cell: (r) => <span className="font-medium">{r.service_name}</span> },
    { key: "full_name", header: "Applicant", cell: (r) => <span className="text-sm">{r.full_name || "—"}</span> },
    { key: "charge", header: "Charge", cell: (r) => <span className="text-xs">{inr(r.service_charge)}</span> },
    { key: "commission", header: "Commission", cell: (r) => <span className="text-xs font-semibold text-india-green">{inr(r.commission_price)}</span> },
    { key: "created_at", header: "Submitted", cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={statusLabel[r.status] ?? r.status} /> },
    { key: "act", header: "", cell: (r) => <button onClick={() => setSel(r)} className="inline-flex items-center gap-1 text-xs font-bold text-india-green hover:underline">View <ChevronRight className="h-3.5 w-3.5" /></button>, className: "text-right" },
  ];

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<ClipboardList className="h-5 w-5" />} title="Applied Services" subtitle="Track applications, download receipts anytime and reach out to the operator"
          actions={<Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev"><Plus className="h-4 w-4" /> Apply Service</Link>} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={FileText} label="Total Applications" value={String(totals.count)} tone="bg-saffron/10 text-saffron" />
          <Stat icon={Loader2} label="In Progress" value={String(totals.pending)} tone="bg-amber-500/10 text-amber-600" />
          <Stat icon={IndianRupee} label="Total Charges" value={inr(totals.charges)} tone="bg-blue-500/10 text-blue-600" />
          <Stat icon={TrendingUp} label="Commission Earned" value={inr(totals.commission)} tone="bg-india-green/10 text-india-green" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${filter === f ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{f}</button>)}</div>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">{rows.length === 0 ? <>No applications yet. Click <b className="text-foreground">Apply Service</b> to get started.</> : "No applications match this filter."}</div>
          : <DataTable columns={cols} rows={filtered} />}
      </div>

      {sel && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-soft sm:px-6">
            <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-india-green">
              <ChevronRight className="h-4 w-4 rotate-180" /> Back
            </button>
            <span className="font-mono text-xs font-bold text-muted-foreground">{sel.application_no}</span>
            <button onClick={() => setSel(null)} aria-label="Close"><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="mx-auto max-w-3xl p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-xs font-bold text-muted-foreground">{sel.application_no}</p><p className="font-display text-lg font-extrabold">{sel.service_name}</p><p className="text-sm text-muted-foreground">{sel.category_name}</p></div>
            </div>

            {/* Status tracker */}
            <div className="mt-4">
              {sel.status === "rejected"
                ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Rejected</span>
                : <div className="flex items-center gap-1">{STEPS.map((s, i) => {
                    const idx = STEPS.indexOf(sel.status); const on = i <= (idx < 0 ? 0 : idx);
                    return <div key={s} className="flex flex-1 items-center gap-1">
                      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${on ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                      {i < STEPS.length - 1 && <div className={`h-1 flex-1 rounded ${i < (idx < 0 ? 0 : idx) ? "bg-india-green" : "bg-muted"}`} />}
                    </div>;
                  })}</div>}
              <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground"><span>Submitted</span><span>Processing</span><span>Approved</span><span>Completed</span></div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span>Charge <b>{inr(sel.service_charge)}</b></span><span className="text-india-green">Commission <b>{inr(sel.commission_price)}</b></span></div>

            {submittedFiles(sel.form_data).length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Documents you submitted</p>
                <div className="space-y-1.5">
                  {submittedFiles(sel.form_data).map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <span className="flex items-center gap-1.5 truncate text-sm"><Paperclip className="h-4 w-4 text-muted-foreground shrink-0" /> <span className="truncate">{f.name}</span></span>
                      <button onClick={() => openSubmitted(f.path)} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> View</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(sel.reupload_requested || sel.reupload_path) && (
              <div className={`mt-3 rounded-lg border px-3 py-2.5 ${sel.reupload_requested ? "border-amber-300 bg-amber-50" : "border-border bg-muted/30"}`}>
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${sel.reupload_requested ? "text-amber-800" : "text-foreground"}`}><Upload className="h-4 w-4" /> {sel.reupload_requested ? "Operator requested a document re-upload" : "Re-uploaded document"}</p>
                {sel.reupload_requested && sel.reupload_note && <p className="mt-1 text-xs text-amber-700">“{sel.reupload_note}”</p>}
                {sel.reupload_path && !sel.reupload_requested && (
                  <div className="mt-2 flex items-center justify-between"><span className="truncate text-sm">{sel.reupload_name || "Document"}</span><button onClick={() => openSubmitted(sel.reupload_path!)} className="inline-flex items-center gap-1 text-xs font-bold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> View</button></div>
                )}
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90">
                  {reuploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {sel.reupload_path ? "Re-upload again" : "Re-upload document"}
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && doReupload(sel, e.target.files[0])} />
                </label>
              </div>
            )}

            {sel.result_doc_path && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-india-green/30 bg-india-green/5 px-3 py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="h-4 w-4 text-india-green" /> Return document from operator</span>
                <button onClick={() => openResult(sel.result_doc_path!)} className="inline-flex items-center gap-1 text-xs font-bold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> Download</button>
              </div>
            )}
            {sel.result_note && <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"><b>Operator note:</b> {sel.result_note}</p>}

            {/* Receipt anytime */}
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Receipt</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => downloadReceiptPDF(toReceipt(sel))} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90"><FileDown className="h-4 w-4" /> PDF</button>
              <button onClick={() => downloadReceiptPNG(toReceipt(sel))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><ImageDown className="h-4 w-4" /> Image</button>
              <button onClick={async () => { const r = await shareReceipt(toReceipt(sel)); if (r === "copied") toast.success("Receipt details copied"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><Share2 className="h-4 w-4" /> Share</button>
            </div>

            {/* Operator contact */}
            {opContact && (opContact.phone || opContact.email) && (
              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Assigned operator</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{opContact.name}</p>{opContact.email && <p className="truncate text-[11px] text-muted-foreground">{opContact.email}</p>}</div>
                  {opContact.phone
                    ? <a href={`tel:${opContact.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90"><Phone className="h-4 w-4" /> {opContact.phone}</a>
                    : <span className="text-xs text-muted-foreground">No contact number added</span>}
                </div>
              </div>
            )}

            {/* Contact operator */}
            <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Reach out to operator</p>
            <ApplicationThread applicationId={sel.id} />
          </div>
        </div>
      )}
    </RetailerShell>
  );
}
