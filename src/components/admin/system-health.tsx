import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2, RefreshCw, Download, Search, AlertTriangle, CheckCircle2, PlayCircle, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Mod = { key: string; name: string; category: string; status: string; since: string; last_checked: string | null; latency_ms: number | null; checks_24h: number; fails_24h: number };
type Log = { id: number; module_key: string; module_name: string | null; level: string; status: string | null; source: string; message: string; latency_ms: number | null; created_at: string };
type Inc = { id: string; module_key: string; module_name: string | null; severity: string; title: string; detail: string | null; started_at: string; resolved_at: string | null };

const tone: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  down: "bg-rose-100 text-rose-700",
};
const lvlTone: Record<string, string> = {
  info: "bg-slate-100 text-slate-600",
  warn: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
};

/**
 * System Health — the platform scanner. Every module is probed on a schedule;
 * this screen shows current state, open incidents and the full per-module log.
 */
export function SystemHealth() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [overall, setOverall] = useState("ok");
  const [logs, setLogs] = useState<Log[]>([]);
  const [incidents, setIncidents] = useState<Inc[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [modFilter, setModFilter] = useState<string>("");
  const [lvlFilter, setLvlFilter] = useState<string>("");
  const [srcFilter, setSrcFilter] = useState<string>("");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: sum }, { data: lg }, { data: inc }] = await Promise.all([
      (supabase as any).rpc("public_health_summary"),
      (supabase as any).rpc("admin_health_log", { p_module: modFilter || null, p_level: lvlFilter || null, p_limit: 500, p_source: srcFilter || null }),
      (supabase as any).rpc("admin_incidents", { p_open_only: false, p_limit: 50 }),
    ]);
    if (sum) { setMods(sum.modules ?? []); setOverall(sum.overall ?? "ok"); }
    setLogs((lg as Log[]) ?? []);
    setIncidents((inc as Inc[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [modFilter, lvlFilter, srcFilter]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke("health-scan", { body: {} });
      if (error) throw new Error(error.message);
      toast.success("Scan complete", { description: "All modules were checked just now." });
      await load();
    } catch (e: any) {
      toast.error("Scan failed", { description: e.message });
    } finally { setScanning(false); }
  };

  const filteredLogs = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? logs.filter((l) => (l.message + l.module_key).toLowerCase().includes(s)) : logs;
  }, [logs, q]);

  const openInc = incidents.filter((i) => !i.resolved_at);
  const down = mods.filter((m) => m.status === "down").length;
  const warn = mods.filter((m) => m.status === "warn").length;

  const exportCsv = () => {
    const head = ["Time", "Module", "Level", "Status", "Source", "Message", "Latency (ms)"];
    const body = filteredLogs.map((l) => [
      new Date(l.created_at).toLocaleString("en-IN"), l.module_name ?? l.module_key,
      l.level, l.status ?? "", l.source, l.message, l.latency_ms ?? "",
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `system-health-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const uptime = (m: Mod) => m.checks_24h ? Math.round(((m.checks_24h - m.fails_24h) / m.checks_24h) * 100) : 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Activity className="h-5 w-5 text-admin" /> System Health</h2>
          <p className="text-sm text-muted-foreground">Automatic scanner runs every 5 minutes. Every check is logged per module, and admins are alerted the moment something breaks.</p>
        </div>
        <div className="flex gap-2">
          <a href="/logs" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
            <Server className="h-4 w-4" /> Platform logs
          </a>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={runScan} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white disabled:opacity-50">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Run scan now
          </button>
        </div>
      </div>

      {/* overall banner */}
      <div className={`rounded-2xl border p-4 shadow-soft ${overall === "ok" ? "border-emerald-200 bg-emerald-50" : overall === "warn" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {overall === "ok" ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <AlertTriangle className="h-6 w-6 text-amber-600" />}
            <div>
              <p className="text-base font-extrabold">
                {overall === "ok" ? "All systems operational" : overall === "warn" ? "Degraded performance" : "Outage detected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mods.length} modules monitored · {down} down · {warn} degraded · {openInc.length} open incident(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* module grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mods.map((m) => (
          <button key={m.key} onClick={() => setModFilter(m.key === modFilter ? "" : m.key)}
            className={`rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:shadow-elev ${modFilter === m.key ? "border-india-green" : "border-border"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{m.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.category}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone[m.status]}`}>{m.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Uptime 24h: <b className="text-foreground">{uptime(m)}%</b></span>
              {m.latency_ms != null && <span>{m.latency_ms}ms</span>}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Checked {m.last_checked ? new Date(m.last_checked).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </button>
        ))}
      </div>

      {/* incidents */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-bold">Incidents ({openInc.length} open)</p>
        {incidents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No incidents recorded. </p>
        ) : (
          <div className="divide-y divide-border">
            {incidents.slice(0, 10).map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-[11px] text-muted-foreground">{i.detail}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">{new Date(i.started_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${i.resolved_at ? "bg-emerald-100 text-emerald-700" : tone[i.severity]}`}>
                    {i.resolved_at ? "Resolved" : "Open"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* log */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">Activity log {modFilter && <span className="text-india-green">· {mods.find((m) => m.key === modFilter)?.name}</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search log…" className="h-9 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
            </div>
            <select value={modFilter} onChange={(e) => setModFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">All modules</option>
              {mods.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
            <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">All activity</option>
              <option value="app">User / system activity</option>
              <option value="scanner">Health checks</option>
            </select>
            <select value={lvlFilter} onChange={(e) => setLvlFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">All levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
        ) : filteredLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No log entries match.</p>
        ) : (
          <div className="max-h-[460px] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2 text-right">Latency</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold">{l.module_name ?? l.module_key}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${lvlTone[l.level]}`}>{l.level}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">{l.message}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">{l.latency_ms != null ? `${l.latency_ms}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
