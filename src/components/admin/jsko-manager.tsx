import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Check, X, RefreshCw, Search, IdCard, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = { id: string; username: string; full_name: string; email: string | null; mobile: string | null; legacy_password: string | null; is_active: boolean; created_at: string };
const inp = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

export function JskoManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [add, setAdd] = useState({ username: "", full_name: "", email: "", mobile: "", legacy_password: "", is_active: true });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [view, setView] = useState<Row | null>(null);
  const [form, setForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    try { await ensureStaffSession(); const { data } = await supabase.from("jsko_legacy_accounts").select("*").order("created_at", { ascending: false }); setRows((data as Row[]) ?? []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const addNew = async () => {
    if (!add.username.trim() || !add.full_name.trim()) return toast.error("Username and full name are required");
    setBusy(true);
    const { error } = await supabase.from("jsko_legacy_accounts").insert({ username: add.username.trim(), full_name: add.full_name.trim(), email: add.email || null, mobile: add.mobile || null, legacy_password: add.legacy_password || null, is_active: add.is_active });
    setBusy(false);
    if (error) return toast.error("Add failed", { description: error.message });
    toast.success("JSKO ID added"); setAdd({ username: "", full_name: "", email: "", mobile: "", legacy_password: "", is_active: true }); load();
  };

  const openView = (r: Row) => { setView(r); setForm({ username: r.username, full_name: r.full_name, email: r.email ?? "", mobile: r.mobile ?? "", legacy_password: r.legacy_password ?? "", is_active: r.is_active }); };
  const saveEdit = async () => {
    if (!form.username.trim() || !form.full_name.trim()) return toast.error("Username and full name required");
    setSavingEdit(true);
    const { error } = await supabase.from("jsko_legacy_accounts").update({ username: form.username.trim(), full_name: form.full_name.trim(), email: form.email || null, mobile: form.mobile || null, legacy_password: form.legacy_password || null, is_active: form.is_active }).eq("id", view!.id);
    setSavingEdit(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Saved");
    setRows((p) => p.map((x) => x.id === view!.id ? { ...x, ...form } : x)); setView(null);
  };
  const toggle = async (r: Row) => { const { error } = await supabase.from("jsko_legacy_accounts").update({ is_active: !r.is_active }).eq("id", r.id); if (error) return toast.error(error.message); setRows((p) => p.map((x) => x.id === r.id ? { ...x, is_active: !r.is_active } : x)); };

  const importBulk = async () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    const recs = lines.map((l) => { const [username, full_name, email, mobile] = l.split(",").map((x) => x?.trim()); return { username, full_name, email: email || null, mobile: mobile || null }; }).filter((r) => r.username && r.full_name);
    if (recs.length === 0) return toast.error("No valid rows. Format: username, full name, email, mobile");
    setBusy(true);
    const { error } = await supabase.from("jsko_legacy_accounts").upsert(recs, { onConflict: "username" });
    setBusy(false);
    if (error) return toast.error("Import failed", { description: error.message });
    toast.success(`Imported ${recs.length} JSKO ID(s)`); setBulk(""); setShowBulk(false); load();
  };

  const filtered = useMemo(() => rows.filter((r) => !q || [r.username, r.full_name, r.email, r.mobile].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))), [rows, q]);

  if (view) {
    return (
      <div className="space-y-5">
        <button onClick={() => setView(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><X className="h-4 w-4 rotate-45" /> Back to list</button>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-3 border-l-4 border-india-green bg-muted/20 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-india-green/10 text-india-green"><IdCard className="h-6 w-6" /></span>
            <div><p className="font-display text-lg font-extrabold">JSKO ID Details</p><p className="text-xs text-muted-foreground">Username {view.username} · Added {new Date(view.created_at).toLocaleString("en-IN")}</p></div>
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${form.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{form.is_active ? "Active" : "Inactive"}</span>
          </div>
          <div className="p-6">
            <p className="mb-4 text-sm font-bold text-muted-foreground">Existing details — edit and save</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><label className="text-[11px] font-semibold text-muted-foreground">Username *</label><input className={inp + " h-11"} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div><label className="text-[11px] font-semibold text-muted-foreground">Full name *</label><input className={inp + " h-11"} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><label className="text-[11px] font-semibold text-muted-foreground">Email</label><input className={inp + " h-11"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="text-[11px] font-semibold text-muted-foreground">Mobile</label><input className={inp + " h-11"} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} maxLength={10} /></div>
              <div className="lg:col-span-2"><label className="text-[11px] font-semibold text-muted-foreground">Password (legacy)</label><input className={inp + " h-11"} value={form.legacy_password} onChange={(e) => setForm({ ...form, legacy_password: e.target.value })} /></div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active (fetchable during registration)</label>
            <div className="mt-5 flex gap-2 border-t border-border pt-4">
              <Button onClick={saveEdit} disabled={savingEdit} className="bg-india-green text-white hover:bg-india-green/90">{savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes</Button>
              <Button variant="outline" onClick={() => setView(null)}><X className="h-4 w-4" /> Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><IdCard className="h-5 w-5 text-admin" /> Old JSKO IDs <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-xs font-bold text-india-green">{rows.length}</span></h2>
          <p className="text-sm text-muted-foreground">Legacy JSKO usernames retailers fetch during Old JSKO onboarding.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulk((v) => !v)}><Upload className="h-4 w-4" /> Bulk import</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
      </div>

      {showBulk && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-2 text-sm font-bold">Bulk import (one per line: <span className="font-mono text-xs">username, full name, email, mobile</span>)</p>
          <textarea rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" placeholder={"JSKO101, Ramesh Kumar, ramesh@example.com, 9845098450"} />
          <Button onClick={importBulk} disabled={busy} className="mt-2 bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import</Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add JSKO ID</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-[11px] font-semibold text-muted-foreground">Username *</label><input className={inp} value={add.username} onChange={(e) => setAdd({ ...add, username: e.target.value })} placeholder="JSKO101" /></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Full name *</label><input className={inp} value={add.full_name} onChange={(e) => setAdd({ ...add, full_name: e.target.value })} placeholder="Ramesh Kumar" /></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Email</label><input className={inp} value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} placeholder="name@example.com" /></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Mobile</label><input className={inp} value={add.mobile} onChange={(e) => setAdd({ ...add, mobile: e.target.value.replace(/\D/g, "") })} maxLength={10} placeholder="10-digit" /></div>
          <div><label className="text-[11px] font-semibold text-muted-foreground">Password</label><input className={inp} value={add.legacy_password} onChange={(e) => setAdd({ ...add, legacy_password: e.target.value })} placeholder="Legacy password" /></div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={add.is_active} onChange={(e) => setAdd({ ...add, is_active: e.target.checked })} className="h-4 w-4 accent-[oklch(0.55_0.12_150)]" /> Active</label>
        <div className="mt-3"><Button onClick={addNew} disabled={busy} className="bg-india-green text-white hover:bg-india-green/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add</Button></div>
      </div>

      <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inp + " pl-8"} placeholder="Search username, name, mobile" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Username</th><th className="px-3 py-2">Full name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Password</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No JSKO IDs found.</td></tr>
              : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono font-semibold">{r.username}</td>
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.mobile || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.legacy_password || "—"}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => toggle(r)} className="mr-3 text-xs font-semibold text-muted-foreground hover:text-foreground">{r.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => openView(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline"><Eye className="h-3.5 w-3.5" /> View / Edit</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
