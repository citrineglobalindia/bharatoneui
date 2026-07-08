import { useEffect, useMemo, useRef, useState } from "react";
import { useSort, SortTh, useColumnFilters, FilterTh } from "@/components/ui/sortable";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogOut, RefreshCw, Loader2, FileSearch, IndianRupee, CheckCircle2, Clock3, XCircle, ChevronRight, Upload, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { ApplicationThread } from "@/components/application-thread";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/operator")({
  head: () => ({ meta: [{ title: "Operator — BharatOne" }] }),
  component: OperatorPortal,
});

type App = {
  id: string; application_no: string; category_name: string; service_name: string;
  full_name: string; father_name: string | null; gender: string | null; email: string | null; phone: string | null;
  address: string | null; aadhaar_number: string | null; pan_number: string | null;
  service_charge: number; commission_price: number; status: string; submitter_name: string | null; submitted_by: string | null; created_at: string;
  result_doc_path: string | null; result_note: string | null; result_uploaded_at: string | null;
  form_data: Record<string, any> | null;
  reupload_requested: boolean; reupload_note: string | null; reupload_path: string | null; reupload_name: string | null;
};
const STAGES = ["submitted", "on_process", "waiting_approval", "on_delay", "completed", "rejected"];
const label: Record<string, string> = { submitted: "New", on_process: "On Process", in_progress: "On Process", waiting_approval: "Waiting for Approval", on_delay: "On Delay", approved: "Waiting for Approval", completed: "Completed", rejected: "Rejected" };
const tone: Record<string, string> = { submitted: "bg-saffron/10 text-saffron", on_process: "bg-amber-500/10 text-amber-600", in_progress: "bg-amber-500/10 text-amber-600", waiting_approval: "bg-sky-500/10 text-sky-600", on_delay: "bg-orange-600/10 text-orange-700", approved: "bg-sky-500/10 text-sky-600", completed: "bg-india-green/10 text-india-green", rejected: "bg-rose-500/10 text-rose-600" };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

async function dlAppFile(path: string) {
  const { data } = await supabase.storage.from("application-files").createSignedUrl(path, 3600);
  if (data) window.open(data.signedUrl, "_blank");
}


function OperatorPortal() {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<App | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [reqNote, setReqNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await supabase.from("service_applications")
        .select("*").order("created_at", { ascending: false });
      setApps((data as App[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Detail overlay always opens scrolled to the very top (no auto-scroll to chat).
  const detailRef = useRef<HTMLDivElement>(null);

  // "Submitted From" — the JSKO/retailer who submitted the application.
  const [submitter, setSubmitter] = useState<{ jskoId: string; name: string; phone: string } | null>(null);
  useEffect(() => {
    const by = sel?.submitted_by;
    if (!by) { setSubmitter(null); return; }
    let on = true;
    (async () => {
      // Preferred: a SECURITY DEFINER RPC that returns the submitter's JSKO ID /
      // name / phone (operator RLS can't read the submitter's profile directly).
      const { data: info, error } = await supabase.rpc("application_submitter_info", { p_app: sel!.id });
      if (!on) return;
      if (!error && info) {
        const i = info as any;
        setSubmitter({
          jskoId: i.jsko_id || "—",
          name: i.name || sel?.submitter_name || "—",
          phone: i.phone || "—",
        });
        return;
      }
      // Fallback (RLS-limited) until the RPC is present.
      const [{ data: prof }, { data: reg }] = await Promise.all([
        supabase.from("profiles").select("display_name, phone").eq("id", by).maybeSingle(),
        supabase.from("retailer_registrations").select("jsko_id, application_id, mobile").eq("auth_user_id", by).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!on) return;
      setSubmitter({
        jskoId: (reg as any)?.jsko_id || (reg as any)?.application_id || "—",
        name: sel?.submitter_name || (prof as any)?.display_name || "—",
        phone: (prof as any)?.phone || (reg as any)?.mobile || "—",
      });
    })();
    return () => { on = false; };
  }, [sel?.submitted_by, sel?.submitter_name]);

  // Reset the detail overlay to the top whenever a new application is opened.
  useEffect(() => {
    if (sel) requestAnimationFrame(() => detailRef.current?.scrollTo({ top: 0 }));
  }, [sel?.id]);

  const counts = useMemo(() => ({
    all: apps.length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    in_progress: apps.filter((a) => ["on_process", "in_progress"].includes(a.status)).length,
    done: apps.filter((a) => a.status === "completed").length,
    commission: apps.filter((a) => a.status === "completed").reduce((s, a) => s + Number(a.commission_price || 0), 0),
  }), [apps]);
  const filtered = useMemo(() => filter === "all" ? apps : apps.filter((a) => a.status === filter), [apps, filter]);
  const acc = (a: any, key: string) => {
    switch (key) {
      case "app": return a.application_no || "";
      case "retailer": return a.submitter_name || "";
      case "applicant": return a.full_name || "";
      case "service": return a.service_name || "";
      case "charge": return Number(a.service_charge || 0);
      case "status": return a.status || "";
      default: return "";
    }
  };
  const cf = useColumnFilters<any>();
  const colFiltered = useMemo(() => cf.apply(filtered, acc), [filtered, cf.filters]);
  const { sorted, sort, toggle } = useSort(colFiltered, acc);

  const setStatus = async (a: App, status: string) => {
    setSaving(true);
    const { error } = await supabase.from("service_applications").update({ status }).eq("id", a.id);
    setSaving(false);
    if (error) return toast.error("Update failed", { description: error.message });
    toast.success(`Marked ${label[status]}`);
    setApps((p) => p.map((x) => x.id === a.id ? { ...x, status } : x));
    setSel((s) => s && s.id === a.id ? { ...s, status } : s);
  };
  const logout = () => { try { localStorage.removeItem("bharatone:auth"); } catch {} void supabase.auth.signOut(); navigate({ to: "/login" }); };

  const uploadAttachment = async (a: App, file: File) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const path = `${a.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("service-attachments").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      const { error: uErr } = await supabase.from("service_applications").update({ result_doc_path: path, result_uploaded_at: new Date().toISOString() }).eq("id", a.id);
      if (uErr) { toast.error("Save failed", { description: uErr.message }); return; }
      toast.success("Attachment added");
      setApps((p) => p.map((x) => x.id === a.id ? { ...x, result_doc_path: path, result_uploaded_at: new Date().toISOString() } : x));
      setSel((s2) => s2 && s2.id === a.id ? { ...s2, result_doc_path: path } : s2);
    } finally { setUploading(false); }
  };
  const viewAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("service-attachments").createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Could not open attachment"); return; }
    window.open(data.signedUrl, "_blank");
  };
  const requestReupload = async (a: App) => {
    setSaving(true);
    const { error } = await supabase.rpc("request_document_reupload", { _app: a.id, _note: reqNote || null });
    setSaving(false);
    if (error) return toast.error("Could not request", { description: error.message });
    toast.success("Re-upload requested — the retailer has been notified");
    setApps((p) => p.map((x) => x.id === a.id ? { ...x, reupload_requested: true, reupload_note: reqNote || null } : x));
    setSel((s2) => s2 && s2.id === a.id ? { ...s2, reupload_requested: true, reupload_note: reqNote || null } : s2);
    setReqNote("");
  };
  const saveNote = async (a: App) => {
    const { error } = await supabase.from("service_applications").update({ result_note: note }).eq("id", a.id);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Note saved");
    setApps((p) => p.map((x) => x.id === a.id ? { ...x, result_note: note } : x));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-5 shadow-soft">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-card p-1 shadow-soft"><BharatOneLogo size="sm" /></span>
          <div><p className="font-display text-sm font-extrabold">Operator Console</p><p className="text-[11px] text-muted-foreground">Service applications assigned to you</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-1"><span className="grid h-8 w-8 place-items-center rounded-lg bg-india-green/10 text-xs font-extrabold text-india-green">{me.initials}</span><div className="leading-tight"><p className="text-xs font-bold">{me.name}</p><p className="text-[10px] text-muted-foreground">{me.role || "Operator"}</p></div></div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total", counts.all, FileSearch, "bg-blue-500/10 text-blue-600"], ["New", counts.submitted, Clock3, "bg-saffron/10 text-saffron"], ["On Process", counts.in_progress, Loader2, "bg-amber-500/10 text-amber-600"], ["Commission Earned", inr(counts.commission), IndianRupee, "bg-india-green/10 text-india-green"]].map(([l, v, Icon, t]: any, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[["all", "All"], ["submitted", "New"], ["on_process", "On Process"], ["waiting_approval", "Waiting for Approval"], ["on_delay", "On Delay"], ["completed", "Completed"], ["rejected", "Rejected"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${filter === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>
          ))}
        </div>

        {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No applications {filter !== "all" ? `(${label[filter] ?? filter})` : ""} assigned to you yet.</div>
          : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><SortTh className="px-3 py-2" label="Application ID" sortKey="app" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Retailer" sortKey="retailer" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Applicant" sortKey="applicant" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Service" sortKey="service" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Charge" sortKey="charge" sort={sort} onSort={toggle} /><SortTh className="px-3 py-2" label="Status" sortKey="status" sort={sort} onSort={toggle} /><th className="px-3 py-2 text-right">Action</th></tr>
                <tr className="bg-muted/30">
                  <FilterTh className="px-2 pb-2" filterKey="app" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <FilterTh className="px-2 pb-2" filterKey="retailer" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <FilterTh className="px-2 pb-2" filterKey="applicant" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <FilterTh className="px-2 pb-2" filterKey="service" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <FilterTh className="px-2 pb-2" filterKey="charge" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <FilterTh className="px-2 pb-2" filterKey="status" filters={cf.filters} setFilter={cf.setFilter} optionsFor={cf.optionsFor} />
                  <th className="px-2 pb-2" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{a.application_no}</td>
                    <td className="px-3 py-2"><span className="text-xs font-medium">{a.submitter_name || "—"}</span></td>
                    <td className="px-3 py-2"><div className="font-semibold">{a.full_name}</div><div className="text-[11px] text-muted-foreground">{a.phone}</div></td>
                    <td className="px-3 py-2"><div className="font-medium">{a.service_name}</div><div className="text-[11px] text-muted-foreground">{a.category_name}</div></td>
                    <td className="px-3 py-2">{inr(a.service_charge)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[a.status] ?? "bg-muted"}`}>{label[a.status] ?? a.status}</span></td>
                    <td className="px-3 py-2 text-right"><button onClick={() => { setSel(a); setNote(a.result_note ?? ""); setReqNote(""); }} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">Open <ChevronRight className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {sel && (
        <div ref={detailRef} className="fixed inset-0 z-30 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-soft sm:px-6">
            <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-india-green">
              <ChevronRight className="h-4 w-4 rotate-180" /> Back
            </button>
            <span className="font-mono text-xs font-bold text-muted-foreground">{sel.application_no}</span>
          </div>
          <div className="mx-auto max-w-4xl p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-xs font-bold text-muted-foreground">{sel.application_no}</p><p className="font-display text-lg font-extrabold">{sel.service_name}</p><p className="text-sm text-muted-foreground">{sel.category_name}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[sel.status] ?? "bg-muted"}`}>{label[sel.status] ?? sel.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[["Full Name", sel.full_name], ["Father's Name", sel.father_name], ["Gender", sel.gender], ["Phone", sel.phone], ["Email", sel.email], ["Aadhaar", sel.aadhaar_number], ["PAN", sel.pan_number], ["Submitted by", sel.submitter_name]].map(([l, v]) => (
                <div key={l as string}><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="font-medium">{v || "—"}</p></div>
              ))}
              <div className="col-span-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</p><p className="font-medium">{sel.address || "—"}</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-india-green/30 bg-india-green/5 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Submitted From</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">JSKO ID</p><p className="font-medium">{submitter?.jskoId || "—"}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">JSKO Name</p><p className="font-medium">{submitter?.name || sel.submitter_name || "—"}</p></div>
                <div className="col-span-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contact Number</p><p className="font-medium">{submitter?.phone || "—"}</p></div>
              </div>
            </div>
            {sel.form_data && Object.keys(sel.form_data).length > 0 && (
              <div className="mt-3 rounded-lg border border-border p-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Submitted form</p>
                <div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(sel.form_data).map(([k, v]: any) => (<div key={k}><p className="text-[11px] text-muted-foreground">{k}</p>{v && typeof v === "object" && v.__file ? <button onClick={() => dlAppFile(v.__file)} className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-india-green hover:bg-muted"><Download className="h-3.5 w-3.5" /> {v.name || "Download"}</button> : <p className="font-medium break-words">{String(v)}</p>}</div>))}</div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span>Total cost <b>{inr(sel.service_charge)}</b></span><span className="text-india-green">Retailer commission <b>{inr(sel.commission_price)}</b></span></div>
            <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Paperclip className="h-3.5 w-3.5" /> Return attachment</p>
            <div className="flex flex-wrap items-center gap-2">
              {sel.result_doc_path && <button onClick={() => viewAttachment(sel.result_doc_path!)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> View current</button>}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white hover:bg-india-green/90">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {sel.result_doc_path ? "Replace file" : "Upload file"}
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAttachment(sel, e.target.files[0])} />
              </label>
            </div>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the retailer (optional)" className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
            <button onClick={() => saveNote(sel)} className="mt-1 text-xs font-semibold text-india-green hover:underline">Save note</button>

            <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Upload className="h-3.5 w-3.5" /> Document re-upload</p>
            {sel.reupload_path && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-india-green/30 bg-india-green/5 px-3 py-2">
                <span className="flex items-center gap-1.5 truncate text-sm font-semibold"><Paperclip className="h-4 w-4 text-india-green shrink-0" /> <span className="truncate">{sel.reupload_name || "Re-uploaded document"}</span></span>
                <button onClick={() => dlAppFile(sel.reupload_path!)} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> View</button>
              </div>
            )}
            {sel.reupload_requested
              ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Re-upload requested — waiting for the retailer to upload.</p>
              : <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="What should they re-upload? (optional)" className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                  <Button size="sm" disabled={saving} onClick={() => requestReupload(sel)} variant="outline" className="text-amber-700"><Upload className="h-4 w-4" /> Ask retailer to re-upload</Button>
                </div>}

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Update status</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "on_process")} className="bg-amber-500 text-white hover:bg-amber-600"><Loader2 className="h-4 w-4" /> On Process</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "waiting_approval")} className="bg-sky-600 text-white hover:bg-sky-700"><Clock3 className="h-4 w-4" /> Waiting for Approval</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "on_delay")} className="bg-orange-600 text-white hover:bg-orange-700"><Clock3 className="h-4 w-4" /> On Delay</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "completed")} className="bg-india-green text-white hover:bg-india-green/90"><CheckCircle2 className="h-4 w-4" /> Completed</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "rejected")} variant="outline" className="text-rose-600"><XCircle className="h-4 w-4" /> Reject</Button>
            </div>
            <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chat with retailer</p>
              <ApplicationThread applicationId={sel.id} title="Chat with retailer" />
            </div>
            <div className="mt-4 text-right"><button onClick={() => setSel(null)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
