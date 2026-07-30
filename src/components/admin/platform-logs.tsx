// BharatOne — Platform Logs (/logs)
//
// The full server-side record of what happens on the platform: every API call, page
// view, sign-in and error, with the caller's IP address, device and identity. Admin
// only — the underlying RPCs return nothing to anyone else.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity, AlertTriangle, Download, Globe, Loader2, Lock, MonitorSmartphone,
  RefreshCw, Search, Server, Users,
} from "lucide-react";

/* ------------------------------------------------------------------ types */

type AccessRow = {
  id: number; at: string; user_id: string | null; actor: string | null; actor_ref: string | null;
  role: string | null; ip: string | null; user_agent: string | null; session_id: string | null;
  kind: string; module: string | null; route: string | null; action: string;
  entity: string | null; status: string; latency_ms: number | null; detail: unknown;
};

type SessionRow = {
  session_id: string; ip: string | null; user_id: string | null; actor: string | null;
  actor_ref: string | null; role: string | null; user_agent: string | null;
  first_seen: string; last_seen: string; events: number; pages: number;
  failures: number; routes: string | null;
};

type HealthRow = {
  created_at: string; module_key: string; module_name?: string; status: string;
  level: string | null; message: string; source: string; latency_ms: number | null;
};

type Stats = {
  events_24h: number; events_1h: number; failures_24h: number; users_24h: number;
  ips_24h: number; last_event: string | null;
  by_kind?: { kind: string; n: number }[];
  by_module?: { module: string; n: number }[];
  top_routes?: { route: string; n: number }[];
};

/* ------------------------------------------------------------------ helpers */

const fmt = (t: string) =>
  new Date(t).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

const ago = (t: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/** Compact, readable device string from a user agent. */
function device(ua: string | null): string {
  if (!ua) return "—";
  const os =
    /Windows NT 10/.test(ua) ? "Windows" :
    /Windows/.test(ua) ? "Windows" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "";
  const br =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" :
    /bot|crawl|spider/i.test(ua) ? "Bot" : "";
  return [br, os].filter(Boolean).join(" · ") || ua.slice(0, 28);
}

const KIND_STYLE: Record<string, string> = {
  page: "bg-sky-50 text-sky-700 border-sky-200",
  api: "bg-slate-50 text-slate-600 border-slate-200",
  auth: "bg-violet-50 text-violet-700 border-violet-200",
  action: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  fail: "bg-red-50 text-red-700 border-red-200",
  down: "bg-red-50 text-red-700 border-red-200",
};

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const cell = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  return [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => cell(r[h])).join(",")))
    .join("\n");
}

function download(name: string, body: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------------ page */

type Tab = "requests" | "sessions" | "system";

export function PlatformLogs() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("requests");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const [rows, setRows] = useState<AccessRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  // filters
  const [kind, setKind] = useState("");
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [ip, setIp] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(300);
  const [hours, setHours] = useState(24);
  const [live, setLive] = useState(true);

  const modules = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.module && set.add(r.module));
    (stats?.by_module ?? []).forEach((m) => m.module && m.module !== "-" && set.add(m.module));
    return [...set].sort();
  }, [rows, stats]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setAllowed(false); return; }

      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const [{ data: s }, { data: log }] = await Promise.all([
        (supabase as any).rpc("admin_access_stats"),
        (supabase as any).rpc("admin_access_log", {
          p_limit: limit,
          p_kind: kind || null,
          p_module: module || null,
          p_status: status || null,
          p_ip: ip || null,
          p_q: q || null,
          p_since: since,
        }),
      ]);

      // admin_access_stats returns NULL to anyone who is not an administrator.
      if (s == null) { setAllowed(false); return; }
      setAllowed(true);
      setStats(s as Stats);
      setRows((log ?? []) as AccessRow[]);

      if (tab === "sessions") {
        const { data: ss } = await (supabase as any).rpc("admin_access_sessions", {
          p_hours: hours, p_limit: 200,
        });
        setSessions((ss ?? []) as SessionRow[]);
      }
      if (tab === "system") {
        const { data: hh } = await (supabase as any).rpc("admin_health_log", {
          p_module: null, p_level: null, p_limit: 400, p_source: null,
        });
        setHealth((hh ?? []) as HealthRow[]);
      }
    } catch {
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [kind, module, status, ip, q, limit, hours, tab]);

  useEffect(() => { void load(); }, [load]);

  // Live tail
  const liveRef = useRef(load);
  liveRef.current = load;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void liveRef.current(), 15000);
    return () => clearInterval(t);
  }, [live]);

  /* ------------------------------------------------------------ gates */

  if (allowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-4 text-lg font-semibold">Administrators only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The platform log contains IP addresses and customer activity. Sign in with an
            administrator account to view it.
          </p>
          <Button className="mt-5 w-full" onClick={() => { window.location.href = "/admin-login"; }}>
            Go to admin sign-in
          </Button>
        </div>
      </div>
    );
  }

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  /* ------------------------------------------------------------ render */

  const cards = [
    { icon: Activity, label: "Events (24h)", value: stats?.events_24h ?? 0, tone: "text-slate-900" },
    { icon: Server, label: "Last hour", value: stats?.events_1h ?? 0, tone: "text-slate-900" },
    { icon: AlertTriangle, label: "Failures (24h)", value: stats?.failures_24h ?? 0, tone: (stats?.failures_24h ?? 0) > 0 ? "text-red-600" : "text-slate-900" },
    { icon: Users, label: "Signed-in users", value: stats?.users_24h ?? 0, tone: "text-slate-900" },
    { icon: Globe, label: "Distinct IPs", value: stats?.ips_24h ?? 0, tone: "text-slate-900" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Server className="h-6 w-6 text-primary" /> Platform logs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every request, page view, sign-in and error — with the originating IP address and device.
              {stats?.last_event ? ` Last event ${ago(stats.last_event)}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={live ? "default" : "outline"} size="sm"
              onClick={() => setLive((v) => !v)}
            >
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${live ? "animate-pulse bg-white" : "bg-slate-400"}`} />
              {live ? "Live" : "Paused"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => {
                if (tab === "sessions") {
                  download(`bharatone-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
                    toCsv(sessions as unknown as Record<string, unknown>[],
                      ["last_seen", "first_seen", "ip", "actor", "actor_ref", "role", "user_agent", "events", "pages", "failures", "routes"]));
                } else if (tab === "system") {
                  download(`bharatone-system-events-${new Date().toISOString().slice(0, 10)}.csv`,
                    toCsv(health as unknown as Record<string, unknown>[],
                      ["created_at", "module_key", "status", "level", "source", "message", "latency_ms"]));
                } else {
                  download(`bharatone-access-log-${new Date().toISOString().slice(0, 10)}.csv`,
                    toCsv(rows.map((r) => ({ ...r, detail: JSON.stringify(r.detail ?? "") })) as unknown as Record<string, unknown>[],
                      ["at", "ip", "actor", "actor_ref", "role", "kind", "module", "action", "route", "entity", "status", "latency_ms", "user_agent", "session_id", "detail"]));
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {/* stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <c.icon className="h-3.5 w-3.5" /> {c.label}
              </div>
              <div className={`mt-1.5 text-2xl font-bold tabular-nums ${c.tone}`}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="mt-6 flex gap-1 rounded-xl border bg-white p-1 shadow-sm sm:w-fit">
          {([
            ["requests", "Requests & activity"],
            ["sessions", "Sessions & IPs"],
            ["system", "System events"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* filters */}
        {tab !== "system" && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search action, person, route, IP…" className="pl-9"
              />
            </div>
            {tab === "requests" && (
              <>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">All types</option>
                  <option value="page">Page views</option>
                  <option value="api">API calls</option>
                  <option value="auth">Sign-in / out</option>
                  <option value="action">Actions</option>
                  <option value="error">Errors</option>
                </select>
                <select value={module} onChange={(e) => setModule(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">All modules</option>
                  {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Any outcome</option>
                  <option value="ok">Success</option>
                  <option value="fail">Failed</option>
                  <option value="warn">Warning</option>
                </select>
                <Input
                  value={ip} onChange={(e) => setIp(e.target.value)}
                  placeholder="Filter by IP" className="h-10 w-[150px]"
                />
              </>
            )}
            <select value={hours} onChange={(e) => setHours(+e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
              <option value={1}>Last hour</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
              <option value={720}>Last 30 days</option>
            </select>
            {tab === "requests" && (
              <select value={limit} onChange={(e) => setLimit(+e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
                <option value={300}>300 rows</option>
                <option value={1000}>1000 rows</option>
                <option value={2000}>2000 rows</option>
              </select>
            )}
          </div>
        )}

        {/* ------------------------------------------------ requests */}
        {tab === "requests" && (
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Time</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Who</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">IP address</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Device</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Type</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Module</th>
                    <th className="px-3 py-2.5 font-bold">What happened</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-14 text-center text-muted-foreground">
                      No entries for these filters.
                    </td></tr>
                  )}
                  {rows.map((r) => (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="cursor-pointer border-t hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{fmt(r.at)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {r.actor ? (
                            <>
                              <span className="font-semibold">{r.actor}</span>
                              {r.actor_ref && <span className="ml-1.5 text-xs text-muted-foreground">{r.actor_ref}</span>}
                              {r.role && <div className="text-[11px] text-muted-foreground">{r.role}</div>}
                            </>
                          ) : <span className="text-muted-foreground">Visitor</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.ip ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MonitorSmartphone className="h-3 w-3" />{device(r.user_agent)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${KIND_STYLE[r.kind] ?? ""}`}>{r.kind}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium">{r.module || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.action}</div>
                          {(r.route || r.entity) && (
                            <div className="text-[11px] text-muted-foreground">
                              {r.route}{r.entity ? ` · ${r.entity}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</Badge>
                          {r.latency_ms != null && (
                            <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">{r.latency_ms}ms</span>
                          )}
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr className="border-t bg-slate-50/70">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                              <div><div className="font-semibold text-muted-foreground">Session</div><div className="font-mono">{r.session_id || "—"}</div></div>
                              <div><div className="font-semibold text-muted-foreground">User ID</div><div className="font-mono break-all">{r.user_id || "—"}</div></div>
                              <div className="lg:col-span-2"><div className="font-semibold text-muted-foreground">User agent</div><div className="break-all">{r.user_agent || "—"}</div></div>
                            </div>
                            {r.detail != null && (
                              <pre className="mt-3 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{JSON.stringify(r.detail, null, 2)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
              {rows.length} entries · click any row for the full detail, session and device
            </div>
          </div>
        )}

        {/* ------------------------------------------------ sessions */}
        {tab === "sessions" && (
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Last seen</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">IP address</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Who</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Device</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Started</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Events</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Pages</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Failures</th>
                    <th className="px-3 py-2.5 font-bold">Journey</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-14 text-center text-muted-foreground">No sessions in this window.</td></tr>
                  )}
                  {sessions.map((s) => (
                    <tr key={s.session_id} className="border-t hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fmt(s.last_seen)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                          onClick={() => { setIp(s.ip ?? ""); setTab("requests"); }}
                        >
                          {s.ip ?? "—"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {s.actor ? (
                          <>
                            <span className="font-semibold">{s.actor}</span>
                            {s.actor_ref && <span className="ml-1.5 text-xs text-muted-foreground">{s.actor_ref}</span>}
                            {s.role && <div className="text-[11px] text-muted-foreground">{s.role}</div>}
                          </>
                        ) : <span className="text-muted-foreground">Anonymous visitor</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{device(s.user_agent)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{fmt(s.first_seen)}</td>
                      <td className="px-3 py-2 tabular-nums">{s.events}</td>
                      <td className="px-3 py-2 tabular-nums">{s.pages}</td>
                      <td className={`px-3 py-2 tabular-nums ${s.failures > 0 ? "font-semibold text-red-600" : ""}`}>{s.failures}</td>
                      <td className="max-w-[380px] px-3 py-2 text-[11px] text-muted-foreground">{s.routes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ system events */}
        {tab === "system" && (
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Time</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Module</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Source</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-bold">Status</th>
                    <th className="px-3 py-2.5 font-bold">Event</th>
                  </tr>
                </thead>
                <tbody>
                  {health.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-14 text-center text-muted-foreground">No system events.</td></tr>
                  )}
                  {health.map((h, i) => (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{fmt(h.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{h.module_name || h.module_key}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{h.source}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[h.status] ?? ""}`}>{h.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {h.message}
                        {h.latency_ms != null && <span className="ml-2 text-[11px] text-muted-foreground">{h.latency_ms}ms</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          IP addresses and devices are recorded server-side and cannot be altered from the browser.
          Entries are kept for 90 days, then deleted automatically.
        </p>
      </div>
    </div>
  );
}

export default PlatformLogs;
