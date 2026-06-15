import { useMemo, useState } from "react";
import {
  ArrowLeft, Boxes, Cable, CheckCircle2, Code2, Cpu, Database, GripVertical,
  KeyRound, Layers, Plug, Plus, Save, Search, Settings2, Trash2, Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ServiceType = "api" | "backend";
type FieldType = "text" | "number" | "email" | "phone" | "select" | "boolean" | "date" | "file" | "secret";

type ServiceField = {
  id: string;
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string;
};

type ApiConfig = {
  baseUrl: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  authType: "none" | "api_key" | "bearer" | "basic" | "oauth2";
  timeoutMs: number;
  retries: number;
};

type BackendConfig = {
  handler: string;
  queue: string;
  concurrency: number;
  idempotent: boolean;
};

type Service = {
  id: string;
  name: string;
  category: string;
  type: ServiceType;
  description: string;
  active: boolean;
  fields: ServiceField[];
  api?: ApiConfig;
  backend?: BackendConfig;
  updated: string;
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Dropdown" },
  { value: "boolean", label: "Toggle" },
  { value: "date", label: "Date" },
  { value: "file", label: "File upload" },
  { value: "secret", label: "Secret / masked" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const toKey = (value: string) => value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "");

const SEED: Service[] = [
  {
    id: uid(), name: "AEPS Withdrawal", category: "Banking", type: "api", active: true,
    description: "Aadhaar enabled payment system cash withdrawal via partner bank gateway.",
    api: { baseUrl: "https://gw.npci.example/aeps/v2", method: "POST", authType: "api_key", timeoutMs: 15000, retries: 2 },
    fields: [
      { id: uid(), label: "Aadhaar Number", key: "aadhaar_number", type: "number", required: true, placeholder: "12 digit UID" },
      { id: uid(), label: "Bank IIN", key: "bank_iin", type: "select", required: true, options: "SBI, HDFC, ICICI, Axis" },
      { id: uid(), label: "Amount", key: "amount", type: "number", required: true, placeholder: "INR" },
    ],
    updated: "2 hours ago",
  },
  {
    id: uid(), name: "Wallet Settlement Engine", category: "Finance", type: "backend", active: true,
    description: "Internal batch reconciliation and ledger posting for retailer wallet settlements.",
    backend: { handler: "settlement.processBatch", queue: "settlements", concurrency: 8, idempotent: true },
    fields: [
      { id: uid(), label: "Batch Window", key: "batch_window", type: "select", required: true, options: "Hourly, Daily, Weekly" },
      { id: uid(), label: "Auto-post Ledger", key: "auto_post", type: "boolean", required: false },
    ],
    updated: "yesterday",
  },
];

const TYPE_META: Record<ServiceType, { label: string; icon: LucideIcon; tone: string }> = {
  api: { label: "API Integration", icon: Plug, tone: "bg-admin-soft text-admin" },
  backend: { label: "Backend Service", icon: Cpu, tone: "bg-admin-success-soft text-admin-success" },
};

function emptyService(type: ServiceType): Service {
  return {
    id: uid(), name: "", category: "", type, description: "", active: true, fields: [],
    api: type === "api" ? { baseUrl: "", method: "POST", authType: "api_key", timeoutMs: 15000, retries: 1 } : undefined,
    backend: type === "backend" ? { handler: "", queue: "default", concurrency: 4, idempotent: true } : undefined,
    updated: "Just now",
  };
}

export function ServiceCatalogBuilder() {
  const [services, setServices] = useState<Service[]>(SEED);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ServiceType>("all");
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState<Service | null>(null);

  const filtered = useMemo(() => services.filter((s) => {
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  }), [services, typeFilter, query]);

  const startCreate = (type: ServiceType) => { setPicker(false); setDraft(emptyService(type)); };
  const saveDraft = (svc: Service) => {
    setServices((prev) => prev.some((s) => s.id === svc.id) ? prev.map((s) => s.id === svc.id ? { ...svc, updated: "Just now" } : s) : [{ ...svc, updated: "Just now" }, ...prev]);
    toast.success(`Service "${svc.name}" saved`);
    setDraft(null);
  };
  const removeService = (id: string) => { setServices((prev) => prev.filter((s) => s.id !== id)); toast.success("Service removed"); };

  if (draft) return <ServiceEditor service={draft} onCancel={() => setDraft(null)} onSave={saveDraft} />;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total services", value: String(services.length), icon: Boxes },
          { label: "API integrations", value: String(services.filter((s) => s.type === "api").length), icon: Plug },
          { label: "Backend services", value: String(services.filter((s) => s.type === "backend").length), icon: Cpu },
          { label: "Active", value: String(services.filter((s) => s.active).length), icon: Zap },
        ].map((m) => { const Icon = m.icon; return (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{m.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-admin-soft text-admin"><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold">{m.value}</p>
          </div>
        ); })}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(["all", "api", "backend"] as const).map((t) => (
            <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" className={cn(typeFilter === t && "bg-admin text-admin-foreground hover:bg-admin/90")} onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All" : TYPE_META[t].label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-44 bg-transparent text-xs outline-none" placeholder="Search services…" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={() => setPicker(true)}><Plus /> New service</Button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((svc) => { const meta = TYPE_META[svc.type]; const Icon = meta.icon; return (
          <div key={svc.id} className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev">
            <div className="flex items-start justify-between">
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl", meta.tone)}><Icon className="h-5 w-5" /></span>
              <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", svc.active ? "bg-admin-success-soft text-admin-success" : "bg-muted text-muted-foreground")}>{svc.active ? "ACTIVE" : "DRAFT"}</span>
            </div>
            <h3 className="mt-3 font-display text-sm font-extrabold">{svc.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-admin">{meta.label} · {svc.category || "Uncategorized"}</p>
            <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] text-muted-foreground">{svc.description || "No description"}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground"><Layers className="h-3.5 w-3.5" /> {svc.fields.length} field{svc.fields.length === 1 ? "" : "s"} · updated {svc.updated}</div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDraft(svc)}><Settings2 /> Configure</Button>
              <Button variant="outline" size="icon" className="text-admin-danger" onClick={() => removeService(svc.id)}><Trash2 /></Button>
            </div>
          </div>
        ); })}
        {filtered.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">No services match your filters.</div>}
      </section>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create a new service</DialogTitle><DialogDescription>Choose how this service is delivered.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["api", "backend"] as const).map((t) => { const meta = TYPE_META[t]; const Icon = meta.icon; return (
              <button key={t} onClick={() => startCreate(t)} className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition hover:border-admin hover:bg-admin-soft/40">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", meta.tone)}><Icon className="h-5 w-5" /></span>
                <span className="font-display text-sm font-extrabold">{meta.label}</span>
                <span className="text-[11px] text-muted-foreground">{t === "api" ? "Connect to an external provider over HTTP with auth, retries and field mapping." : "Run an internal handler on a queue with concurrency and idempotency controls."}</span>
              </button>
            ); })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceEditor({ service, onCancel, onSave }: { service: Service; onCancel: () => void; onSave: (s: Service) => void }) {
  const [draft, setDraft] = useState<Service>(service);
  const meta = TYPE_META[draft.type];
  const Icon = meta.icon;
  const set = <K extends keyof Service>(key: K, value: Service[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const addField = () => set("fields", [...draft.fields, { id: uid(), label: "", key: "", type: "text", required: false }]);
  const updateField = (id: string, patch: Partial<ServiceField>) => set("fields", draft.fields.map((f) => f.id === id ? { ...f, ...patch, key: patch.label !== undefined ? toKey(patch.label) : f.key } : f));
  const removeField = (id: string) => set("fields", draft.fields.filter((f) => f.id !== id));

  const submit = () => {
    if (!draft.name.trim()) { toast.error("Service name is required"); return; }
    if (draft.fields.some((f) => !f.label.trim())) { toast.error("Every field needs a label"); return; }
    onSave(draft);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel}><ArrowLeft /> Back to catalog</Button>
        <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={submit}><Save /> Save service</Button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl", meta.tone)}><Icon className="h-5 w-5" /></span>
        <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-admin">{meta.label}</p><p className="font-display text-lg font-extrabold">{draft.name || "Untitled service"}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.55fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="text-sm font-extrabold">General</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Service name</Label><Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. PAN Verification" /></div>
              <div className="space-y-1.5"><Label>Category</Label><Input value={draft.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Banking" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="What does this service do?" /></div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"><span className="text-xs font-semibold">Service active</span><Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} /></div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Field builder</h3><p className="text-[10px] text-muted-foreground">Define the inputs retailers fill for this service</p></div><Button variant="outline" size="sm" onClick={addField}><Plus /> Add field</Button></div>
            <div className="mt-4 space-y-3">
              {draft.fields.map((field) => (
                <div key={field.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Field label" className="h-9" />
                      <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v as FieldType })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="Placeholder / hint" className="h-9" />
                      {field.type === "select"
                        ? <Input value={field.options ?? ""} onChange={(e) => updateField(field.id, { options: e.target.value })} placeholder="Comma separated options" className="h-9" />
                        : <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3"><span className="text-[11px] font-semibold text-muted-foreground">key: {field.key || "—"}</span></div>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-admin-danger" onClick={() => removeField(field.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-6"><Switch checked={field.required} onCheckedChange={(v) => updateField(field.id, { required: v })} /><span className="text-[11px] font-semibold">Required</span></div>
                </div>
              ))}
              {draft.fields.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No fields yet. Add your first input field.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {draft.type === "api" && draft.api && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="flex items-center gap-2 text-sm font-extrabold"><Cable className="h-4 w-4 text-admin" /> API integration</h3>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5"><Label>Endpoint URL</Label><Input value={draft.api.baseUrl} onChange={(e) => set("api", { ...draft.api!, baseUrl: e.target.value })} placeholder="https://api.provider.com/v1/..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Method</Label><Select value={draft.api.method} onValueChange={(v) => set("api", { ...draft.api!, method: v as ApiConfig["method"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["GET", "POST", "PUT", "DELETE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Auth</Label><Select value={draft.api.authType} onValueChange={(v) => set("api", { ...draft.api!, authType: v as ApiConfig["authType"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{([["none", "None"], ["api_key", "API key"], ["bearer", "Bearer token"], ["basic", "Basic auth"], ["oauth2", "OAuth 2.0"]] as const).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Timeout (ms)</Label><Input type="number" value={draft.api.timeoutMs} onChange={(e) => set("api", { ...draft.api!, timeoutMs: Number(e.target.value) })} /></div>
                  <div className="space-y-1.5"><Label>Retries</Label><Input type="number" value={draft.api.retries} onChange={(e) => set("api", { ...draft.api!, retries: Number(e.target.value) })} /></div>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-admin-soft/40 p-3 text-[10px] text-muted-foreground"><KeyRound className="mt-0.5 h-3.5 w-3.5 text-admin" /> Credentials are stored as encrypted secrets and never exposed to retailers.</div>
              </div>
            </div>
          )}
          {draft.type === "backend" && draft.backend && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="flex items-center gap-2 text-sm font-extrabold"><Database className="h-4 w-4 text-admin-success" /> Backend service</h3>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5"><Label>Handler</Label><Input value={draft.backend.handler} onChange={(e) => set("backend", { ...draft.backend!, handler: e.target.value })} placeholder="module.functionName" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Queue</Label><Input value={draft.backend.queue} onChange={(e) => set("backend", { ...draft.backend!, queue: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Concurrency</Label><Input type="number" value={draft.backend.concurrency} onChange={(e) => set("backend", { ...draft.backend!, concurrency: Number(e.target.value) })} /></div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"><span className="text-xs font-semibold">Idempotent execution</span><Switch checked={draft.backend.idempotent} onCheckedChange={(v) => set("backend", { ...draft.backend!, idempotent: v })} /></div>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-admin-panel p-5 text-admin-panel-foreground shadow-elev">
            <h3 className="flex items-center gap-2 text-sm font-extrabold"><Code2 className="h-4 w-4" /> Schema preview</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-admin-panel-foreground/5 p-3 text-[10px] leading-relaxed text-admin-panel-foreground/80">{JSON.stringify({ name: draft.name, type: draft.type, fields: draft.fields.map((f) => ({ key: f.key, type: f.type, required: f.required })) }, null, 2)}</pre>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-admin-panel-foreground/55"><CheckCircle2 className="h-3.5 w-3.5 text-admin-success" /> {draft.fields.length} field(s) ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}