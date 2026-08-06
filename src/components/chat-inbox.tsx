import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Loader2, Search, CheckCircle2, Send, ArrowLeft, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useCurrentUser } from "@/lib/use-current-user";
import { Stars } from "@/components/support-rating";

type Chat = { id: string; ticket_no: string; user_id: string; user_name: string | null; user_role: string | null; category: string | null; subject: string; status: string; assigned_to: string | null; created_at: string; updated_at: string; rating: number | null; rating_comment: string | null };
type Msg = { id: string; sender_id: string; sender_name: string | null; body: string; created_at: string };
const tone: Record<string, string> = { open: "bg-amber-100 text-amber-700", in_progress: "bg-indigo-100 text-indigo-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-slate-100 text-slate-600" };

export function ChatInbox({ filter }: { filter: "live-admin" | "assigned" }) {
  const me = useCurrentUser();
  const [uid, setUid] = useState("");
  const [rows, setRows] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Chat | null>(null);
  const [q, setQ] = useState("");
  const [listTab, setListTab] = useState<"pending" | "resolved">("pending");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [assignee, setAssignee] = useState("");
  const selRef = useRef<string | null>(null);
  selRef.current = sel?.id ?? null;

  async function loadList() {
    await ensureStaffSession();
    const { data: u } = await supabase.auth.getUser();
    const myId = u.user?.id ?? ""; setUid(myId);
    let qb = supabase.from("support_tickets").select("id,ticket_no,user_id,user_name,user_role,category,subject,status,assigned_to,created_at,updated_at,rating,rating_comment").order("updated_at", { ascending: false });
    if (filter === "live-admin") qb = qb.eq("category", "Live Chat");
    else qb = qb.eq("assigned_to", myId);
    const { data } = await qb;
    setRows((data as Chat[]) ?? []);
    if (filter === "live-admin" && users.length === 0) {
      const { data: u } = await supabase.rpc("admin_list_users");
      setUsers(((u as any[]) ?? []).map((x) => ({ id: x.id, name: (x.display_name || x.email || "User") + (Array.isArray(x.roles) && x.roles.length ? ` · ${x.roles.find((r: string) => r !== "employee") || x.roles[0]}` : "") })));
    }
    setLoading(false);
  }
  async function loadMsgs(id: string) {
    const { data } = await supabase.from("support_messages").select("id,sender_id,sender_name,body,created_at").eq("ticket_id", id).order("created_at");
    setMsgs((data as Msg[]) ?? []);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }
  useEffect(() => { loadList(); const t = setInterval(() => { loadList(); if (selRef.current) loadMsgs(selRef.current); }, 8000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (sel) loadMsgs(sel.id); }, [sel?.id]);

  const send = async () => {
    if (!text.trim() || !sel) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({ ticket_id: sel.id, sender_id: uid, sender_name: me.name, sender_role: me.role, body: text.trim() });
    setSending(false);
    if (error) { toast.error("Couldn't send", { description: error.message }); return; }
    setText(""); loadMsgs(sel.id);
  };
  const setStatus = async (st: string) => {
    if (!sel) return;
    const { error } = await supabase.from("support_tickets").update({ status: st, updated_at: new Date().toISOString() }).eq("id", sel.id);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success("Marked " + st.replace("_", " ")); setSel({ ...sel, status: st }); loadList();
  };
  const assign = async () => {
    if (!sel || !assignee) return toast.error("Pick a user");
    const { error } = await supabase.rpc("assign_ticket", { p_id: sel.id, p_assignee: assignee });
    if (error) return toast.error("Assign failed", { description: error.message });
    toast.success("Chat assigned"); setAssignee(""); loadList();
  };

  const isOpenStatus = (s: string) => ["open", "in_progress"].includes(s);
  // Pending is the working queue; resolved history lives behind its own tab so
  // finished conversations stop crowding out the ones that still need work.
  const pendingRows = useMemo(() => rows.filter((r) => isOpenStatus(r.status)), [rows]);
  const resolvedRows = useMemo(() => rows.filter((r) => !isOpenStatus(r.status)), [rows]);
  const pool = listTab === "pending" ? pendingRows : resolvedRows;
  const filtered = useMemo(() => pool.filter((r) => !q || [r.user_name, r.ticket_no, r.subject].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))), [pool, q]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft" style={{ height: "72vh" }}>
      <div className="grid h-full md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className={`flex h-full flex-col border-r border-border ${sel ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-border bg-muted/30 p-2.5">
            <div className="flex rounded-xl bg-muted p-0.5">
              <button onClick={() => { setListTab("pending"); setSel(null); }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${listTab === "pending" ? "bg-card shadow-soft text-india-green" : "text-muted-foreground hover:text-foreground"}`}>
                Pending{pendingRows.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">{pendingRows.length}</span>}
              </button>
              <button onClick={() => { setListTab("resolved"); setSel(null); }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${listTab === "resolved" ? "bg-card shadow-soft text-india-green" : "text-muted-foreground hover:text-foreground"}`}>
                Resolved{resolvedRows.length > 0 && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 text-[10px] text-emerald-700">{resolvedRows.length}</span>}
              </button>
            </div>
            <div className="relative mt-2"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" placeholder={`Search ${listTab}…`} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && rows.length === 0 ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
              : filtered.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {listTab === "pending"
                    ? <><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-300" />All caught up — nothing pending.</>
                    : <><MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />Nothing resolved yet.</>}
                </div>
              )
              : filtered.map((c) => (
                <button key={c.id} onClick={() => setSel(c)} className={`flex w-full items-start gap-3 border-b border-border/70 px-3 py-3 text-left transition hover:bg-muted/50 ${sel?.id === c.id ? "border-l-2 border-l-india-green bg-india-green/5" : ""}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-saffron-gradient text-sm font-bold text-white shadow-soft">{(c.user_name ?? "U")[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-semibold">{c.user_name ?? "User"}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-foreground/80">{c.subject}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] font-bold text-muted-foreground">{c.ticket_no}</span>
                      {listTab === "resolved"
                        ? (c.rating != null
                            ? <Stars rating={c.rating} size={3} />
                            : <span className="text-[10px] font-semibold text-amber-600">awaiting rating</span>)
                        : <Circle className="h-2 w-2 fill-india-green text-india-green" />}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Conversation pane */}
        <div className={`flex h-full flex-col ${sel ? "flex" : "hidden md:flex"}`}>
          {!sel ? <div className="grid flex-1 place-items-center text-sm text-muted-foreground"><div className="text-center"><MessageCircle className="mx-auto mb-2 h-10 w-10 opacity-30" />Select a chat to start replying</div></div>
            : <>
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
                <button onClick={() => setSel(null)} className="md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-saffron-gradient text-sm font-bold text-white">{(sel.user_name ?? "U")[0]}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{sel.user_name} <span className="font-normal text-muted-foreground">· {sel.subject}</span></p><p className="text-[11px] text-muted-foreground">{sel.user_role} · {sel.ticket_no} · <span className={`rounded-full px-1.5 text-[10px] font-bold capitalize ${tone[sel.status]}`}>{sel.status.replace("_", " ")}</span></p></div>
                {filter === "live-admin" && <div className="hidden items-center gap-1 sm:flex"><select className="h-9 max-w-[150px] rounded-lg border border-border bg-background px-2 text-xs" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Assign to…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><Button size="sm" variant="outline" onClick={assign}>Assign</Button></div>}
                {sel.rating
                  ? <span className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1" title={sel.rating_comment ?? undefined}><Stars rating={sel.rating} /><span className="text-[11px] font-bold">{sel.rating}/5</span></span>
                  : !["resolved", "closed"].includes(sel.status)
                    ? <Button size="sm" variant="outline" onClick={() => setStatus("resolved")}><CheckCircle2 className="h-4 w-4" /> Resolve</Button>
                    : <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Resolved — awaiting rating</span>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-[#f7f7f5] p-3">
                {msgs.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">No messages yet. Say hello 👋</p>
                  : msgs.map((m) => { const mine = m.sender_id === sel.user_id; return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-soft ${mine ? "rounded-br-sm bg-[#dcf8c6]" : "rounded-bl-sm bg-white"}`}>
                        {!mine && <p className="mb-0.5 text-[10px] font-bold text-india-green">{m.sender_name || "User"}</p>}
                        <p className="whitespace-pre-wrap break-words text-foreground">{m.body}</p>
                        <p className="mt-0.5 text-right text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>); })}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-border p-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Type a message" className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
                <button onClick={send} disabled={sending || !text.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-india-green text-white hover:bg-india-green/90 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </div>
            </>}
        </div>
      </div>
    </div>
  );
}
