import { useEffect, useMemo, useState } from "react";
import { FileClock, Search, Loader2, RefreshCw, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = { id: string; actor_name: string | null; action: string; entity_type: string | null; entity_id: string | null; summary: string | null; created_at: string };

const actionTone = (a: string) => a.includes("delete") || a.includes("reject") ? "bg-rose-100 text-rose-700"
  : a.includes("status") || a.includes("update") ? "bg-amber-100 text-amber-700"
  : a.includes("create") || a.includes("verified") || a.includes("insert") ? "bg-emerald-100 text-emerald-700"
  : "bg-slate-100 text-slate-700";

export function AdminAuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      setRows((data as Row[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => rows.filter((r) =>
    (type === "all" || r.entity_type === type) &&
    (!q || [r.actor_name, r.action, r.summary, r.entity_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
  ), [rows, q, type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><FileClock className="h-5 w-5 text-admin" /> Audit Log</h2><p className="text-sm text-muted-foreground">Every operation across the platform, with who did it and when.</p></div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-64 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search actor, action, detail…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm capitalize" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All modules</option>{types.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Details</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No audit entries yet.</td></tr>
              : filtered.map((r) => (<tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[10px] font-bold"><UserRound className="h-3.5 w-3.5" /></span>{r.actor_name ?? "System"}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${actionTone(r.action)}`}>{r.action}</span></td>
                <td className="px-3 py-2 capitalize text-muted-foreground">{(r.entity_type ?? "—").replace("_", " ")}</td>
                <td className="px-3 py-2">{r.summary ?? "—"}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
