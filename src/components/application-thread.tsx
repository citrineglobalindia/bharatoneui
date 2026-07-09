import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, MessagesSquare, Paperclip, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

type Msg = { id: string; sender_id: string; sender_name: string | null; sender_role: string | null; body: string; created_at: string; attachment_path: string | null; attachment_name: string | null };

async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600);
  if (error || !data) { toast.error("Could not open attachment"); return; }
  window.open(data.signedUrl, "_blank");
}

export function ApplicationThread({ applicationId, title = "Chat with operator" }: { applicationId: string; title?: string }) {
  const me = useCurrentUser();
  const [uid, setUid] = useState<string>("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase.from("application_messages").select("*").eq("application_id", applicationId).order("created_at");
    setMsgs((data as Msg[]) ?? []); setLoading(false);
  }
  useEffect(() => { let on = true; (async () => { const { data } = await supabase.auth.getUser(); if (on) setUid(data.user?.id ?? ""); await load(); })(); const t = setInterval(load, 6000); return () => { on = false; clearInterval(t); }; /* eslint-disable-next-line */ }, [applicationId]);

  const insertMsg = async (fields: Partial<Msg>) => {
    const { error } = await supabase.from("application_messages").insert({
      application_id: applicationId, sender_id: uid, sender_name: me.name, sender_role: me.role, body: fields.body ?? "",
      attachment_path: fields.attachment_path ?? null, attachment_name: fields.attachment_name ?? null,
    });
    if (error) { toast.error("Couldn't send", { description: error.message }); return false; }
    return true;
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const ok = await insertMsg({ body: text.trim() });
    setSending(false);
    if (ok) { setText(""); load(); }
  };

  const sendFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large", { description: "Maximum 25 MB." }); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${applicationId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { toast.error("Upload failed", { description: error.message }); return; }
      const ok = await insertMsg({ body: text.trim(), attachment_path: path, attachment_name: file.name });
      if (ok) { setText(""); load(); toast.success("Attachment sent"); }
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-bold"><MessagesSquare className="h-4 w-4 text-india-green" /> {title}</p>
      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
          : msgs.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No messages yet. Start the conversation below.</p>
          : msgs.map((m) => {
            const mine = m.sender_id === uid;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-india-green text-white" : "bg-muted"}`}>
                  {!mine && <p className="mb-0.5 text-[10px] font-bold opacity-70">{m.sender_name || "User"}{m.sender_role ? ` · ${m.sender_role}` : ""}</p>}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachment_path && (
                    <button onClick={() => openAttachment(m.attachment_path!)} className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${mine ? "bg-white/20 text-white hover:bg-white/30" : "border border-border bg-card text-india-green hover:bg-muted"}`}>
                      <Download className="h-3.5 w-3.5" /> {m.attachment_name || "Attachment"}
                    </button>
                  )}
                  <p className={`mt-0.5 text-[9px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <label className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border hover:bg-muted" title="Attach a file">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Paperclip className="h-4 w-4 text-muted-foreground" />}
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
        </label>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Type a message…" className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
        <button onClick={send} disabled={sending || !text.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-india-green px-3 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
      </div>
    </div>
  );
}
