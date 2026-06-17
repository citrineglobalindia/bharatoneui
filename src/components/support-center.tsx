import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, Plus, Loader2, RefreshCw, ChevronRight, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { SupportThread } from "@/components/support-thread";
import { ChatInbox } from "@/components/chat-inbox";

type Ticket = { id: string; ticket_no: string; user_id: string; assigned_to: string | null; user_name: string | null; category: string | null; priority: string | null; subject: string; body: string | null; status: string; assigned_name: string | null; created_at: string };
const statusTone: Record<string, string> = { open: "bg-amber-100 text-amber-700", in_progress: "bg-indigo-100 text-indigo-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-slate-100 text-slate-600" };
const CATS = ["Technical", "Payments", "Wallet", "Application", "Account", "Other"];

export function SupportCenter() {
  const me = useCurrentUser();
  const [uid, setUid] = useState("");
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "Technical", priority: "Low", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [sel, setSel] = useState<Ticket | null>(null);
  const [tab, setTab] = useState<"mine" | "assigned">("mine");

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    setUid(u.user?.id ?? "");
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setRows((data as Ticket[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const mine = rows.filter((t) => t.user_id === uid);
  const assignedCount = rows.filter((t) => t.assigned_to === uid && t.user_id !== uid).length;

  const raise = async () => {
    if (!form.subject.trim()) return toast.error("Enter a subject");
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSending(false); return toast.error("Please sign in"); }
    const { error } = await supabase.from("support_tickets").insert({ user_id: u.user.id, user_name: me.name, user_role: me.role, category: form.category, priority: form.priority, subject: form.subject.trim(), body: form.body || null });
    setSending(false);
    if (error) return toast.error("Couldn't raise ticket", { description: error.message });
    toast.success("Ticket raised", { description: "Our team will respond shortly." });
    setForm({ category: "Technical", priority: "Low", subject: "", body: "" }); load();
  };
  const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-3">
        {[["Call us", "1800 123 4567 · 8am–10pm", Phone, "bg-india-green/10 text-india-green"], ["Email", "help@bharatone.in", Mail, "bg-blue-500/10 text-blue-600"], ["Live Chat", "Use the chat button, bottom-right", MessageSquare, "bg-violet-500/10 text-violet-600"]].map(([t, d, Icon, tone]: any, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-sm font-bold">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div></div>
        ))}
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        <button onClick={() => setTab("mine")} className={`rounded-md px-4 h-9 text-sm font-semibold ${tab === "mine" ? "bg-india-green text-white" : "text-muted-foreground"}`}>My Tickets ({mine.length})</button>
        <button onClick={() => setTab("assigned")} className={`rounded-md px-4 h-9 text-sm font-semibold ${tab === "assigned" ? "bg-india-green text-white" : "text-muted-foreground"}`}>Assigned to me ({assignedCount})</button>
      </div>

      {tab === "assigned" ? (
        <ChatInbox filter="assigned" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr] items-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Raise a Ticket</p>
            <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
            <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Priority</label>
            <select className={inp} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
            <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Subject</label>
            <input className={inp} placeholder="Brief summary" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Describe the issue</label>
            <textarea rows={4} className={inp + " h-auto py-2"} placeholder="Provide details, IDs, screenshots…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Button onClick={raise} disabled={sending} className="mt-4 w-full bg-india-green text-white hover:bg-india-green/90">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Ticket</Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Your Tickets</p><button onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
            {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
              : mine.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tickets yet. Raise one to get help.</p>
              : <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Ticket</th><th className="py-2">Subject</th><th className="py-2">Status</th><th className="py-2"></th></tr></thead>
                  <tbody>{mine.map((t) => (<tr key={t.id} className="border-t border-border"><td className="py-2 font-mono text-xs">{t.ticket_no}</td><td className="py-2"><div className="font-medium">{t.subject}</div><div className="text-[11px] text-muted-foreground">{t.category} · {new Date(t.created_at).toLocaleDateString("en-IN")}</div></td><td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[t.status]}`}>{t.status.replace("_", " ")}</span></td><td className="py-2 text-right"><button onClick={() => setSel(t)} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">Open <ChevronRight className="h-3.5 w-3.5" /></button></td></tr>))}</tbody>
                </table></div>}
          </div>
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="font-mono text-xs font-bold text-muted-foreground">{sel.ticket_no}</p><p className="font-display text-lg font-extrabold">{sel.subject}</p><p className="text-sm text-muted-foreground">{sel.category} · {sel.priority}</p></div><button onClick={() => setSel(null)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
            <div className="mt-2 flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[sel.status]}`}>{sel.status.replace("_", " ")}</span>{sel.assigned_name && <span className="text-xs text-muted-foreground">Handled by {sel.assigned_name}</span>}</div>
            {sel.body && <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">{sel.body}</p>}
            <div className="mt-4"><SupportThread ticketId={sel.id} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
