import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Upload, ExternalLink, Loader2, X, Check, Link2, Server, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FormBuilder, type FormField } from "@/components/admin/form-builder";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type ServiceType = "inlink" | "api" | "backend";
type Service = {
  id: string; name: string; logo_url: string | null; redirect_url: string | null;
  backend_route: string | null; service_type: ServiceType; category: string | null;
  category_id: string | null; is_active: boolean; sort_order: number;
  service_charge: number; company_commission: number; distributor_commission: number;
  dro_commission: number; tro_commission: number; retailer_commission: number;
};
type Cat = { id: string; name: string; is_active: boolean };

const emptyForm = {
  id: "", name: "", logo_url: "", redirect_url: "", backend_route: "", service_type: "inlink" as ServiceType,
  category: "", category_id: "", is_active: true, sort_order: 0, form_schema: [] as FormField[],
  service_charge: 0, company_commission: 0, distributor_commission: 0, dro_commission: 0, tro_commission: 0, retailer_commission: 0,
  api_endpoint: "", api_method: "POST", api_auth_type: "apikey", api_auth_header: "Authorization", api_secret_ref: "", api_notes: "",
};

const TYPE_META: Record<ServiceType, { label: string; icon: React.ReactNode; tone: string }> = {
  inlink: { label: "Inlink (redirect)", icon: <Link2 className="h-3.5 w-3.5" />, tone: "bg-sky-100 text-sky-700" },
  api: { label: "API Integrated", icon: <Plug className="h-3.5 w-3.5" />, tone: "bg-violet-100 text-violet-700" },
  backend: { label: "Backend", icon: <Server className="h-3.5 w-3.5" />, tone: "bg-emerald-100 text-emerald-700" },
};

export function ServicesManager({ categoryId }: { categoryId?: string } = {}) {
  const [rows, setRows] = useState<Service[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let sq = supabase.from("services").select("*").order("sort_order").order("created_at", { ascending: false });
      if (categoryId) sq = sq.eq("category_id", categoryId);
      const [sv, ct] = await Promise.all([
        sq,
        supabase.from("service_categories").select("id,name,is_active").order("sort_order").order("name"),
      ]);
      setRows((sv.data as Service[]) ?? []);
      setCats((ct.data as Cat[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); /* eslint-disable-next-line */ }, [categoryId]);
  useEffect(() => { if (categoryId) setForm((f) => ({ ...f, category_id: categoryId })); /* eslint-disable-next-line */ }, [categoryId]);

  const reset = () => { setForm({ ...emptyForm, category_id: categoryId ?? "" }); setEditing(false); };
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));
  const inr = (n: number) => "\u20b9" + Number(n || 0).toLocaleString("en-IN");
  const commFields: [string, string][] = [["Company","company_commission"],["Distributor","distributor_commission"],["DRO","dro_commission"],["TRO","tro_commission"],["Retailer","retailer_commission"]];
  const charge = Number((form as any).service_charge) || 0;
  const totalPct = commFields.reduce((a, [, k]) => a + (Number((form as any)[k]) || 0), 0);
  const pctOk = charge <= 0 || Math.abs(totalPct - 100) < 0.001;
  const amt = (pct: any) => Math.round((charge * (Number(pct) || 0) / 100) * 100) / 100;

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("service-logos").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Logo upload failed", { description: error.message }); return; }
      set({ logo_url: supabase.storage.from("service-logos").getPublicUrl(path).data.publicUrl });
      toast.success("Logo uploaded");
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    let redirect = form.redirect_url.trim();
    if (form.service_type === "inlink") {
      if (!redirect) { toast.error("Redirect URL is required for an Inlink service"); return; }
      if (!/^https?:\/\//i.test(redirect)) redirect = "https://" + redirect;
    }
    if (form.service_type === "api" && !form.api_endpoint.trim()) { toast.error("API endpoint is required for an API service"); return; }
    if (charge > 0 && !pctOk) { toast.error("Commission split must total 100%", { description: `Currently ${totalPct}%` }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url || null,
        service_type: form.service_type,
        redirect_url: form.service_type === "inlink" ? redirect : (redirect || null),
        backend_route: null,
        form_schema: form.service_type === "backend" ? form.form_schema : [],
        category: (cats.find((c) => c.id === form.category_id)?.name) || form.category || null,
        category_id: form.category_id || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        service_charge: Number(form.service_charge) || 0,
        company_commission: Number(form.company_commission) || 0,
        distributor_commission: Number(form.distributor_commission) || 0,
        dro_commission: Number(form.dro_commission) || 0,
        tro_commission: Number(form.tro_commission) || 0,
        retailer_commission: Number(form.retailer_commission) || 0,
      };
      let serviceId = form.id;
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", form.id);
        if (error) { toast.error("Save failed", { description: error.message }); return; }
      } else {
        const { data, error } = await supabase.from("services").insert(payload).select("id").single();
        if (error) { toast.error("Save failed", { description: error.message }); return; }
        serviceId = (data as { id: string }).id;
      }
      if (form.service_type === "api") {
        const cfg = {
          service_id: serviceId, endpoint: form.api_endpoint.trim(), method: form.api_method,
          auth_type: form.api_auth_type, auth_header: form.api_auth_header || "Authorization",
          secret_ref: form.api_secret_ref || null, notes: form.api_notes || null,
        };
        const { error } = await supabase.from("service_api_config").upsert(cfg, { onConflict: "service_id" });
        if (error) { toast.error("API config save failed", { description: error.message }); return; }
      }
      toast.success(editing ? "Service updated" : "Service added");
      reset(); await load();
    } finally { setSaving(false); }
  };

  const edit = async (s: Service) => {
    const base = { ...emptyForm, id: s.id, name: s.name, logo_url: s.logo_url ?? "", redirect_url: s.redirect_url ?? "",
      backend_route: s.backend_route ?? "", service_type: s.service_type, category: s.category ?? "", category_id: s.category_id ?? "", is_active: s.is_active, sort_order: s.sort_order, form_schema: (s as any).form_schema ?? [],
      service_charge: s.service_charge ?? 0, company_commission: s.company_commission ?? 0, distributor_commission: s.distributor_commission ?? 0, dro_commission: s.dro_commission ?? 0, tro_commission: s.tro_commission ?? 0, retailer_commission: s.retailer_commission ?? 0 };
    if (s.service_type === "api") {
      const { data } = await supabase.from("service_api_config").select("*").eq("service_id", s.id).maybeSingle();
      if (data) Object.assign(base, { api_endpoint: data.endpoint ?? "", api_method: data.method ?? "POST", api_auth_type: data.auth_type ?? "apikey", api_auth_header: data.auth_header ?? "Authorization", api_secret_ref: data.secret_ref ?? "", api_notes: data.notes ?? "" });
    }
    setForm(base); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (id: string) => { if (!confirm("Delete this service?")) return; const { error } = await supabase.from("services").delete().eq("id", id); if (error) { toast.error(error.message); return; } toast.success("Deleted"); load(); };
  const toggle = async (s: Service) => { const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id); if (error) { toast.error(error.message); return; } load(); };

  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold">{editing ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editing ? "Edit service" : "Add a service"}</p>

        {/* Type selector */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(TYPE_META) as ServiceType[]).map((t) => (
            <button key={t} onClick={() => set({ service_type: t })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-semibold transition ${form.service_type === t ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {TYPE_META[t].icon} {TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-xs font-semibold text-muted-foreground">Service name *</label>
            <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. AEPS Services" /></div>
          {!categoryId && <div><label className="text-xs font-semibold text-muted-foreground">Category</label>
            <select className={input} value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              <option value="">Select category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.is_active ? " (inactive)" : ""}</option>)}
            </select></div>}

          {form.service_type === "inlink" && (
            <div className="sm:col-span-2"><label className="text-xs font-semibold text-muted-foreground">Redirect URL *</label>
              <input className={input} value={form.redirect_url} onChange={(e) => set({ redirect_url: e.target.value })} placeholder="https://partner.example.com" /></div>
          )}
          {form.service_type === "backend" && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Form builder — design the form retailers will fill</p>
              <FormBuilder value={form.form_schema} onChange={(v) => set({ form_schema: v })} />
            </div>
          )}
          {form.service_type === "api" && (
            <>
              <div><label className="text-xs font-semibold text-muted-foreground">API endpoint *</label>
                <input className={input} value={form.api_endpoint} onChange={(e) => set({ api_endpoint: e.target.value })} placeholder="https://api.partner.com/v1/run" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">Method</label>
                <select className={input} value={form.api_method} onChange={(e) => set({ api_method: e.target.value })}><option>POST</option><option>GET</option><option>PUT</option></select></div>
              <div><label className="text-xs font-semibold text-muted-foreground">Auth type</label>
                <select className={input} value={form.api_auth_type} onChange={(e) => set({ api_auth_type: e.target.value })}><option value="apikey">API key (header)</option><option value="bearer">Bearer token</option><option value="none">None</option></select></div>
              <div><label className="text-xs font-semibold text-muted-foreground">Auth header name</label>
                <input className={input} value={form.api_auth_header} onChange={(e) => set({ api_auth_header: e.target.value })} placeholder="Authorization / x-api-key" /></div>
              <div className="sm:col-span-2"><label className="text-xs font-semibold text-muted-foreground">Secret name (Supabase Edge secret holding the key)</label>
                <input className={input} value={form.api_secret_ref} onChange={(e) => set({ api_secret_ref: e.target.value })} placeholder="e.g. AEPS_API_KEY — set its value in Edge Function secrets" /></div>
              <div className="sm:col-span-2"><label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <input className={input} value={form.api_notes} onChange={(e) => set({ api_notes: e.target.value })} placeholder="Integration notes (optional)" /></div>
            </>
          )}

          <div><label className="text-xs font-semibold text-muted-foreground">Total Cost of Service (\u20b9)</label>
            <input type="number" min="0" className={input} value={form.service_charge} onChange={(e) => set({ service_charge: Number(e.target.value) })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Sort order</label>
            <input type="number" className={input} value={form.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></div>

          <div className="sm:col-span-2 rounded-xl border border-border bg-background/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Commission split (% of total cost)</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pctOk ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Total: {totalPct}% {charge <= 0 ? "" : pctOk ? "\u2713" : "(must be 100%)"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {commFields.map(([label, key]) => (
                <div key={key}>
                  <label className="text-[11px] font-semibold text-muted-foreground">{label} (%)</label>
                  <input type="number" min="0" max="100" className={input} value={(form as any)[key]} onChange={(e) => set({ [key]: Number(e.target.value) } as any)} />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">= {inr(amt((form as any)[key]))}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Company {inr(amt(form.company_commission))} + Distributor {inr(amt(form.distributor_commission))} + DRO {inr(amt(form.dro_commission))} + TRO {inr(amt(form.tro_commission))} + Retailer {inr(amt(form.retailer_commission))} = <b className="text-foreground">{inr(amt(totalPct))}</b></p>
          </div>

          <div className="sm:col-span-2"><label className="text-xs font-semibold text-muted-foreground">Logo</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logo_url ? <img src={form.logo_url} alt="logo" className="h-12 w-12 rounded-lg border border-border object-contain bg-white p-1" /> : <div className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-border text-muted-foreground"><Upload className="h-4 w-4" /></div>}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </label>
              <input className={`${input} flex-1 min-w-[180px]`} value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} placeholder="…or paste a logo image URL" />
            </div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active (visible to retailers)</label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={saving} className="bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editing ? "Update service" : "Add service"}</Button>
          {editing && <Button variant="outline" onClick={reset}><X className="h-4 w-4" /> Cancel</Button>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 text-sm font-bold">Services ({rows.length})</p>
        {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No services yet. Add one above.</p>
          : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-lg border border-border object-contain bg-white p-1" /> : <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">No logo</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><p className="truncate font-semibold">{s.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TYPE_META[s.service_type].tone}`}>{TYPE_META[s.service_type].icon}{s.service_type}</span></div>
                  {s.category && <p className="text-[11px] text-muted-foreground">{s.category}</p>}
                  {Number(s.service_charge) > 0 && <p className="text-[11px] font-semibold text-foreground">{inr(s.service_charge)} \u00b7 Retailer {s.retailer_commission}%</p>}
                  <p className="mt-0.5 truncate text-[11px] font-medium text-india-green">{s.service_type === "backend" ? s.backend_route : s.service_type === "api" ? "API integration" : s.redirect_url}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => toggle(s)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.is_active ? "Active" : "Inactive"}</button>
                    <button onClick={() => edit(s)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(s.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
