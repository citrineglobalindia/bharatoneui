import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock3, Download, FileCheck2, FileText, Flag,
  MessageSquarePlus, Paperclip, PauseCircle, Search, ShieldCheck, Trash2, Upload,
  UserRound, XCircle, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Outcome = "Pending" | "Approved" | "On hold" | "Rejected";
type Risk = "Low" | "Medium" | "High";
type DocState = "Verified" | "Unclear" | "Missing";

type Comment = { id: string; author: string; text: string; at: string };
type Evidence = { id: string; name: string; size: string; at: string };
type Doc = { label: string; state: DocState };

type Applicant = {
  id: string; name: string; shop: string; phone: string; district: string; taluk: string;
  pan: string; aadhaar: string; gst: string; risk: Risk; outcome: Outcome; submitted: string;
  reviewer: string; docs: Doc[]; comments: Comment[]; evidence: Evidence[];
};

const KPI: { label: string; key: Outcome | "all" | "high"; value: number; icon: LucideIcon; tone: string }[] = [
  { label: "Pending review", key: "Pending", value: 0, icon: Clock3, tone: "bg-admin-warning-soft text-admin-warning" },
  { label: "Approved today", key: "Approved", value: 0, icon: CheckCircle2, tone: "bg-admin-success-soft text-admin-success" },
  { label: "On hold", key: "On hold", value: 0, icon: PauseCircle, tone: "bg-admin-soft text-admin" },
  { label: "High risk", key: "high", value: 0, icon: AlertTriangle, tone: "bg-admin-danger-soft text-admin-danger" },
];

const RISK_TONE: Record<Risk, string> = {
  Low: "bg-admin-success-soft text-admin-success",
  Medium: "bg-admin-warning-soft text-admin-warning",
  High: "bg-admin-danger-soft text-admin-danger",
};
const OUTCOME_TONE: Record<Outcome, string> = {
  Pending: "bg-admin-warning-soft text-admin-warning",
  Approved: "bg-admin-success-soft text-admin-success",
  "On hold": "bg-admin-soft text-admin",
  Rejected: "bg-admin-danger-soft text-admin-danger",
};
const DOC_TONE: Record<DocState, string> = {
  Verified: "bg-admin-success-soft text-admin-success",
  Unclear: "bg-admin-warning-soft text-admin-warning",
  Missing: "bg-admin-danger-soft text-admin-danger",
};

const mkDocs = (states: DocState[]): Doc[] =>
  ["Aadhaar", "PAN", "GST certificate", "Shop photo", "Bank proof", "Selfie / Video KYC"].map((label, i) => ({ label, state: states[i] ?? "Missing" }));

const SEED: Applicant[] = [
  { id: "KYC-8841", name: "Ramesh Kumar", shop: "Sri Sai Digital", phone: "9876789876", district: "Bengaluru Urban", taluk: "Anekal", pan: "ABCPR1234K", aadhaar: "XXXX-XXXX-4821", gst: "29ABCPR1234K1Z5", risk: "Low", outcome: "Pending", submitted: "Today 11:02", reviewer: "Priya Nair", docs: mkDocs(["Verified","Verified","Verified","Verified","Verified","Verified"]), comments: [], evidence: [] },
  { id: "KYC-8840", name: "Lakshmi Stores", shop: "Lakshmi Seva Kendra", phone: "9810334455", district: "Bengaluru Urban", taluk: "Devanahalli", pan: "AAGCL8821M", aadhaar: "XXXX-XXXX-1190", gst: "29AAGCL8821M1Z2", risk: "Medium", outcome: "Pending", submitted: "Today 10:31", reviewer: "Unassigned", docs: mkDocs(["Verified","Verified","Unclear","Verified","Missing","Verified"]), comments: [{ id: "c1", author: "System", text: "GST certificate image is low resolution.", at: "Today 10:33" }], evidence: [] },
  { id: "KYC-8839", name: "Suresh Babu", shop: "Suresh e-Mitra", phone: "9840667788", district: "Bengaluru Urban", taluk: "Yelahanka", pan: "AKLPS9090Q", aadhaar: "XXXX-XXXX-7765", gst: "—", risk: "High", outcome: "On hold", submitted: "Today 09:50", reviewer: "Arjun Rao", docs: mkDocs(["Verified","Unclear","Missing","Verified","Missing","Unclear"]), comments: [{ id: "c2", author: "Arjun Rao", text: "Name mismatch between PAN and bank proof. Held for re-submission.", at: "Today 09:58" }], evidence: [{ id: "e1", name: "name-mismatch.png", size: "248 KB", at: "Today 09:57" }] },
  { id: "KYC-8838", name: "Vijaya Digital", shop: "VS Online", phone: "9912345678", district: "Bengaluru Urban", taluk: "Hoskote", pan: "ABVPV4567H", aadhaar: "XXXX-XXXX-3321", gst: "29ABVPV4567H1Z9", risk: "Low", outcome: "Approved", submitted: "Today 09:12", reviewer: "Priya Nair", docs: mkDocs(["Verified","Verified","Verified","Verified","Verified","Verified"]), comments: [{ id: "c3", author: "Priya Nair", text: "All documents verified. Approved.", at: "Today 09:20" }], evidence: [] },
  { id: "KYC-8837", name: "Kaveri Mart", shop: "Kaveri Digital", phone: "9123456780", district: "Bengaluru Urban", taluk: "Anekal", pan: "AAKCK2210L", aadhaar: "XXXX-XXXX-5567", gst: "29AAKCK2210L1Z1", risk: "Medium", outcome: "Pending", submitted: "Today 08:44", reviewer: "Arjun Rao", docs: mkDocs(["Verified","Verified","Verified","Unclear","Verified","Missing"]), comments: [], evidence: [] },
  { id: "KYC-8836", name: "Namma Center", shop: "Namma One Center", phone: "9800223344", district: "Bengaluru Urban", taluk: "Mandya", pan: "AAFCN1102P", aadhaar: "XXXX-XXXX-8890", gst: "29AAFCN1102P1Z7", risk: "High", outcome: "Rejected", submitted: "Yesterday 17:20", reviewer: "Arjun Rao", docs: mkDocs(["Unclear","Missing","Missing","Missing","Missing","Missing"]), comments: [{ id: "c4", author: "Arjun Rao", text: "Forged Aadhaar detected. Rejected and flagged to fraud desk.", at: "Yesterday 17:40" }], evidence: [{ id: "e2", name: "fraud-report.pdf", size: "1.2 MB", at: "Yesterday 17:38" }] },
];

const now = () => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date());

export function KycWorkflow() {
  const [apps, setApps] = useState<Applicant[]>(SEED);
  const [tab, setTab] = useState<"All" | Outcome>("All");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(SEED[0].id);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => ({
    Pending: apps.filter((a) => a.outcome === "Pending").length,
    Approved: apps.filter((a) => a.outcome === "Approved").length,
    "On hold": apps.filter((a) => a.outcome === "On hold").length,
    high: apps.filter((a) => a.risk === "High").length,
  }), [apps]);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return apps.filter((a) => {
      const matchTab = tab === "All" || a.outcome === tab;
      const matchQ = !t || `${a.id} ${a.name} ${a.shop} ${a.phone} ${a.pan}`.toLowerCase().includes(t);
      return matchTab && matchQ;
    });
  }, [apps, tab, query]);

  const active = apps.find((a) => a.id === activeId) ?? filtered[0] ?? apps[0];

  const update = (id: string, patch: Partial<Applicant>) =>
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));

  const setOutcome = (outcome: Outcome) => {
    if (!active) return;
    const note: Comment = { id: crypto.randomUUID(), author: "Super Admin", text: draft.trim() || `Marked as ${outcome.toLowerCase()}.`, at: `Today ${now()}` };
    update(active.id, { outcome, comments: [...active.comments, note] });
    setDraft("");
    toast.success(`${active.id} ${outcome.toLowerCase()}`);
  };

  const addComment = () => {
    if (!active || !draft.trim()) return;
    update(active.id, { comments: [...active.comments, { id: crypto.randomUUID(), author: "Super Admin", text: draft.trim(), at: `Today ${now()}` }] });
    setDraft("");
    toast.success("Comment added");
  };

  const onFiles = (files: FileList | null) => {
    if (!active || !files?.length) return;
    const added: Evidence[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(), name: f.name,
      size: f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
      at: `Today ${now()}`,
    }));
    update(active.id, { evidence: [...active.evidence, ...added] });
    toast.success(`${added.length} file${added.length > 1 ? "s" : ""} attached`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeEvidence = (eid: string) => {
    if (!active) return;
    update(active.id, { evidence: active.evidence.filter((e) => e.id !== eid) });
  };

  const cycleDoc = (label: string) => {
    if (!active) return;
    const order: DocState[] = ["Verified", "Unclear", "Missing"];
    update(active.id, { docs: active.docs.map((d) => d.label === label ? { ...d, state: order[(order.indexOf(d.state) + 1) % order.length] } : d) });
  };

  const exportQueue = () => {
    downloadCsv("kyc-workflow.csv", ["ID", "Applicant", "Shop", "Phone", "PAN", "Risk", "Outcome", "Reviewer", "Submitted"],
      apps.map((a) => [a.id, a.name, a.shop, a.phone, a.pan, a.risk, a.outcome, a.reviewer, a.submitted]));
    toast.success("KYC queue exported");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((k) => { const Icon = k.icon; const value = k.key === "high" ? counts.high : counts[k.key as keyof typeof counts]; return (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", k.tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{value}</p>
          </div>
        ); })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList><TabsTrigger value="All">All</TabsTrigger><TabsTrigger value="Pending">Pending</TabsTrigger><TabsTrigger value="On hold">On hold</TabsTrigger><TabsTrigger value="Approved">Approved</TabsTrigger><TabsTrigger value="Rejected">Rejected</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportQueue}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,.95fr)_minmax(0,1.4fr)]">
        {/* Queue */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Application queue · {filtered.length}</div>
          <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {filtered.map((a) => (
              <button key={a.id} onClick={() => setActiveId(a.id)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/30", active?.id === a.id && "bg-admin-soft/40")}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted font-display text-[11px] font-extrabold">{a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold">{a.name}</p><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[8px] font-extrabold", OUTCOME_TONE[a.outcome])}>{a.outcome}</span></div>
                  <p className="truncate text-[10px] text-muted-foreground">{a.shop} · {a.id}</p>
                  <div className="mt-1 flex items-center gap-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-extrabold", RISK_TONE[a.risk])}>{a.risk} risk</span><span className="text-[9px] text-muted-foreground">{a.submitted}</span></div>
                </div>
              </button>
            ))}
            {!filtered.length && <p className="px-4 py-16 text-center text-xs text-muted-foreground">No applications match.</p>}
          </div>
        </div>

        {/* Detail */}
        {active && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-admin font-display text-sm font-extrabold text-admin-foreground">{active.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div><p className="font-display text-lg font-extrabold tracking-tight">{active.name}</p><p className="text-[11px] text-muted-foreground">{active.shop} · {active.id} · {active.taluk}, {active.district}</p></div></div>
                <div className="flex flex-wrap gap-2"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", RISK_TONE[active.risk])}>{active.risk} risk</span><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", OUTCOME_TONE[active.outcome])}>{active.outcome}</span></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[["Phone", active.phone], ["PAN", active.pan], ["Aadhaar", active.aadhaar], ["GST", active.gst], ["Reviewer", active.reviewer], ["Submitted", active.submitted]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-muted/50 px-2.5 py-2"><p className="text-[8px] font-bold uppercase text-muted-foreground">{l}</p><p className="truncate text-[11px] font-bold">{v}</p></div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
              <div className="flex items-center justify-between"><h3 className="flex items-center gap-1.5 text-sm font-extrabold"><FileCheck2 className="h-4 w-4 text-admin" /> Document checklist</h3><span className="text-[9px] text-muted-foreground">Tap a chip to change state</span></div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {active.docs.map((d) => (
                  <button key={d.label} onClick={() => cycleDoc(d.label)} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition hover:bg-muted/50">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{d.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-extrabold", DOC_TONE[d.state])}>{d.state}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence uploads */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Paperclip className="h-4 w-4 text-admin" /> Evidence uploads</h3>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition hover:bg-muted/50">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] font-semibold">Click to attach evidence</span>
                <span className="text-[9px] text-muted-foreground">Screenshots, signed forms, fraud reports (PDF / image)</span>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              </label>
              {active.evidence.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {active.evidence.map((e) => (
                    <li key={e.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-[11px] font-semibold"><FileText className="h-3.5 w-3.5 text-admin" />{e.name}<span className="text-[9px] text-muted-foreground">{e.size} · {e.at}</span></span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-admin-danger" onClick={() => removeEvidence(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reviewer comments */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><MessageSquarePlus className="h-4 w-4 text-admin" /> Reviewer comments</h3>
              <div className="mt-3 space-y-2">
                {active.comments.length ? active.comments.map((c) => (
                  <div key={c.id} className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1 text-[11px] font-bold"><UserRound className="h-3 w-3 text-muted-foreground" />{c.author}</span><span className="text-[9px] text-muted-foreground">{c.at}</span></div>
                    <p className="mt-0.5 text-[11px] text-foreground/80">{c.text}</p>
                  </div>
                )) : <p className="text-[11px] text-muted-foreground">No comments yet.</p>}
              </div>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a reviewer note. This is attached to the outcome you choose below." className="mt-3 min-h-[72px] text-xs" />
              <div className="mt-2 flex justify-end"><Button size="sm" variant="outline" onClick={addComment} disabled={!draft.trim()}><MessageSquarePlus className="h-3.5 w-3.5" /> Add comment</Button></div>
            </div>

            {/* Outcomes */}
            <div className="sticky bottom-0 rounded-2xl border border-border bg-card p-3 shadow-elev">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground"><ShieldCheck className="h-4 w-4 text-admin" /> Decision</span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1 bg-admin-success text-white hover:bg-admin-success/90" onClick={() => setOutcome("Approved")}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-admin" onClick={() => setOutcome("On hold")}><PauseCircle className="h-3.5 w-3.5" /> Hold</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-admin-danger" onClick={() => setOutcome("Rejected")}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-admin-warning" onClick={() => { update(active.id, { risk: "High" }); toast.success(`${active.id} flagged high risk`); }}><Flag className="h-3.5 w-3.5" /> Flag</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
