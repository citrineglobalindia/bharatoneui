import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

const CATS = ["general", "bug", "feature", "service", "complaint"];
const statusColor: Record<string, string> = { open: "bg-amber-100 text-amber-700", reviewing: "bg-indigo-100 text-indigo-700", resolved: "bg-emerald-100 text-emerald-700" };

export function FeedbackPanel() {
  const { role, displayName } = useAuth();
  const isManager = role === "admin";
  const [form, setForm] = useState({ category: "general", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { await ensureStaffSession(); const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(100); setRows(data ?? []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!form.message.trim()) { toast.error("Please enter your feedback"); return; }
    setSending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error("Please sign in to submit feedback"); return; }
      const { error } = await supabase.from("feedback").insert({ user_id: u.user.id, name: displayName || u.user.email, role: role || "user", category: form.category, subject: form.subject || null, message: form.message });
      if (error) { toast.error("Submit failed", { description: error.message }); return; }
      toast.success("Feedback submitted — thank you!");
      setForm({ category: "general", subject: "", message: "" }); load();
    } finally { setSending(false); }
  };
  const setStatus = async (id: string, status: string) => { const { error } = await supabase.from("feedback").update({ status }).eq("id", id); if (error) { toast.error(error.message); return; } load(); };
  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4 text-india-green" /> Share your feedback</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <input className={input} placeholder="Subject (optional)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <textarea className={`${input} mt-3 h-28 py-2`} placeholder="Tell us what's on your mind…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <Button onClick={submit} disabled={sending} className="mt-3 bg-india-green text-white">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit feedback</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold">{isManager ? "All feedback" : "My feedback"} ({rows.length})</p>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
        {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No feedback yet.</p>
          : <div className="space-y-2">{rows.map((f) => (
              <div key={f.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{f.subject || f.category}</p><p className="text-[11px] text-muted-foreground">{f.name} · {f.role} · {new Date(f.created_at).toLocaleString("en-IN")}</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[f.status] ?? "bg-slate-100 text-slate-700"}`}>{f.status}</span>
                </div>
                <p className="mt-1.5 text-sm text-foreground">{f.message}</p>
                {isManager && <div className="mt-2 flex gap-1.5">{["open", "reviewing", "resolved"].map((s) => <button key={s} onClick={() => setStatus(f.id, s)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${f.status === s ? "bg-india-green text-white ring-india-green" : "ring-border hover:bg-muted"}`}>{s}</button>)}</div>}
              </div>
            ))}</div>}
      </div>
    </div>
  );
}
