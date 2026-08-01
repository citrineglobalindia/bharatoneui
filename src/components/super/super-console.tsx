// BharatOne — Super Admin console.
//
// Three things live here and nowhere else: the module switches, System Health,
// and the record of what the super admin has done. Everything an ordinary
// administrator can do is still done in the admin workspace — a verified super
// admin passes every admin check, so there is no second copy of those screens to
// drift out of step.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, RefreshCw, ToggleLeft, ToggleRight, Activity,
  ScrollText, LogOut, Clock3, Search, LayoutDashboard, AlertTriangle, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { superState, clearSuperCache, clearModuleCache } from "@/lib/super-admin";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { SystemHealth } from "@/components/admin/system-health";

const db = supabase as any;

type Module = {
  key: string; label: string; area: string; enabled: boolean;
  note: string | null; path: string | null;
  sort_order: number; updated_at: string; updated_by_name: string | null;
};
type Audit = { at: string; action: string; detail: any; ip: string | null };

type Tab = "modules" | "health" | "audit";

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

export function SuperConsole() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<null | boolean>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("modules");

  useEffect(() => {
    superState(true).then((s) => {
      setReady(s.is_super);
      setExpires(s.expires_at);
      if (!s.is_super) navigate({ to: "/super-login" as never, replace: true });
    });
  }, [navigate]);

  const signOut = async () => {
    await db.rpc("super_end_session");   // drops the second factor immediately
    await supabase.auth.signOut();
    clearSuperCache(); clearModuleCache();
    navigate({ to: "/super-login" as never, replace: true });
  };

  if (ready === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-india-green" />
      </div>
    );
  }
  if (!ready) return null;

  const TABS: { k: Tab; label: string; icon: any }[] = [
    { k: "modules", label: "Modules", icon: LayoutDashboard },
    { k: "health", label: "System Health", icon: Activity },
    { k: "audit", label: "Activity", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-slate-900">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-3">
          <BharatOneLogo size="sm" className="brightness-0 invert" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <ShieldCheck className="h-3 w-3" /> Super Admin
          </span>
          {expires && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
              <Clock3 className="h-3 w-3" />
              Session ends {new Date(expires).toLocaleTimeString("en-IN",
                { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <a href="/admin"
              className="inline-flex h-9 items-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10">
              Admin workspace
            </a>
            <button onClick={signOut}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6">
        <div className="mb-5 flex w-fit rounded-lg border border-border bg-card p-1">
          {TABS.map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                tab === k ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "modules" && <Modules />}
        {tab === "health" && <SystemHealth />}
        {tab === "audit" && <AuditTrail />}
      </div>
    </div>
  );
}

/* ── module switches ──────────────────────────────────────────────────── */

function Modules() {
  const [rows, setRows] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("super_modules_list");
    if (error) toast.error("Could not load modules", { description: error.message });
    setRows((data as Module[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (m: Module) => {
    const note = m.enabled
      ? window.prompt(`Switching off "${m.label}". Why? (optional — shown here only)`) ?? ""
      : "";
    setBusy(m.key);
    const { data, error } = await db.rpc("super_set_module", {
      _key: m.key, _enabled: !m.enabled, _note: note || null,
    });
    setBusy(null);
    if (error || !data?.ok) {
      return toast.error("Could not change it", { description: error?.message ?? data?.message });
    }
    clearModuleCache();
    toast.success(m.enabled ? `${m.label} switched off` : `${m.label} switched on`, {
      description: m.enabled
        ? "It disappears from menus for everyone else. You keep access."
        : undefined,
    });
    load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.label} ${r.area} ${r.key}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);

  const areas = useMemo(() => {
    const m = new Map<string, Module[]>();
    for (const r of shown) {
      if (!m.has(r.area)) m.set(r.area, []);
      m.get(r.area)!.push(r);
    }
    return [...m.entries()];
  }, [shown]);

  const offCount = rows.filter((r) => !r.enabled).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Modules</h2>
          <p className="text-sm text-muted-foreground">
            Everything an administrator can open, and everything the other portals contain,
            listed in one place. Switching a module off removes it from menus and blocks its
            pages for everyone else — you keep access, so you can check it first.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {offCount > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          {offCount} module{offCount > 1 ? "s are" : " is"} switched off for everyone but you.
        </p>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input className={`${inp} pl-9`} placeholder="Search modules"
               value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : areas.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing matches that search.
        </p>
      ) : (
        <div className="space-y-4">
          {areas.map(([area, list]) => (
            <section key={area} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                <h3 className="text-sm font-bold">{area}</h3>
              </div>
              <ul className="divide-y divide-border">
                {list.map((m) => (
                  <li key={m.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.label}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{m.key}</p>
                      {!m.enabled && m.note && (
                        <p className="mt-0.5 text-[11px] text-amber-700">{m.note}</p>
                      )}
                      {!m.enabled && m.updated_by_name && (
                        <p className="text-[10px] text-muted-foreground">
                          Switched off by {m.updated_by_name} on{" "}
                          {new Date(m.updated_at).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                    {m.path && (
                      <a href={m.path} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    )}
                    <button onClick={() => toggle(m)} disabled={busy === m.key}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                        m.enabled
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200"}`}>
                      {busy === m.key
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : m.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {m.enabled ? "On" : "Off"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── audit ────────────────────────────────────────────────────────────── */

function AuditTrail() {
  const [rows, setRows] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.rpc("super_audit", { _limit: 300 });
    setRows((data as Audit[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Every super-admin action. The account that can do anything should be the most
            closely recorded on the platform, not the least.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">When</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Detail</th>
                <th className="px-3 py-2.5">From</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(r.at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{r.action}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.detail ? JSON.stringify(r.detail) : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SuperConsole;
