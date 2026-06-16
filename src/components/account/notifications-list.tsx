import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago"; return new Date(iso).toLocaleDateString("en-IN");
}

export function NotificationsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await supabase.from("notifications").select("id,type,title,body,link,read,created_at").order("created_at", { ascending: false }).limit(100);
      setRows(data ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const markAll = async () => { setRows((xs) => xs.map((n) => ({ ...n, read: true }))); await supabase.from("notifications").update({ read: true }).eq("read", false); };
  const markOne = async (id: string) => { setRows((xs) => xs.map((n) => n.id === id ? { ...n, read: true } : n)); await supabase.from("notifications").update({ read: true }).eq("id", id); };
  const unread = rows.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
        {unread > 0 && <Button size="sm" variant="outline" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading ? <div className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          : rows.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />No notifications yet</div>
          : rows.map((n) => (
            <Link key={n.id} to={(n.link || "/dashboard") as never} onClick={() => markOne(n.id)} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 ${n.read ? "" : "bg-saffron/[0.04]"}`}>
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-india-green/10 text-india-green"><Bell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{n.title}</p><span className="shrink-0 text-[10px] text-muted-foreground">{rel(n.created_at)}</span></div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron" />}
            </Link>
          ))}
      </div>
    </div>
  );
}
