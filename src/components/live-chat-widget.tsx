import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, X, Loader2, Headset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { SupportThread } from "@/components/support-thread";

export function LiveChatWidget() {
  const me = useCurrentUser();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setAuthed(!!data.user); })(); }, []);

  const openChat = async () => {
    setOpen(true);
    if (ticketId || loading) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { toast.error("Please sign in to use live chat"); setOpen(false); return; }
      const { data: ex } = await supabase.from("support_tickets").select("id").eq("user_id", uid).eq("category", "Live Chat").in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      let id = (ex as any)?.id as string | undefined;
      if (!id) {
        const { data: ins, error } = await supabase.from("support_tickets").insert({ user_id: uid, user_name: me.name, user_role: me.role, category: "Live Chat", priority: "Low", subject: "Live chat session", body: "Started a live chat." }).select("id").single();
        if (error) { toast.error("Couldn't start chat", { description: error.message }); setOpen(false); return; }
        id = (ins as any).id;
      }
      setTicketId(id!);
    } finally { setLoading(false); }
  };

  if (!authed) return null;
  const grad = "linear-gradient(135deg,#ff9123 0%,#138808 100%)";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-elev">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: grad }}>
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/20"><Headset className="h-4 w-4" /></span><div><p className="text-sm font-bold leading-tight">Live Chat</p><p className="text-[11px] opacity-90">We usually reply in minutes</p></div></div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-3">
            {loading || !ticketId ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</div>
              : <SupportThread ticketId={ticketId} />}
          </div>
        </div>
      )}
      <button onClick={() => (open ? setOpen(false) : openChat())} aria-label="Live chat"
        className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full text-white shadow-elev transition hover:scale-105 active:scale-95"
        style={{ background: grad }}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-india-green" />}
      </button>
    </>
  );
}
