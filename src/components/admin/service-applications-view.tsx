import { useEffect, useMemo, useState } from "react";
import { Loader2, FileSearch, RefreshCw, Search, IndianRupee, Clock3, CheckCircle2, UserCog, Download, ChevronRight, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = {
  id: string; application_no: string; category_name: string; service_name: string;
  full_name: string; father_name: string | null; gender: string | null; phone: string | null; email: string | null;
  address: string | null; aadhaar_number: string | null; pan_number: string | null;
  service_charge: number; commission_price: number; status: string; submitter_name: string | null; submitted_by: string | null;
  assigned_operator: string | null; result_doc_path: string | null; result_note: string | null; created_at: string;
  form_data: Record<string, any> | null;
};
const tone: Record<string, string> = {
  submitted: "bg-saffron/10 text-saffron", in_progress: "bg-amber-500/10 text-amber-600",
  on_process: "bg-amber-500/10 text-amber-600", waiting_approval: "bg-sky-500/10 text-sky-600", on_delay: "bg-orange-600/10 text-orange-700",
  approved: "bg-sky-500/10 text-sky-600", completed: "bg-india-green/10 text-india-green",
  rejected: "bg-rose-500/10 text-rose-600",
};
const label: Record<string, string> = { submitted: "New", on_process: "On Process", in_progress: "On Process", waiting_approval: "Waiting for Approval", on_delay: "On Delay", approved: "Waiting for Approval", rejected: "Rejected", completed: "Completed" };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

async function openDoc(path: string) {
  const { data } = await supabase.storage.from("service-attachments").createSignedUrl(path, 3600);
  if (data) window.open(data.signedUrl, "_blank");
}

async function dlAppFile(path: string) {
  const { data } = await supabase.storage.from("application-files").createSignedUrl(path, 3600);
  if (data) window.open(data.signedUrl, "_blank");
}


export function ServiceApplicationsView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [ops, setOps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [opFilter, setOpFilter] = useState("all");
  const [sel, setSel] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitter, setSubmitter] = useState<{ jskoId: string; name: string; phone: string } | null>(null);
  const [opInfo, setOpInfo] = useState<Record<string, { name: string; phone: string; email: string }>>({});
  const [operators, setOperators] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [transferOp, setTransferOp] = useState("");
  const [transferring, setTransferring] = useState(false);

  // "Submitted From" — the JSKO/retailer who submitted the application.
  useEffect(() => {
    const by = sel?.submitted_by;
    if (!by) { setSubmitter(null); return; }
    let on = true;
    (async () => {
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

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [a, u] = await Promise.all([
        supabase.from("service_applications").select("*").order("created_at", { ascending: false }),
        supabase.rpc("admin_list_users"),
      ]);
      setRows((a.data as Row[]) ?? []);
      const m: Record<string, string> = {};
      const info: Record<string, { name: string; phone: string; email: string }> = {};
      const users = ((u.data as any[]) ?? []);
      users.forEach((x) => { const nm = x.display_name || x.email || "User"; m[x.id] = nm; info[x.id] = { name: nm, phone: x.phone || "", email: x.email || "" }; });
      setOps(m); setOpInfo(info);
      // Operators available to receive a transferred application.
      setOperators(users.filter((x) => Array.isArray(x.roles) && x.roles.includes("operator")).map((x) => ({ id: x.id, name: x.display_name || x.email || "Operator", phone: x.phone || "" })));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const updateStatus = async (r: Row, status: string) => {
    setSaving(true);
    const { error } = await supabase.from("service_applications").update({ status }).eq("id", r.id);
    setSaving(false);
    if (error) return toast.error("Update failed", { description: error.message });
    toast.success(`Marked ${label[status] ?? status}`);
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, status } : x));
    setSel((s2) => s2 && s2.id === r.id ? { ...s2, status } : s2);
  };

  const transfer = async () => {
    if (!sel || !transferOp) return;
    setTransferring(true);
    await ensureStaffSession();
    const { error } = await supabase.from("service_applications").update({ assigned_operator: transferOp }).eq("id", sel.id);
    setTransferring(false);
    if (error) return toast.error("Transfer failed", { description: error.message });
    toast.success(`Transferred to ${opInfo[transferOp]?.name || "operator"}`);
    setRows((p) => p.map((x) => x.id === sel.id ? { ...x, assigned_operator: transferOp } : x));
    setSel((s) => s ? { ...s, assigned_operator: transferOp } : s);
    setTransferOp("");
  };

  const opName = (id: string | null) => id ? (ops[id] ?? "Assigned") : "Unassigned";
  const operatorIds = useMemo(() => Array.from(new Set(rows.map((r) => r.assigned_operator).filter(Boolean))) as string[], [rows]);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => ["submitted", "in_progress"].includes(r.status)).length,
    done: rows.filter((r) => ["approved", "completed"].includes(r.status)).length,
    charges: rows.reduce((s, r) => s + Number(r.service_charge || 0), 0),
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (status === "all" || r.status === status) &&
    (opFilter === "all" || r.assigned_operator === opFilter || (opFilter === "none" && !r.assigned_operator)) &&
    (!q || [r.application_no, r.full_name, r.service_name, r.category_name, r.phone, r.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [rows, status, opFilter, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><FileSearch className="h-5 w-5 text-admin" /> Applications</h2>
          <p className="text-sm text-muted-foreground">Every service application, its status, and the operator it's mapped to.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Total", String(stats.total), FileSearch, "bg-blue-500/10 text-blue-600"], ["In Progress", String(stats.pending), Clock3, "bg-amber-500/10 text-amber-600"], ["Completed/Approved", String(stats.done), CheckCircle2, "bg-india-green/10 text-india-green"], ["Total Charges", inr(stats.charges), IndianRupee, "bg-saffron/10 text-saffron"]].map(([l, v, Icon, t]: any, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-60 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search app no, name, service, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>{["submitted", "on_process", "waiting_approval", "on_delay", "completed", "rejected"].map((s) => <option key={s} value={s}>{label[s]}</option>)}
        </select>
        <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value={opFilter} onChange={(e) => setOpFilter(e.target.value)}>
          <option value="all">All operators</option><option value="none">Unassigned</option>
          {operatorIds.map((id) => <option key={id} value={id}>{opName(id)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Application ID</th><th className="px-3 py-2">Retailer</th><th className="px-3 py-2">Applicant</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Mapped Operator</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right"></th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No applications found.</td></tr>
              : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{r.application_no}</td>
                <td className="px-3 py-2"><span className="text-xs font-medium">{r.submitter_name || "—"}</span></td>
                <td className="px-3 py-2"><div className="font-semibold">{r.full_name}</div><div className="text-[11px] text-muted-foreground">{r.phone}</div></td>
                <td className="px-3 py-2"><div className="font-medium">{r.service_name}</div><div className="text-[11px] text-muted-foreground">{r.category_name}</div></td>
                <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 text-xs ${r.assigned_operator ? "text-foreground" : "text-muted-foreground"}`}><UserCog className="h-3.5 w-3.5" /> {opName(r.assigned_operator)}</span></td>
                <td className="px-3 py-2">{inr(r.service_charge)}</td>
                <td className="px-3 py-2 text-india-green">{inr(r.commission_price)}</td>
                <td className="px-3 py-2">{r.result_doc_path ? <button onClick={() => openDoc(r.result_doc_path!)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><Download className="h-3.5 w-3.5" /> File</button> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[r.status] ?? "bg-muted"}`}>{label[r.status] ?? r.status}</span></td>
                <td className="px-3 py-2 text-right"><button onClick={() => setSel(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">View <ChevronRight className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-xs font-bold text-muted-foreground">{sel.application_no}</p><p className="font-display text-lg font-extrabold">{sel.service_name}</p><p className="text-sm text-muted-foreground">{sel.category_name}</p></div>
              <button onClick={() => setSel(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[sel.status] ?? "bg-muted"}`}>{label[sel.status] ?? sel.status}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><UserCog className="h-3.5 w-3.5" /> {opName(sel.assigned_operator)}</span>
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
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Assigned Operator</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</p><p className="font-medium">{opName(sel.assigned_operator)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Phone</p><p className="font-medium">{sel.assigned_operator && opInfo[sel.assigned_operator]?.phone ? opInfo[sel.assigned_operator].phone : "—"}</p></div>
                <div className="col-span-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</p><p className="font-medium break-all">{sel.assigned_operator && opInfo[sel.assigned_operator]?.email ? opInfo[sel.assigned_operator].email : "—"}</p></div>
              </div>
              <div className="mt-3 border-t border-indigo-200 pt-3">
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Transfer to another operator (if the assigned operator is on leave / absent)</p>
                <div className="flex flex-wrap gap-2">
                  <select className="h-9 min-w-[200px] flex-1 rounded-lg border border-border bg-background px-2 text-sm" value={transferOp} onChange={(e) => setTransferOp(e.target.value)}>
                    <option value="">Select an operator…</option>
                    {operators.filter((o) => o.id !== sel.assigned_operator).map((o) => <option key={o.id} value={o.id}>{o.name}{o.phone ? ` · ${o.phone}` : ""}</option>)}
                  </select>
                  <Button size="sm" disabled={!transferOp || transferring} onClick={transfer} className="bg-india-green text-white hover:bg-india-green/90">{transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />} Transfer</Button>
                </div>
              </div>
            </div>

            {sel.form_data && Object.keys(sel.form_data).length > 0 && (
              <div className="mt-3 rounded-lg border border-border p-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Uploaded files & submitted form</p>
                <div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(sel.form_data).map(([k, v]: any) => (<div key={k}><p className="text-[11px] text-muted-foreground">{k}</p>{v && typeof v === "object" && v.__file ? <button onClick={() => dlAppFile(v.__file)} className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-india-green hover:bg-muted"><Download className="h-3.5 w-3.5" /> {v.name || "Download"}</button> : <p className="font-medium break-words">{String(v)}</p>}</div>))}</div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span>Total cost <b>{inr(sel.service_charge)}</b></span><span className="text-india-green">Retailer commission <b>{inr(sel.commission_price)}</b></span></div>
            <div className="mt-4"><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Approve transaction / update status</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={saving} onClick={() => updateStatus(sel, "in_progress")} className="bg-amber-500 text-white hover:bg-amber-600"><Clock3 className="h-4 w-4" /> In Progress</Button>
                <Button size="sm" disabled={saving} onClick={() => updateStatus(sel, "approved")} className="bg-india-green text-white hover:bg-india-green/90"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                <Button size="sm" disabled={saving} onClick={() => updateStatus(sel, "completed")} variant="outline"><CheckCircle2 className="h-4 w-4" /> Complete</Button>
                <Button size="sm" disabled={saving} onClick={() => updateStatus(sel, "rejected")} variant="outline" className="text-rose-600"><XCircle className="h-4 w-4" /> Reject</Button>
              </div>
            </div>
            {sel.result_note && <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm"><b>Operator note:</b> {sel.result_note}</p>}
            {sel.result_doc_path && <button onClick={() => openDoc(sel.result_doc_path!)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><Download className="h-3.5 w-3.5" /> Download returned attachment</button>}
          </div>
        </div>
      )}
    </div>
  );
}
