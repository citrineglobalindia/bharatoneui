import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, PhoneCall, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { statusLabelOf, APPLICATION_STATUS_TONE, isOpen } from "@/lib/application-status";

/**
 * Work Overview for the telecaller — the first screen in this portal backed by
 * real data. Everything else in the workspace still runs on the demo dataset it
 * shipped with; these figures come from the two tables a telecaller can
 * actually read under RLS:
 *
 *   service_applications    — the retailer-filed service work
 *   retailer_registrations  — onboarding applications sitting at the
 *                             'telecaller' stage of the review workflow,
 *                             i.e. the people waiting for this team's call
 */

type App = { id: string; status: string; created_at: string; completed_at: string | null };
type Reg = { id: string; application_id: string; first_name: string | null; surname: string | null; mobile: string | null; district: string | null; created_at: string };

export function TelecallerDashboard({ onStartQueue }: { onStartQueue: () => void }) {
  const [apps, setApps] = useState<App[]>([]);
  const [queue, setQueue] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureStaffSession();
        const [a, r] = await Promise.all([
          supabase.from("service_applications").select("id,status,created_at,completed_at"),
          supabase.from("retailer_registrations")
            .select("id,application_id,first_name,surname,mobile,district,created_at")
            .eq("status", "telecaller")
            .order("created_at", { ascending: true }),
        ]);
        setApps((a.data as App[]) ?? []);
        setQueue((r.data as Reg[]) ?? []);
      } finally { setLoading(false); }
    })();
  }, []);

  const s = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byStatus = new Map<string, number>();
    apps.forEach((a) => byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1));
    return {
      totalApps: apps.length,
      open: apps.filter((a) => isOpen(a.status)).length,
      doneToday: apps.filter((a) => a.status === "completed" && a.completed_at && new Date(a.completed_at) >= today).length,
      newToday: apps.filter((a) => new Date(a.created_at) >= today).length,
      byStatus: Array.from(byStatus.entries()).sort((x, y) => y[1] - x[1]),
    };
  }, [apps]);

  if (loading) {
    return <section className="rounded-2xl border border-border bg-card p-10 text-center shadow-soft"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></section>;
  }

  const cards: Array<[string, number, any]> = [
    ["Registrations to call", queue.length, PhoneCall],
    ["Open service applications", s.open, ClipboardCheck],
    ["Received today", s.newToday, Store],
    ["Completed today", s.doneToday, CheckCircle2],
  ];

  return (
    <>
      <section className="rounded-3xl bg-navy p-6 text-hr-foreground shadow-elev lg:p-8">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Badge className="border border-hr-foreground/15 bg-hr-foreground/10 text-hr-foreground"><Store className="mr-1 h-3 w-3" /> Retailer service desk</Badge>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Work Overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-hr-foreground/65">
              Live figures from the platform: onboarding applications waiting for your verification call, and the service application pipeline.
            </p>
            <Button className="mt-5 bg-hr text-hr-foreground hover:bg-hr/90" onClick={onStartQueue}><PhoneCall /> Open call queue</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[600px]">
            {cards.map(([label, value, Icon]) => (
              <div key={label} className="rounded-2xl border border-hr-foreground/10 bg-hr-foreground/10 p-4">
                <Icon className="h-4 w-4 text-hr" />
                <p className="mt-3 text-2xl font-extrabold">{value}</p>
                <p className="text-[10px] uppercase tracking-wider text-hr-foreground/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* The real telecaller queue: onboarding applications at the telecaller
            stage of the review workflow, oldest first — they have been waiting
            longest for the call that moves them to approval. */}
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-bold">Registrations waiting for your call</p>
            <p className="text-xs text-muted-foreground">Passed accounts and QC — a verification call is the last step before approval.</p>
          </div>
          {queue.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nothing waiting — every registration has been called.</p>
          ) : (
            <ul className="divide-y divide-border">
              {queue.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold"><UserRound className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />{[r.first_name, r.surname].filter(Boolean).join(" ") || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.application_id} · {r.district || "—"} · waiting since {new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  {r.mobile
                    ? <a href={`tel:${r.mobile}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-india-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-india-green/90"><PhoneCall className="h-3.5 w-3.5" /> {r.mobile}</a>
                    : <span className="text-xs text-muted-foreground">no number</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-1 text-sm font-bold">Service applications by status</p>
          <p className="mb-3 text-xs text-muted-foreground">{s.totalApps} application(s) across the platform</p>
          {s.byStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No service applications yet.</p>
          ) : (
            <div className="space-y-2">
              {s.byStatus.map(([st, n]) => (
                <div key={st} className="flex items-center gap-2">
                  <span className={`w-40 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${APPLICATION_STATUS_TONE[st] ?? "bg-muted"}`}>{statusLabelOf(st)}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-hr" style={{ width: `${(n / Math.max(1, s.totalApps)) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-bold">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
