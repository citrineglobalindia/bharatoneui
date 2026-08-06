import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, RefreshCw, UserCheck, ChevronDown, ChevronUp, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

const CATS = ["general", "bug", "feature", "service", "complaint"];
const statusColor: Record<string, string> = { open: "bg-amber-100 text-amber-700", reviewing: "bg-indigo-100 text-indigo-700", resolved: "bg-emerald-100 text-emerald-700" };
const db = supabase as any;

type Row = {
  id: string; user_id: string | null; name: string | null; role: string | null;
  category: string; subject: string | null; message: string; status: string;
  assigned_to: string | null; assigned_name: string | null; created_at: string;
};
type FbReply = { id: string; feedback_id: string; sender_id: string; sender_name: string | null; sender_role: string | null; body: string; created_at: string };

/**
 * Feedback, now a two-way conversation.
 *
 * Admin can assign an item to any user (mirroring support-ticket assignment);
 * the assignee is notified, sees an "Assigned to me" tab in this same panel in
 * their own portal, and can reply and resolve. The raiser sees the responses
 * under their item and can answer back. Until this, feedback was write-only:
 * the author's words went in, an admin flipped a status chip, and nobody could
 * say anything to anybody.
 */
export function FeedbackPanel() {
  const { role, displayName } = useAuth();
  const isManager = role === "admin";
  const [uid, setUid] = useState("");
  const [form, setForm] = useState({ category: "general", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "assigned">("mine");
  const [staff, setStaff] = useState<{ id: string; label: string }[]>([]);
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, FbReply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [defaultWho, setDefaultWho] = useState("");
  const [savingDefault, setSavingDefault] = useState(false);
  /** Every new feedback raised with no assignee goes straight to this person. */
  const saveDefault = async (who: string) => {
    setSavingDefault(true);
    try {
      const { error } = await db.rpc("set_default_assignee", { p_kind: "feedback", p_user: who || null });
      if (error) return toast.error("Could not save default", { description: error.message });
      setDefaultWho(who);
      toast.success(who ? "Default assignee set — new feedback will go to them automatically" : "Default assignee cleared");
    } finally { setSavingDefault(false); }
  };

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data: u } = await supabase.auth.getUser();
      setUid(u.user?.id ?? "");
      const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(100);
      setRows((data as Row[]) ?? []);
      if (isManager && staff.length === 0) {
        const { data: users } = await db.rpc("admin_list_users");
        const BARRED = ["retailer", "distributor", "master-distributor"];
        setStaff(((users as any[]) ?? [])
          .filter((x) => x.is_active && !((x.roles ?? []) as string[]).some((r) => BARRED.includes(r)))
          .map((x) => ({ id: x.id, label: `${x.display_name || x.email}${x.roles?.length ? " · " + x.roles.join(",") : ""}` })));
        const { data: def } = await db.from("app_settings").select("value").eq("key", "feedback_default_assignee").maybeSingle();
        setDefaultWho(((def as any)?.value as string) ?? "");
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const loadReplies = async (fbId: string) => {
    const { data } = await db.from("feedback_replies").select("*").eq("feedback_id", fbId).order("created_at");
    setReplies((r) => ({ ...r, [fbId]: (data as FbReply[]) ?? [] }));
  };
  const toggleThread = (fbId: string) => {
    if (openThread === fbId) { setOpenThread(null); return; }
    setOpenThread(fbId); setReplyText(""); void loadReplies(fbId);
  };

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

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const assign = async (f: Row) => {
    const who = assignPick[f.id];
    if (!who) return toast.error("Pick a user to assign to");
    const { error } = await db.rpc("assign_feedback", { p_id: f.id, p_assignee: who });
    if (error) return toast.error("Assign failed", { description: error.message });
    toast.success("Assigned", { description: "They have been notified and can respond." });
    load();
  };

  const sendReply = async (f: Row) => {
    if (!replyText.trim()) return toast.error("Write a reply first");
    setReplying(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Please sign in");
      const { error } = await db.from("feedback_replies").insert({
        feedback_id: f.id, sender_id: u.user.id,
        sender_name: displayName || u.user.email, sender_role: role || "user",
        body: replyText.trim(),
      });
      if (error) return toast.error("Reply failed", { description: error.message });
      setReplyText("");
      await loadReplies(f.id);
    } finally { setReplying(false); }
  };

  // Non-admins may hold two hats here: things they wrote, and things assigned
  // to them. Admin sees everything in one list, as before.
  const mine = useMemo(() => rows.filter((f) => f.user_id === uid), [rows, uid]);
  const assignedToMe = useMemo(() => rows.filter((f) => f.assigned_to === uid && f.user_id !== uid), [rows, uid]);
  const shown = isManager ? rows : tab === "assigned" ? assignedToMe : mine;
  /** Reply is open to the author, the assignee and admin — the same three
   *  principals the RLS on feedback_replies admits. */
  const canReply = (f: Row) => isManager || f.user_id === uid || f.assigned_to === uid;
  /** The assignee may close out the item they were asked to handle. */
  const canSetStatus = (f: Row) => isManager || f.assigned_to === uid;

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {isManager ? (
            <span className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">All feedback ({rows.length})</p>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Default assignee</span>
                <select className="h-7 rounded-md border border-border bg-background px-1.5 text-xs" value={defaultWho} disabled={savingDefault} onChange={(e) => saveDefault(e.target.value)}>
                  <option value="">None — assign manually</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </span>
            </span>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setTab("mine")} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === "mine" ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>My feedback ({mine.length})</button>
              <button onClick={() => setTab("assigned")} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === "assigned" ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>Assigned to me ({assignedToMe.length})</button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
        {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          : shown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{tab === "assigned" && !isManager ? "Nothing has been assigned to you." : "No feedback yet."}</p>
          : <div className="space-y-2">{shown.map((f) => (
              <div key={f.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.subject || f.category}</p>
                    <p className="text-[11px] text-muted-foreground">{f.name} · {f.role} · {new Date(f.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {f.assigned_name && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700"><UserCheck className="mr-0.5 inline h-3 w-3" />{f.assigned_name}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[f.status] ?? "bg-slate-100 text-slate-700"}`}>{f.status}</span>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-foreground">{f.message}</p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {canSetStatus(f) && ["open", "reviewing", "resolved"].map((s) => (
                    <button key={s} onClick={() => setStatus(f.id, s)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${f.status === s ? "bg-india-green text-white ring-india-green" : "ring-border hover:bg-muted"}`}>{s}</button>
                  ))}
                  {isManager && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <select className="h-7 rounded-lg border border-border bg-background px-1.5 text-[11px]" value={assignPick[f.id] ?? ""} onChange={(e) => setAssignPick((p) => ({ ...p, [f.id]: e.target.value }))}>
                        <option value="">Assign to…</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <Button size="sm" className="h-7 bg-sky-600 px-2 text-[11px] text-white hover:bg-sky-700" onClick={() => assign(f)}>Assign</Button>
                    </span>
                  )}
                  {canReply(f) && (
                    <button onClick={() => toggleThread(f.id)} className={`${isManager ? "" : "ml-auto"} inline-flex items-center gap-1 text-[11px] font-bold text-india-green hover:underline`}>
                      {openThread === f.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {openThread === f.id ? "Hide conversation" : "Conversation"}
                    </button>
                  )}
                </div>

                {openThread === f.id && (
                  <div className="mt-2 rounded-lg bg-muted/40 p-2.5">
                    {(replies[f.id] ?? []).length === 0
                      ? <p className="py-2 text-center text-xs text-muted-foreground">No responses yet.</p>
                      : <ul className="space-y-1.5">
                          {(replies[f.id] ?? []).map((r) => (
                            <li key={r.id} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${r.sender_id === f.user_id ? "bg-card" : "ml-auto bg-india-green/10"}`}>
                              <p className="text-[10px] font-bold text-muted-foreground">{r.sender_name || "—"}{r.sender_role ? ` · ${r.sender_role}` : ""} · {new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                              <p>{r.body}</p>
                            </li>
                          ))}
                        </ul>}
                    {canReply(f) && (
                      <div className="mt-2 flex gap-1.5">
                        <input className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm" placeholder="Write a response…" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(f); }} />
                        <Button size="sm" disabled={replying} onClick={() => sendReply(f)} className="h-9 bg-india-green text-white">{replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}</div>}
      </div>
    </div>
  );
}
