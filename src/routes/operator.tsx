import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogOut, RefreshCw, Loader2, FileSearch, IndianRupee, CheckCircle2, Clock3, XCircle, ChevronRight, Upload, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/operator")({
  head: () => ({ meta: [{ title: "Operator — BharatOne" }] }),
  component: OperatorPortal,
});

type App = {
  id: string; application_no: string; category_name: string; service_name: string;
  full_name: string; father_name: string | null; gender: string | null; email: string | null; phone: string | null;
  address: string | null; aadhaar_number: string | null; pan_number: string | null;
  service_charge: number; commission_price: number; status: string; submitter_name: string | null; created_at: string;
  result_doc_path: string | null; result_note: string | null; result_uploaded_at: string | null;
};
const STAGES = ["submitted", "in_progress", "approved", "rejected", "completed"];
const label: Record<string, string> = { submitted: "New", in_progress: "In Progress", approved: "Approved", rejected: "Rejected", completed: "Completed" };
const tone: Record<string, string> = { submitted: "bg-saffron/10 text-saffron", in_progress: "bg-amber-500/10 text-amber-600", approved: "bg-india-green/10 text-india-green", completed: "bg-india-green/10 text-india-green", rejected: "bg-rose-500/10 text-rose-600" };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function OperatorPortal() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<App | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");

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

  const counts = useMemo(() => ({
    all: apps.length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    in_progress: apps.filter((a) => a.status === "in_progress").length,
    done: apps.filter((a) => ["approved", "completed"].includes(a.status)).length,
    commission: apps.filter((a) => ["approved", "completed"].includes(a.status)).reduce((s, a) => s + Number(a.commission_price || 0), 0),
  }), [apps]);
  const filtered = useMemo(() => filter === "all" ? apps : apps.filter((a) => a.status === filter), [apps, filter]);

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
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total", counts.all, FileSearch, "bg-blue-500/10 text-blue-600"], ["New", counts.submitted, Clock3, "bg-saffron/10 text-saffron"], ["In Progress", counts.in_progress, Loader2, "bg-amber-500/10 text-amber-600"], ["Commission Earned", inr(counts.commission), IndianRupee, "bg-india-green/10 text-india-green"]].map(([l, v, Icon, t]: any, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[["all", "All"], ["submitted", "New"], ["in_progress", "In Progress"], ["approved", "Approved"], ["completed", "Completed"], ["rejected", "Rejected"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${filter === k ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>{l}</button>
          ))}
        </div>

        {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No applications {filter !== "all" ? `(${label[filter] ?? filter})` : ""} assigned to you yet.</div>
          : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Application ID</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Applicant</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{a.application_no}</td>
                    <td className="px-3 py-2"><span className="text-xs font-medium">{a.submitter_name || "—"}</span></td>
                    <td className="px-3 py-2"><div className="font-semibold">{a.full_name}</div><div className="text-[11px] text-muted-foreground">{a.phone}</div></td>
                    <td className="px-3 py-2"><div className="font-medium">{a.service_name}</div><div className="text-[11px] text-muted-foreground">{a.category_name}</div></td>
                    <td className="px-3 py-2">{inr(a.service_charge)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[a.status] ?? "bg-muted"}`}>{label[a.status] ?? a.status}</span></td>
                    <td className="px-3 py-2 text-right"><button onClick={() => { setSel(a); setNote(a.result_note ?? ""); }} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">Open <ChevronRight className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {sel && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
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

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Update status</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "in_progress")} className="bg-amber-500 text-white hover:bg-amber-600"><Loader2 className="h-4 w-4" /> In Progress</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "approved")} className="bg-india-green text-white hover:bg-india-green/90"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "completed")} variant="outline"><CheckCircle2 className="h-4 w-4" /> Complete</Button>
              <Button size="sm" disabled={saving} onClick={() => setStatus(sel, "rejected")} variant="outline" className="text-rose-600"><XCircle className="h-4 w-4" /> Reject</Button>
            </div>
            <div className="mt-4 text-right"><button onClick={() => setSel(null)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
