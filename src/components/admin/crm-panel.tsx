import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Users, Plus, Phone, Mail, X, MessageSquarePlus, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Lead = { id: string; name: string; phone: string | null; email: string | null; source: string | null; stage: string; value: number; notes: string | null; created_at: string };
type Activity = { id: string; lead_id: string; kind: string; body: string | null; created_at: string };

const db = supabase as any;
const input = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const STAGES = ["new", "contacted", "qualified", "converted", "lost"] as const;
const stageTone: Record<string, string> = { new: "bg-slate-100 text-slate-700", contacted: "bg-sky-100 text-sky-700", qualified: "bg-amber-100 text-amber-700", converted: "bg-emerald-100 text-emerald-700", lost: "bg-rose-100 text-rose-700" };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

export function CrmPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "", value: "" });
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<Lead | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await db.from("crm_leads").select("*").order("created_at", { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const openLead = async (l: Lead) => {
    setSel(l); setActs([]);
    const { data } = await db.from("crm_activities").select("*").eq("lead_id", l.id).order("created_at", { ascending: false });
    setActs((data as Activity[]) ?? []);
  };

  const addLead = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setAdding(true);
    const { error } = await db.from("crm_leads").insert({ name: form.name, phone: form.phone || null, email: form.email || null, source: form.source || null, value: Number(form.value) || 0 });
    setAdding(false);
    if (error) return toast.error("Couldn't add lead", { description: error.message });
    toast.success("Lead added");
    setForm({ name: "", phone: "", email: "", source: "", value: "" });
    load();
  };

  const setStage = async (l: Lead, stage: string) => {
    const { error } = await db.from("crm_leads").update({ stage }).eq("id", l.id);
    if (error) return toast.error(error.message);
    setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, stage } : x)));
    await db.from("crm_activities").insert({ lead_id: l.id, kind: "stage_change", body: `Stage → ${stage}` });
    if (sel?.id === l.id) openLead({ ...l, stage });
  };

  const addNote = async () => {
    if (!sel || !note.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("crm_activities").insert({ lead_id: sel.id, kind: "note", body: note.trim(), created_by: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    setNote(""); openLead(sel);
  };

  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s, leads.filter((l) => l.stage === s).length])), [leads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Users className="h-5 w-5 text-india-green" /> CRM — Leads Pipeline</h2>
          <p className="text-sm text-muted-foreground">Track leads through stages with contact history.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-3 text-center shadow-soft">
            <p className="text-lg font-extrabold">{counts[s] ?? 0}</p>
            <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${stageTone[s]}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add lead</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input className={input} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <input className={input} placeholder="Value ₹" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^\d]/g, "") })} />
          <button onClick={addLead} disabled={adding} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Lead</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2 text-right"></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : leads.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No leads yet.</td></tr>
              : leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{l.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{[l.phone, l.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2 text-xs">{l.source || "—"}</td>
                  <td className="px-3 py-2 font-semibold">{l.value ? inr(l.value) : "—"}</td>
                  <td className="px-3 py-2">
                    <select value={l.stage} onChange={(e) => setStage(l, e.target.value)} className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-bold uppercase ${stageTone[l.stage]}`}>
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right"><button onClick={() => openLead(l)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"><MessageSquarePlus className="h-3.5 w-3.5" /> History</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-extrabold">{sel.name}</p>
                <p className="text-xs text-muted-foreground">{[sel.phone && `📞 ${sel.phone}`, sel.email && `✉ ${sel.email}`].filter(Boolean).join("  ")}</p>
              </div>
              <button onClick={() => setSel(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${stageTone[sel.stage]}`}>{sel.stage}</span>
              {sel.value > 0 && <span className="inline-flex items-center gap-0.5 text-sm font-semibold"><IndianRupee className="h-3.5 w-3.5" />{sel.value.toLocaleString("en-IN")}</span>}
            </div>
            <div className="mt-4">
              <div className="flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Log a note / call outcome…" className={input} />
                <button onClick={addNote} className="rounded-lg bg-india-green px-3 h-9 text-sm font-bold text-white hover:bg-india-green/90">Add</button>
              </div>
              <div className="mt-3 space-y-2">
                {acts.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No activity yet.</p> : acts.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{a.kind.replace("_", " ")}</span>
                    <p>{a.body}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
