import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, FileClock, Filter, Search, ShieldCheck, UserRound } from "lucide-react";
import { getAdminAuditLogs } from "@/lib/admin-audit.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChangeSet = Record<string, unknown> | null;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Changes({ before, after }: { before: ChangeSet; after: ChangeSet }) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  if (!keys.length) return <span className="text-muted-foreground">No field changes</span>;
  return <div className="space-y-1.5">{keys.slice(0, 4).map((key) => <div key={key} className="grid grid-cols-[100px_minmax(0,1fr)] gap-2"><span className="truncate font-mono text-[9px] text-muted-foreground">{key}</span><span className="min-w-0 text-[10px]"><span className="line-through opacity-55">{formatValue(before?.[key])}</span><span className="mx-1.5 text-admin">→</span><span className="font-bold">{formatValue(after?.[key])}</span></span></div>)}</div>;
}

export function AdminAuditLog() {
  const loadLogs = useServerFn(getAdminAuditLogs);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("All modules");
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-audit-logs"], queryFn: () => loadLogs() });
  const logs = data?.logs ?? [];
  const modules = useMemo(() => ["All modules", ...Array.from(new Set(logs.map((log) => log.module)))], [logs]);
  const filtered = useMemo(() => logs.filter((log) => {
    const matchesModule = module === "All modules" || log.module === module;
    const haystack = `${log.actor_name} ${log.module} ${log.action} ${log.target_type ?? ""} ${log.target_id ?? ""}`.toLowerCase();
    return matchesModule && haystack.includes(query.toLowerCase());
  }), [logs, module, query]);

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-border bg-admin-panel text-admin-panel-foreground shadow-elev">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-6"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-admin">Immutable governance ledger</p><h2 className="mt-2 font-display text-2xl font-extrabold">Administrative audit trail</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-admin-panel-foreground/55">Trace every privileged operation with accountable identity, exact time, affected module, target, and field-level before/after evidence.</p></div><div className="flex items-center gap-3 rounded-xl border border-admin-success/20 bg-admin-success/10 px-4 py-3"><ShieldCheck className="h-5 w-5 text-admin-success" /><div><p className="text-[10px] font-extrabold text-admin-success">TAMPER PROTECTION ACTIVE</p><p className="text-[9px] text-admin-panel-foreground/45">Records cannot be edited or deleted</p></div></div></div>
      <div className="grid grid-cols-2 border-t border-admin-panel-foreground/10 lg:grid-cols-4">{[{ label: "Events retained", value: logs.length.toLocaleString("en-IN"), icon: FileClock }, { label: "Administrators", value: new Set(logs.map((log) => log.actor_name)).size.toString(), icon: UserRound }, { label: "Modules touched", value: new Set(logs.map((log) => log.module)).size.toString(), icon: Filter }, { label: "Successful actions", value: `${logs.length ? Math.round(logs.filter((log) => log.outcome === "success").length / logs.length * 100) : 100}%`, icon: CheckCircle2 }].map((item) => { const Icon = item.icon; return <div key={item.label} className="border-r border-admin-panel-foreground/10 p-4 last:border-r-0"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-wider text-admin-panel-foreground/40">{item.label}</p><Icon className="h-4 w-4 text-admin-panel-foreground/35" /></div><p className="mt-2 font-display text-2xl font-extrabold">{item.value}</p></div>; })}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, action, target or module…" className="pl-9" /></div><select value={module} onChange={(event) => setModule(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-xs outline-none">{modules.map((item) => <option key={item}>{item}</option>)}</select><Button variant="outline" onClick={() => refetch()}><Clock3 /> Refresh ledger</Button></div>
      {isLoading ? <div className="grid min-h-64 place-items-center text-xs text-muted-foreground">Loading protected audit history…</div> : error ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-8 w-8 text-admin-warning" /><p className="mt-3 text-sm font-bold">Secure administrator session required</p><p className="mt-1 max-w-md text-xs text-muted-foreground">Audit history is available only to authenticated accounts assigned the administrator role.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead className="bg-muted/45 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Timestamp", "Administrator", "Module", "Action / target", "Before → after", "Outcome"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map((log) => <tr key={log.id} className="align-top text-[11px] transition hover:bg-muted/30"><td className="whitespace-nowrap px-4 py-4 font-mono text-[10px]"><p>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(log.created_at))}</p><p className="mt-1 text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(new Date(log.created_at))}</p></td><td className="px-4 py-4 font-bold">{log.actor_name}</td><td className="px-4 py-4"><span className="rounded-full bg-admin-soft px-2 py-1 text-[9px] font-extrabold text-admin">{log.module}</span></td><td className="px-4 py-4"><p className="font-extrabold">{log.action}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">{log.target_type ?? "System"}{log.target_id ? ` · ${log.target_id}` : ""}</p></td><td className="max-w-md px-4 py-4"><Changes before={log.before_changes as ChangeSet} after={log.after_changes as ChangeSet} /></td><td className="px-4 py-4"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", log.outcome === "success" ? "bg-admin-success-soft text-admin-success" : "bg-admin-danger-soft text-admin-danger")}>{log.outcome}</span></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="px-4 py-16 text-center text-xs text-muted-foreground">No audit events match the selected filters.</td></tr>}</tbody></table></div>}
    </section>
  </div>;
}