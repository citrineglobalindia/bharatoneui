import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock3, FileSearch, Loader2, XCircle, ArrowRight, LayoutDashboard } from "lucide-react";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { statusLabelOf, APPLICATION_STATUS_TONE, isOpen } from "@/lib/application-status";

export const Route = createFileRoute("/operator/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Operator Portal" }] }),
  component: Page,
});

type App = { id: string; application_no: string; service_name: string; full_name: string; status: string; created_at: string; completed_at: string | null };

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-extrabold">{value}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Operator dashboard — every figure on it comes from service_applications,
 * which RLS already scopes to the applications assigned to this operator.
 * The console remains the working screen; this is the at-a-glance view.
 */
function Page() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureStaffSession();
        const { data } = await supabase.from("service_applications")
          .select("id,application_no,service_name,full_name,status,created_at,completed_at")
          .order("created_at", { ascending: false });
        setApps((data as App[]) ?? []);
      } finally { setLoading(false); }
    })();
  }, []);

  const s = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const doneToday = apps.filter((a) => a.status === "completed" && a.completed_at && new Date(a.completed_at) >= today).length;
    const byStatus = new Map<string, number>();
    apps.forEach((a) => byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1));
    // Completions over the last 14 days, off the completed_at stamp. Rows
    // completed before the stamp existed have NULL there and appear nowhere,
    // which is honest — nobody recorded when they were finished.
    const days: { label: string; n: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d0 = new Date(today); d0.setDate(d0.getDate() - i);
      const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
      days.push({
        label: d0.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        n: apps.filter((a) => a.completed_at && new Date(a.completed_at) >= d0 && new Date(a.completed_at) < d1).length,
      });
    }
    return {
      total: apps.length,
      fresh: apps.filter((a) => a.status === "submitted").length,
      pending: apps.filter((a) => isOpen(a.status)).length,
      done: apps.filter((a) => a.status === "completed").length,
      rejected: apps.filter((a) => a.status === "rejected").length,
      doneToday,
      byStatus: Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1]),
      days,
      maxDay: Math.max(1, ...days.map((d) => d.n)),
      recent: apps.slice(0, 6),
    };
  }, [apps]);

  return (
    <OperatorShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader icon={<LayoutDashboard className="h-5 w-5" />} title="Dashboard" subtitle="Your workload at a glance — every figure is live from your assigned applications" />
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Stat icon={FileSearch} label="Total" value={s.total} tone="bg-blue-500/10 text-blue-600" />
              <Stat icon={Clock3} label="New" value={s.fresh} tone="bg-saffron/10 text-saffron" />
              <Stat icon={ClipboardList} label="Pending" value={s.pending} tone="bg-orange-500/10 text-orange-600" />
              <Stat icon={CheckCircle2} label="Finished Today" value={s.doneToday} tone="bg-india-green/10 text-india-green" />
              <Stat icon={CheckCircle2} label="Completed (all time)" value={s.done} tone="bg-emerald-500/10 text-emerald-700" />
              <Stat icon={XCircle} label="Rejected" value={s.rejected} tone="bg-rose-500/10 text-rose-600" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="mb-3 text-sm font-bold">Completions — last 14 days</p>
                <div className="flex h-32 items-end gap-1">
                  {s.days.map((d) => (
                    <div key={d.label} className="group relative flex-1">
                      <div className="mx-auto w-full rounded-t bg-india-green/70 transition group-hover:bg-india-green"
                        style={{ height: `${(d.n / s.maxDay) * 100}%`, minHeight: d.n > 0 ? 6 : 2, opacity: d.n > 0 ? 1 : 0.15 }} />
                      <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background group-hover:block">
                        {d.label}: {d.n}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{s.days[0]?.label}</span><span>{s.days[s.days.length - 1]?.label}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="mb-3 text-sm font-bold">By status</p>
                {s.byStatus.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No applications assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {s.byStatus.map(([st, n]) => (
                      <div key={st} className="flex items-center gap-2">
                        <span className={`w-40 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${APPLICATION_STATUS_TONE[st] ?? "bg-muted"}`}>{statusLabelOf(st)}</span>
                        <div className="h-2.5 flex-1 rounded-full bg-muted">
                          <div className="h-2.5 rounded-full bg-india-green/70" style={{ width: `${(n / s.total) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-bold">{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <p className="text-sm font-bold">Recent applications</p>
                <Link to={"/operator" as never} className="inline-flex items-center gap-1 text-xs font-bold text-india-green hover:underline">
                  Open console <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {s.recent.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Nothing assigned to you yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {s.recent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{a.service_name}</p>
                        <p className="text-[11px] text-muted-foreground">{a.application_no} · {a.full_name || "—"} · {new Date(a.created_at).toLocaleDateString("en-IN")}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${APPLICATION_STATUS_TONE[a.status] ?? "bg-muted"}`}>{statusLabelOf(a.status)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </OperatorShell>
  );
}
