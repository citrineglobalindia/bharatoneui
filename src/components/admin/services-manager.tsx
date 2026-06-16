import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Upload, ExternalLink, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Service = {
  id: string; name: string; logo_url: string | null; redirect_url: string;
  category: string | null; is_active: boolean; sort_order: number;
};

const empty = { id: "", name: "", logo_url: "", redirect_url: "", category: "", is_active: true, sort_order: 0 };

export function ServicesManager() {
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from("services").select("*").order("sort_order").order("created_at", { ascending: false });
      setRows((data as Service[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); ensureStaffSession().then((ok) => { if (ok) load(); }); }, []);

  const reset = () => { setForm({ ...empty }); setEditing(false); };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("service-logos").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Logo upload failed", { description: error.message }); return; }
      const { data } = supabase.storage.from("service-logos").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
      toast.success("Logo uploaded");
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name.trim() || !form.redirect_url.trim()) { toast.error("Name and redirect URL are required"); return; }
    let url = form.redirect_url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), redirect_url: url, logo_url: form.logo_url || null,
        category: form.category || null, is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
      };
      const res = editing
        ? await supabase.from("services").update(payload).eq("id", form.id)
        : await supabase.from("services").insert(payload);
      if (res.error) { toast.error("Save failed", { description: res.error.message }); return; }
      toast.success(editing ? "Service updated" : "Service added");
      reset();
      await load();
    } finally { setSaving(false); }
  };

  const edit = (s: Service) => { setForm({ id: s.id, name: s.name, logo_url: s.logo_url ?? "", redirect_url: s.redirect_url, category: s.category ?? "", is_active: s.is_active, sort_order: s.sort_order }); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (id: string) => { if (!confirm("Delete this service?")) return; const { error } = await supabase.from("services").delete().eq("id", id); if (error) { toast.error(error.message); return; } toast.success("Deleted"); load(); };
  const toggle = async (s: Service) => { const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id); if (error) { toast.error(error.message); return; } load(); };

  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold">{editing ? <Pencil className="h-4 w-4 text-india-green" /> : <Plus className="h-4 w-4 text-india-green" />} {editing ? "Edit service" : "Add a service"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Service name *</label>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AEPS Services" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Redirect URL *</label>
            <input className={input} value={form.redirect_url} onChange={(e) => setForm({ ...form, redirect_url: e.target.value })} placeholder="https://partner.example.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Category</label>
            <input className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Banking / Travel / Bills…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Sort order</label>
            <input type="number" className={input} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">Logo</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logo_url ? <img src={form.logo_url} alt="logo" className="h-12 w-12 rounded-lg border border-border object-contain bg-white p-1" /> : <div className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-border text-muted-foreground"><Upload className="h-4 w-4" /></div>}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </label>
              <input className={`${input} flex-1 min-w-[180px]`} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="…or paste a logo image URL" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active (visible to retailers)
          </label>
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
                  <p className="truncate font-semibold">{s.name}</p>
                  {s.category && <p className="text-[11px] text-muted-foreground">{s.category}</p>}
                  <a href={s.redirect_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] font-medium text-india-green hover:underline">{s.redirect_url} <ExternalLink className="h-3 w-3" /></a>
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
