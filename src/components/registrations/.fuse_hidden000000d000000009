import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, CreditCard, XCircle, X, CheckCircle2, Download, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { downloadRegistrationPDF } from "@/lib/registration-pdf";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";

type DistRow = {
  id: string; application_id: string; username: string | null; status: string;
  distributor_name: string | null; company_name: string | null; proprietor_name: string | null;
  mobile: string | null; alt_mobile: string | null; email: string | null;
  district: string | null; state: string | null; group_name: string | null;
  gst_number: string | null; pan_number: string | null; bank_name: string | null;
  account_number: string | null; ifsc: string | null; address_line: string | null;
  transaction_id: string | null; rejection_reason: string | null; created_at: string;
  form_doc_path: string | null; bank_copy_path: string | null; aadhaar_doc_path: string | null; pan_doc_path: string | null;
};

const db = supabase as any;
const statusPill = (s: string) => ({
  under_review: "bg-amber-100 text-amber-700", on_hold: "bg-orange-100 text-orange-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700",
}[s] ?? "bg-slate-100 text-slate-700");

// Map the KYC-Approvals tab to the distributor status shown under it.
function statusForTab(tab: string): string[] {
  if (tab === "approved") return ["approved"];
  if (tab === "rejected") return ["rejected"];
  if (tab === "accountant_review" || tab === "qc_review" || tab === "telecaller") return ["under_review", "pending", "submitted", "on_hold"];
  return [];
}

export function DistributorReviewTable({ tab, query = "", fromDate = "", toDate = "" }: { tab: string; query?: string; fromDate?: string; toDate?: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<DistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistRow | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const canReview = role === "admin" || role === "accountant";

  const downloadRow = async (r: DistRow) => {
    setDownloadingId(r.id);
    try {
      const cols: [string, string | null][] = [
        ["Onboarding Form", r.form_doc_path],
        ["Bank Copy", r.bank_copy_path],
        ["Aadhaar", r.aadhaar_doc_path],
        ["PAN Card", r.pan_doc_path],
      ];
      const docs: { label: string; url: string; isPdf?: boolean }[] = [];
      for (const [label, path] of cols) {
        if (!path) continue;
        const { data: su } = await db.storage.from("retailer-kyc").createSignedUrl(path, 3600);
        if (su?.signedUrl) docs.push({ label, url: su.signedUrl, isPdf: /\.pdf$/i.test(String(path).split("?")[0]) });
      }
      const mapped: Record<string, any> = {
        application_id: r.application_id,
        distributor_id: r.username || r.application_id,
        username: r.username,
        first_name: r.distributor_name || r.proprietor_name || r.company_name || "Distributor",
        surname: "",
        proprietor_name: r.proprietor_name, company_name: r.company_name, group_name: r.group_name,
        mobile: r.mobile, alt_mobile: r.alt_mobile, email: r.email,
        pan_number: r.pan_number, gst_number: r.gst_number,
        shop_name: r.company_name,
        registration_type: "distributor", status: r.status,
        address_line: r.address_line, district: r.district, state: r.state,
        bank_holder_name: r.proprietor_name, bank_name: r.bank_name, account_number: r.account_number, ifsc: r.ifsc,
        transaction_id: r.transaction_id, rejection_reason: r.rejection_reason,
      };
      await downloadRegistrationPDF(mapped, docs, r.username || r.application_id);
    } catch (e) {
      toast.error("Could not generate PDF", { description: e instanceof Error ? e.message : String(e) });
    } finally { setDownloadingId(null); }
  };

  useEffect(() => {
    if (!detail) { setDocUrls({}); return; }
    let on = true;
    (async () => {
      const cols: Record<string, string | null> = {
        form: detail.form_doc_path, bank: detail.bank_copy_path, aadhaar: detail.aadhaar_doc_path, pan: detail.pan_doc_path,
      };
      const out: Record<string, string> = {};
      for (const [k, p] of Object.entries(cols)) {
        if (p) { const { data: su } = await db.storage.from("retailer-kyc").createSignedUrl(p, 3600); if (su?.signedUrl) out[k] = su.signedUrl; }
      }
      if (on) setDocUrls(out);
    })();
    return () => { on = false; };
  }, [detail]);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await db.from("distributor_registrations").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as DistRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const wanted = useMemo(() => statusForTab(tab), [tab]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;
    return rows.filter((r) => {
      if (!wanted.includes(r.status)) return false;
      if (from || to) {
        const d = new Date(r.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (q) {
        const hay = [r.application_id, r.username, r.distributor_name, r.company_name, r.proprietor_name, r.mobile, r.alt_mobile, r.email, r.district, r.state, r.pan_number, r.gst_number]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, wanted, query, fromDate, toDate]);

  const approve = async (r: DistRow) => {
    setBusy(r.id);
    try {
      const { error } = await db.rpc("approve_distributor_registration", { reg_id: r.id });
      if (error) { toast.error("Approve failed", { description: error.message }); return; }
      toast.success("Distributor approved");
      setDetail(null); load();
    } finally { setBusy(null); }
  };
  const reject = async (r: DistRow) => {
    const reason = window.prompt("Reason for rejection (required):");
    if (reason === null) return;
    if (!reason.trim()) { toast.error("Remark is required to reject"); return; }
    setBusy(r.id);
    try {
      const { error } = await db.rpc("reject_distributor_registration", { reg_id: r.id, reason: reason.trim() });
      if (error) { toast.error("Reject failed", { description: error.message }); return; }
      toast.success("Distributor rejected");
      setDetail(null); load();
    } finally { setBusy(null); }
  };
  const hold = async (r: DistRow) => {
    const reason = window.prompt("Reason for hold (required):");
    if (reason === null) return;
    if (!reason.trim()) { toast.error("Remark is required to hold"); return; }
    setBusy(r.id);
    try {
      const { error } = await db.rpc("hold_distributor_registration", { reg_id: r.id, reason: reason.trim() });
      if (error) { toast.error("Hold failed", { description: error.message }); return; }
      toast.success("Distributor put on hold");
      setDetail(null); load();
    } finally { setBusy(null); }
  };

  const dt = (s: string) => new Date(s);

  const acc = (r: DistRow, key: string) => {
    switch (key) {
      case "app_id": return r.application_id;
      case "dist_id": return r.username || r.application_id;
      case "name": return r.distributor_name || r.company_name || r.proprietor_name || "";
      case "contact": return r.mobile || "";
      case "email": return r.email || "";
      case "date": return new Date(r.created_at).getTime();
      case "district": return r.district || "";
      case "status": return r.status || "";
      default: return "";
    }
  };
  const cf = useColumnFilters<DistRow>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);

  const exportList = () => {
    if (filtered.length === 0) { toast.error("No rows to export"); return; }
    // Same 28-column layout as the retailer / Old JSKO export, so the whole
    // module exports in one consistent format. Columns that don't apply to
    // distributors (wallet / service / tax) are left blank like the others.
    const HEADERS = [
      "Sl.no", "User Name", "Old JSKO Id", "New JSKO ID", "Full Name", "Pan", "District", "Taluka", "Hobli", "Gram Panchayat",
      "Opening Wallet", "CR amount", "DR Amount", "Closing Wallet", "Type", "Service Amount", "SP Amount", "Deduction Amount",
      "GST", "TDS", "Reference Table", "Reference Id", "Order Id", "Tracking id", "Service Department", "Service", "Remarks", "Creation Date Time",
    ];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const lines = filtered.map((r, i) => [
      i + 1,
      r.username || "",                                                   // User Name
      "",                                                                 // Old JSKO Id (n/a)
      r.username || "",                                                   // New JSKO ID (distributor ID)
      r.distributor_name || r.proprietor_name || r.company_name || "",    // Full Name
      r.pan_number || "", r.district || "", "", "", "",                   // Pan, District, Taluka, Hobli, Gram Panchayat
      "", "", "", "",                                                     // Opening / CR / DR / Closing wallet
      "Distributor",                                                      // Type
      "", "", "", "", "",                                                 // Service / SP / Deduction / GST / TDS
      "distributor_registrations", r.id || "", "", "", "", "",            // Reference Table/Id, Order/Tracking, Dept/Service
      r.rejection_reason || "", r.created_at ? fmt(r.created_at) : "",    // Remarks, Creation Date Time
    ].map(esc).join(","));
    const csv = ["﻿" + HEADERS.map(esc).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `registration-payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported", { description: `${filtered.length} rows` });
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button onClick={exportList} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {([
                ["Application ID", "app_id"], ["Distributor ID", "dist_id"], ["Distributor Name", "name"], ["Amount", null], ["Checks", null],
                ["Contact Number", "contact"], ["Email ID", "email"], ["Date & Time", "date"], ["District", "district"], ["Taluk", null], ["Status", "status"],
              ] as [string, string | null][]).map(([h, key]) => key
                ? <SortTh key={h} className="whitespace-nowrap px-3 py-2.5" label={h} sortKey={key} sort={sort} onSort={toggle} />
                : <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              )}
              <th className="sticky right-0 z-20 whitespace-nowrap bg-muted px-3 py-2.5 text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)]">Actions</th>
            </tr>
            <tr className="bg-muted/30">
              <FilterTh className="px-2 pb-2" filterKey="app_id" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="dist_id" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="name" filters={cf.filters} setFilter={cf.setFilter} />
              <th className="px-2 pb-2" />
              <th className="px-2 pb-2" />
              <FilterTh className="px-2 pb-2" filterKey="contact" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="email" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="date" filters={cf.filters} setFilter={cf.setFilter} />
              <FilterTh className="px-2 pb-2" filterKey="district" filters={cf.filters} setFilter={cf.setFilter} />
              <th className="px-2 pb-2" />
              <FilterTh className="px-2 pb-2" filterKey="status" filters={cf.filters} setFilter={cf.setFilter} />
              <th className="sticky right-0 z-20 bg-muted px-2 pb-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">No distributor registrations in this tab.</td></tr>
            ) : sorted.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">{r.application_id}</td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">{r.username || r.application_id}</td>
                <td className="px-3 py-3 font-semibold">{r.distributor_name || r.company_name || r.proprietor_name || "—"}</td>
                <td className="px-3 py-3">—</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{r.gst_number ? "GST ✓" : "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">{r.mobile || "—"}</td>
                <td className="px-3 py-3 text-sm"><span className="block max-w-[200px] truncate" title={r.email || ""}>{r.email || "—"}</span></td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{dt(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-3 text-sm">{r.district || "—"}</td>
                <td className="px-3 py-3 text-sm">—</td>
                <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>{r.status.replace("_", " ")}</span></td>
                <td className="sticky right-0 z-10 bg-card px-3 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)]">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button size="sm" variant="outline" className="h-8" disabled={downloadingId === r.id} title="Download PDF" onClick={() => downloadRow(r)}>
                      {downloadingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </Button>
                    {canReview && (r.status === "under_review" || r.status === "on_hold") && (
                      <>
                        <Button size="sm" className="h-8 bg-india-green text-white" disabled={busy === r.id} onClick={() => approve(r)}>
                          {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-amber-600" disabled={busy === r.id} onClick={() => hold(r)}><PauseCircle className="h-3.5 w-3.5" /> Hold</Button>
                        <Button size="sm" variant="outline" className="h-8 text-rose-600" disabled={busy === r.id} onClick={() => reject(r)}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] w-[min(720px,96vw)] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between gap-2"><span>{detail?.distributor_name || detail?.company_name || "Distributor"}</span><button onClick={() => setDetail(null)}><X className="h-5 w-5 text-muted-foreground" /></button></DialogTitle></DialogHeader>
          {detail && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{detail.application_id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusPill(detail.status)}`}>{detail.status.replace("_", " ")}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {([
                  ["Distributor ID", detail.username || detail.application_id], ["Proprietor", detail.proprietor_name], ["Company", detail.company_name],
                  ["Group", detail.group_name], ["GST", detail.gst_number], ["PAN", detail.pan_number],
                  ["Mobile", detail.mobile], ["Alt Mobile", detail.alt_mobile], ["Email", detail.email],
                  ["Bank", detail.bank_name], ["Account No", detail.account_number], ["IFSC", detail.ifsc],
                  ["Address", detail.address_line], ["District", detail.district], ["State", detail.state],
                  ["Transaction Id", detail.transaction_id],
                ] as [string, string | null][]).map(([l, v]) => (
                  <div key={l}><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p><p className="font-medium break-words">{v || "—"}</p></div>
                ))}
              </div>
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Documents</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    ["Onboarding Form", "form", detail.form_doc_path],
                    ["Bank Copy", "bank", detail.bank_copy_path],
                    ["Aadhaar", "aadhaar", detail.aadhaar_doc_path],
                    ["PAN Card", "pan", detail.pan_doc_path],
                  ] as [string, string, string | null][]).map(([label, key, path]) => {
                    const url = docUrls[key];
                    const isImg = !!path && /\.(jpg|jpeg|jfif|png|webp|gif|bmp|heic|heif|avif)$/i.test(path.split("?")[0]);
                    return (
                      <div key={key} className="overflow-hidden rounded-lg border border-border bg-background">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="block">
                            {isImg ? <img src={url} alt={label} className="h-24 w-full object-cover" /> : <div className="grid h-24 w-full place-items-center bg-muted/40 text-[10px] font-semibold text-muted-foreground">PDF / File</div>}
                          </a>
                        ) : (
                          <div className="grid h-24 w-full place-items-center text-[10px] text-muted-foreground">{path ? "Loading…" : "Not uploaded"}</div>
                        )}
                        <p className="truncate px-2 py-1 text-[10px] font-semibold">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {detail.status === "rejected" && detail.rejection_reason && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Rejected: {detail.rejection_reason}</p>
              )}
              {canReview && (detail.status === "under_review" || detail.status === "on_hold") && (
                <DialogFooter className="mt-4 gap-2">
                  <Button variant="outline" className="text-rose-600" disabled={busy === detail.id} onClick={() => reject(detail)}><XCircle className="h-4 w-4" /> Reject</Button>
                  <Button variant="outline" className="text-amber-600" disabled={busy === detail.id} onClick={() => hold(detail)}><PauseCircle className="h-4 w-4" /> Hold</Button>
                  <Button className="bg-india-green text-white" disabled={busy === detail.id} onClick={() => approve(detail)}>{busy === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
