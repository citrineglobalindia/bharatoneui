import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Loader2, RefreshCw, Search, ChevronRight, X, CheckCircle2, UserCog, Clock3, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { SupportThread } from "@/components/support-thread";

type Ticket = { id: string; ticket_no: string; user_name: string | null; user_role: string | null; category: string | null; priority: string | null; subject: string; body: string | null; status: string; assigned_to: string | null; assigned_name: string | null; created_at: string };
type U = { id: string; name: string };
const statusTone: Record<string, string> = { open: "bg-amber-100 text-amber-700", in_progress: "bg-indigo-100 text-indigo-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-slate-100 text-slate-600" };
const prioTone: Record<string, string> = { High: "bg-rose-100 text-rose-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-600" };

export function SupportAdmin() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<Ticket | null>(null);
  const [assignee, setAssignee] = useState("");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const [t, u] = await Promise.all([
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
        supabase.rpc("admin_list_users"),
      ]);
      setRows((t.data as Ticket[]) ?? []);
      setUsers(((u.data as any[]) ?? []).map((x) => ({ id: x.id, name: (x.display_name || x.email || "User") + (Array.isArray(x.roles) && x.roles.length ? ` · ${x.roles.find((r: string) => r !== "employee") || x.roles[0]}` : "") })));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const setTicketStatus = async (t: Ticket, st: string) => {
    setBusy(true);
    const { error } = await supabase.from("support_tickets").update({ status: st, updated_at: new Date().toISOString() }).eq("id", t.id);
    setBusy(false);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success("Ticket " + st.replace("_", " "));
    setRows((p) => p.map((x) => x.id === t.id ? { ...x, status: st } : x)); setSel((s) => s && s.id === t.id ? { ...s, status: st } : s);
  };
  const assign = async (t: Ticket) => {
    if (!assignee) return toast.error("Pick a user to assign");
    setBusy(true);
    const { error } = await supabase.rpc("assign_ticket", { p_id: t.id, p_assignee: assignee });
    setBusy(false);
    if (error) return toast.error("Assign failed", { description: error.message });
    const name = users.find((u) => u.id === assignee)?.name ?? "";
    toast.success("Assigned to " + name);
    setRows((p) => p.map((x) => x.id === t.id ? { ...x, assigned_to: assignee, assigned_name: name, status: x.status === "open" ? "in_progress" : x.status } : x));
    setSel((s) => s && s.id === t.id ? { ...s, assigned_to: assignee, assigned_name: name } : s); load();
  };

  const stats = useMemo(() => ({ open: rows.filter((r) => r.status === "open").length, prog: rows.filter((r) => r.status === "in_progress").length, resolved: rows.filter((r) => ["resolved", "closed"].includes(r.status)).length, total: rows.length }), [rows]);
  const filtered = useMemo(() => rows.filter((r) => (status === "all" || r.status === status) && (!q || [r.ticket_no, r.subject, r.user_name, r.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))), [rows, q, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><LifeBuoy className="h-5 w-5 text-admin" /> Support Center</h2><p className="text-sm text-muted-foreground">All tickets across the platform. Reply, assign to any user, and resolve.</p></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Open", stats.open, Inbox, "bg-amber-500/10 text-amber-600"], ["In Progress", stats.prog, Clock3, "bg-indigo-500/10 text-indigo-600"], ["Resolved", stats.resolved, CheckCircle2, "bg-india-green/10 text-india-green"], ["Total", stats.total, LifeBuoy, "bg-blue-500/10 text-blue-600"]].map(([l, v, Icon, t]: any, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-lg font-extrabold">{v}</p></div></div></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-64 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search ticket, subject, user…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Ticket</th><th className="px-3 py-2">User</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right"></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No tickets.</td></tr>
              : filtered.map((t) => (<tr key={t.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{t.ticket_no}</td>
                <td className="px-3 py-2">{t.user_name}<div className="text-[11px] text-muted-foreground">{t.user_role}</div></td>
                <td className="px-3 py-2"><div className="font-medium">{t.subject}</div><div className="text-[11px] text-muted-foreground">{t.category}</div></td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${prioTone[t.priority ?? "Low"]}`}>{t.priority}</span></td>
                <td className="px-3 py-2 text-xs">{t.assigned_name ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusTone[t.status]}`}>{t.status.replace("_", " ")}</span></td>
                <td className="px-3 py-2 text-right"><button onClick={() => { setSel(t); setAssignee(t.assigned_to ?? ""); }} className="inline-flex items-center gap-1 text-xs font-semibold text-india-green hover:underline">Open <ChevronRight className="h-3.5 w-3.5" /></button></td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="font-mono text-xs font-bold text-muted-foreground">{sel.ticket_no}</p><p className="font-display text-lg font-extrabold">{sel.subject}</p><p className="text-sm text-muted-foreground">{sel.user_name} ({sel.user_role}) · {sel.category} · {sel.priority}</p></div><button onClick={() => setSel(null)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
            {sel.body && <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">{sel.body}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><UserCog className="h-3.5 w-3.5" /> Assign to</label>
                <div className="flex gap-2"><select className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Select user</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><Button size="sm" disabled={busy} onClick={() => assign(sel)} className="bg-admin text-admin-foreground">Assign</Button></div>
              </div>
              <div><label className="text-[11px] font-semibold text-muted-foreground">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setTicketStatus(sel, "in_progress")}>In Progress</Button>
                  <Button size="sm" disabled={busy} onClick={() => setTicketStatus(sel, "resolved")} className="bg-india-green text-white hover:bg-india-green/90"><CheckCircle2 className="h-4 w-4" /> Resolve</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setTicketStatus(sel, "closed")}>Close</Button>
                </div>
              </div>
            </div>
            <div className="mt-4"><SupportThread ticketId={sel.id} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
