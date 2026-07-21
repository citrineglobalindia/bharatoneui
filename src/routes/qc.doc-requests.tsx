import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileUp, Loader2, Check, X, RefreshCw, Eye, Send, Search, Clock, CheckCircle2, AlertTriangle, Hourglass } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/qc/doc-requests")({
  head: () => ({ meta: [{ title: "Doc Requests — QC Portal" }] }),
  component: Page,
});

type Req = {
  id: string; user_id: string; doc_key: string | null; doc_label: string; note: string | null; status: string;
  file_path: string | null; old_path: string | null; uploaded_at: string | null; remarks: string | null; created_at: string;
  requester_name: string | null; requester_email: string | null; requester_phone: string | null;
  application_id: string | null; jsko_id: string | null;
};
type Retailer = { user_id: string; full_name: string; application_id: string; jsko_id: string | null; email: string; mobile: string; reg_status: string };
type RetailerDoc = { doc_key: string; doc_label: string; path: string | null };

const DOC_OPTIONS = ["PAN Card", "Aadhaar Front", "Aadhaar Back", "Shop Photo", "Selfie", "Police Verification", "Bank Passbook / Cancelled Cheque", "GST Certificate", "Other"];

function Page() {
  const [rows, setRows] = useState<Req[]>([]);
  const [tab, setTab] = useState<"all" | "requested" | "uploaded" | "verified" | "rejected">("uploaded");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // new request form
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Retailer[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Retailer | null>(null);
  const [pickedDocs, setPickedDocs] = useState<RetailerDoc[]>([]);
  const [docKey, setDocKey] = useState<string | null>(null);
  const [docLabel, setDocLabel] = useState(DOC_OPTIONS[0]);
  const [customLabel, setCustomLabel] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  // Load the picked retailer's current documents for per-document requests.
  useEffect(() => {
    setPickedDocs([]); setDocKey(null);
    if (!picked) return;
    (async () => {
      const { data } = await (supabase as any).rpc("qc_retailer_docs", { _user_id: picked.user_id });
      setPickedDocs((data as RetailerDoc[]) ?? []);
    })();
  }, [picked?.user_id]);

  const viewPath = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from("retailer-kyc").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not open the file");
  };

  const load = async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await (supabase as any).rpc("qc_list_kyc_doc_requests", { _status: null });
    if (error) toast.error(error.message);
    setRows((data as Req[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  // debounced retailer search
  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await (supabase as any).rpc("qc_search_live_retailers", { _q: q.trim() });
      setHits((data as Retailer[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const stats = useMemo(() => ({
    requested: rows.filter((r) => r.status === "requested").length,
    uploaded: rows.filter((r) => r.status === "uploaded").length,
    verified: rows.filter((r) => r.status === "verified").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);
  const visible = tab === "all" ? rows : rows.filter((r) => r.status === tab);

  const sendRequest = async () => {
    if (!picked) return toast.error("Search and select a retailer first");
    const keyed = pickedDocs.find((d) => d.doc_key === docKey);
    const label = keyed ? keyed.doc_label : docLabel === "Other" ? customLabel.trim() : docLabel;
    if (!label) return toast.error("Enter the document name");
    setSending(true);
    try {
      const { data, error } = await (supabase as any).rpc("qc_request_kyc_doc", { _user_id: picked.user_id, _doc_label: label, _note: note.trim() || null, _doc_key: docKey });
      if (error) return toast.error("Could not send the request", { description: error.message });
      if (!(data as any)?.ok) return toast.error("Could not send the request");
      toast.success(`Request sent to ${picked.full_name || picked.application_id}`, { description: "They have been notified to upload it under KYC Docs." });
      setPicked(null); setQ(""); setNote(""); setCustomLabel(""); setDocLabel(DOC_OPTIONS[0]); setDocKey(null);
      await load();
    } finally { setSending(false); }
  };

  const review = async (r: Req, approve: boolean) => {
    const remarks = approve ? null : (window.prompt("Reason for rejecting (shown to the retailer):") ?? "");
    if (!approve && remarks === null) return;
    setActing(r.id);
    try {
      const { data, error } = await (supabase as any).rpc("qc_review_kyc_doc_request", { _id: r.id, _approve: approve, _remarks: remarks || null });
      if (error) return toast.error("Review failed", { description: error.message });
      if (!(data as any)?.ok) return toast.error("Review failed");
      toast.success(approve ? "Document verified" : "Rejected — the retailer must re-upload");
      await load();
    } finally { setActing(null); }
  };

  const viewFile = async (r: Req) => {
    if (!r.file_path) return;
    const { data } = await supabase.storage.from("retailer-kyc").createSignedUrl(r.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not open the file");
  };

  const chip = (s: string) => s === "requested"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock className="h-3 w-3" /> Awaiting upload</span>
    : s === "uploaded"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700"><Hourglass className="h-3 w-3" /> Awaiting review</span>
    : s === "verified"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Verified</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"><AlertTriangle className="h-3 w-3" /> Rejected</span>;

  const stat = (label: string, value: number, cls: string, key: typeof tab) => (
    <button onClick={() => setTab(key)} className={`rounded-2xl border p-4 text-left shadow-soft transition ${tab === key ? "border-india-green ring-2 ring-india-green/20" : "border-border"} bg-card`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${cls}`}>{value}</p>
    </button>
  );

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<FileUp className="h-5 w-5" />} title="Doc Requests"
          subtitle="Request documents from live retailers and verify what they upload." />

        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat("Awaiting upload", stats.requested, "text-amber-600", "requested")}
          {stat("Awaiting review", stats.uploaded, "text-sky-600", "uploaded")}
          {stat("Verified", stats.verified, "text-emerald-600", "verified")}
          {stat("Rejected", stats.rejected, "text-rose-600", "rejected")}
        </div>

        {/* new request */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Send className="h-4 w-4 text-india-green" /> Request a document</p>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="relative">
              <label className="text-xs font-semibold text-muted-foreground">Retailer</label>
              {picked ? (
                <div className="flex h-11 items-center justify-between rounded-lg border border-india-green/40 bg-india-green/5 px-3 text-sm">
                  <span className="truncate font-semibold">{picked.full_name || picked.application_id}<span className="ml-2 text-[11px] font-normal text-muted-foreground">{picked.jsko_id || picked.application_id}</span></span>
                  <button className="text-xs font-semibold text-rose-600" onClick={() => setPicked(null)}>change</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, JSKO ID, application ID, mobile…"
                      className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                  </div>
                  {(hits.length > 0 || searching) && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                      {searching ? <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div> :
                        hits.map((h) => (
                          <button key={h.user_id} onClick={() => { setPicked(h); setHits([]); }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                            <span className="font-semibold">{h.full_name || "—"}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground">{[h.jsko_id || h.application_id, h.mobile, h.reg_status].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Document</label>
              {docKey ? (
                <div className="flex h-11 items-center justify-between rounded-lg border border-india-green/40 bg-india-green/5 px-3 text-sm">
                  <span className="font-semibold">{pickedDocs.find((d) => d.doc_key === docKey)?.doc_label}</span>
                  <button className="text-xs font-semibold text-rose-600" onClick={() => setDocKey(null)}>change</button>
                </div>
              ) : (
                <>
                  <select value={docLabel} onChange={(e) => setDocLabel(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
                    {DOC_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {docLabel === "Other" && (
                    <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Document name"
                      className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                  )}
                </>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Note to the retailer (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Latest copy, all corners visible"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
            </div>
          </div>
          {picked && pickedDocs.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-bold text-muted-foreground">Documents on file for {picked.full_name || picked.application_id} — pick one to request a re-upload:</p>
              <div className="flex flex-wrap gap-2">
                {pickedDocs.map((d) => (
                  <div key={d.doc_key} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${docKey === d.doc_key ? "border-india-green bg-india-green/10" : "border-border bg-card"}`}>
                    <span className="font-semibold">{d.doc_label}</span>
                    {d.path
                      ? <button className="text-sky-600 hover:underline" onClick={() => viewPath(d.path)}>view</button>
                      : <span className="text-muted-foreground">none</span>}
                    <button className="rounded bg-india-green px-1.5 py-0.5 font-semibold text-white" onClick={() => setDocKey(d.doc_key)}>request</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={sendRequest} disabled={sending} className="mt-3 bg-india-green text-white">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
          </Button>
        </div>

        {/* table */}
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("all")} className={`rounded-lg px-3 h-9 text-xs font-semibold ${tab === "all" ? "bg-india-green text-white shadow-soft" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}>All</button>
          <Button variant="outline" className="ml-auto h-9" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Retailer Name</th>
                <th className="px-4 py-3">JSKO ID</th>
                <th className="px-4 py-3">Application ID</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested on</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No {tab === "all" ? "" : tab + " "}requests.</td></tr>
              ) : visible.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 whitespace-nowrap">
                  <td className="px-4 py-3 font-semibold">{r.requester_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.jsko_id ? "bg-india-green text-white" : "bg-muted text-muted-foreground"}`}>{r.jsko_id?.trim() || "Nill"}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.application_id || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{r.doc_label}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-xs text-muted-foreground" title={r.note ?? undefined}>{r.note || "—"}</td>
                  <td className="px-4 py-3">{chip(r.status)}{r.status === "rejected" && r.remarks ? <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-muted-foreground" title={r.remarks}>{r.remarks}</p> : null}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.old_path && r.status !== "verified" && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => viewPath(r.old_path)}>
                          <Eye className="h-3.5 w-3.5" /> Old doc
                        </Button>
                      )}
                      {r.file_path && (
                        <Button size="sm" variant="outline" className="h-8 border-sky-300 text-sky-700" onClick={() => viewFile(r)}>
                          <Eye className="h-3.5 w-3.5" /> {r.old_path && r.status !== "verified" ? "New doc" : "View"}
                        </Button>
                      )}
                      {r.status === "uploaded" && (
                        <>
                          <Button size="sm" onClick={() => review(r, true)} disabled={acting === r.id} className="h-8 bg-india-green text-white">
                            {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => review(r, false)} disabled={acting === r.id} className="h-8 text-rose-600">
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </QcShell>
  );
}
