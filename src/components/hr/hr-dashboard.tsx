// BharatOne HR — Dashboard
//
// Every figure here is read from the live HR data. Nothing is illustrative: if a
// number looks wrong it is telling you something real about the records.
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, CalendarDays, Clock, Cake, Palmtree, UserPlus, ShieldAlert,
  Loader2, RefreshCw, ArrowRight, CheckCircle2, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Dash = {
  headcount: number; active: number; probation: number; exiting: number;
  pending_leave: number; not_marked_today: number;
  on_leave_today: { name: string; type: string }[];
  by_department: { department: string; n: number }[];
  upcoming_holidays: { on: string; name: string; optional: boolean }[];
  birthdays: { name: string; dob: string }[];
  joining_soon: { name: string; on: string }[];
  policies_awaiting_ack: { title: string; done: number; total: number }[];
};

const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const dayMonth = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "long" });

export function HrDashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data: res } = await db.rpc("hr_dashboard");
    setData((res as Dash) ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>;
  }
  if (!data) {
    return (
      <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        You do not have access to HR data.
      </p>
    );
  }

  const needsAttention =
    data.pending_leave > 0 || data.not_marked_today > 0 ||
    data.policies_awaiting_ack.some((p) => p.done < p.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Users className="h-5 w-5 text-india-green" /> HR Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Headcount" value={data.headcount} icon={Users} hint={`${data.active} active`} />
        <Stat label="On probation" value={data.probation} icon={Clock}
              tone={data.probation ? "text-amber-600" : ""} />
        <Stat label="Leave to approve" value={data.pending_leave} icon={CalendarDays}
              tone={data.pending_leave ? "text-amber-600" : ""} to="/hr/leave" />
        <Stat label="Not marked today" value={data.not_marked_today} icon={ShieldAlert}
              tone={data.not_marked_today ? "text-rose-600" : "text-emerald-600"} to="/hr/attendance" />
      </div>

      {!needsAttention && (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Nothing needs your attention right now.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="On leave today" icon={Palmtree} count={data.on_leave_today.length}>
          {data.on_leave_today.length === 0 ? (
            <Empty>Everyone is in today.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {data.on_leave_today.map((p, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.type}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Team by department" icon={Building2} count={data.by_department.length}>
          {data.by_department.length === 0 ? (
            <Empty>No departments recorded yet.</Empty>
          ) : (
            <ul className="space-y-2 p-4">
              {data.by_department.map((row) => {
                const pct = data.headcount ? Math.round((row.n / data.headcount) * 100) : 0;
                return (
                  <li key={row.department}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{row.department}</span>
                      <span className="tabular-nums text-muted-foreground">{row.n}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-india-green" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming holidays" icon={CalendarDays} count={data.upcoming_holidays.length}>
          {data.upcoming_holidays.length === 0 ? (
            <Empty>No holidays declared for the next two months. Add them in HR Settings.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {data.upcoming_holidays.slice(0, 6).map((h, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">
                    {h.name}
                    {h.optional && <span className="ml-1.5 text-[10px] text-muted-foreground">optional</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{d(h.on)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Birthdays this month" icon={Cake} count={data.birthdays.length}>
          {data.birthdays.length === 0 ? (
            <Empty>No birthdays in the next 30 days.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {data.birthdays.slice(0, 6).map((b, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{dayMonth(b.dob)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {data.joining_soon.length > 0 && (
          <Panel title="Joining soon" icon={UserPlus} count={data.joining_soon.length}>
            <ul className="divide-y divide-border">
              {data.joining_soon.map((j, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{j.name}</span>
                  <span className="text-xs text-muted-foreground">{d(j.on)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {data.policies_awaiting_ack.length > 0 && (
          <Panel title="Policies awaiting acknowledgement" icon={ShieldAlert}
                 count={data.policies_awaiting_ack.filter((p) => p.done < p.total).length}>
            <ul className="divide-y divide-border">
              {data.policies_awaiting_ack.map((p, i) => (
                <li key={i} className="px-4 py-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.title}</span>
                    <span className={`text-xs ${p.done >= p.total ? "text-emerald-600" : "text-amber-600"}`}>
                      {p.done} of {p.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-india-green"
                         style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, hint, tone, to }: {
  label: string; value: number; icon: any; hint?: string; tone?: string; to?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-india-green/40">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-3xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {to && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-india-green">
          Open <ArrowRight className="h-3 w-3" />
        </p>
      )}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Panel({ title, icon: Icon, count, children }: {
  title: string; icon: any; count?: number; children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Icon className="h-4 w-4 text-india-green" /> {title}
        </h3>
        {count != null && count > 0 && (
          <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-[11px] font-bold text-india-green">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>
);

export default HrDashboard;
