import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

type Msg = { id: string; sender_id: string; sender_name: string | null; sender_role: string | null; body: string; created_at: string };

export function SupportThread({ ticketId }: { ticketId: string }) {
  const me = useCurrentUser();
  const [uid, setUid] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at");
    setMsgs((data as Msg[]) ?? []); setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setUid(data.user?.id ?? ""); await load(); })(); /* eslint-disable-next-line */ }, [ticketId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({ ticket_id: ticketId, sender_id: uid, sender_name: me.name, sender_role: me.role, body: text.trim() });
    setSending(false);
    if (error) { toast.error("Couldn't send", { description: error.message }); return; }
    setText(""); load();
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-bold"><MessagesSquare className="h-4 w-4 text-india-green" /> Conversation</p>
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
          : msgs.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No replies yet.</p>
          : msgs.map((m) => { const mine = m.sender_id === uid; return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-india-green text-white" : "bg-muted"}`}>
                {!mine && <p className="mb-0.5 text-[10px] font-bold opacity-70">{m.sender_name || "User"}{m.sender_role ? ` · ${m.sender_role}` : ""}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[9px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>); })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Type a reply…" className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
        <button onClick={send} disabled={sending || !text.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-india-green px-3 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
      </div>
    </div>
  );
}
