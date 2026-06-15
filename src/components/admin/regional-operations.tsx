import { useMemo, useState } from "react";
import {
  CalendarCheck, CheckCircle2, Download, MapPin, MessageSquare,
  Search, Store, UserCheck, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "Active" | "Pending" | "Resolved";
type Officer = {
  id: string; name: string; region: string; retailers: number;
  visitsToday: number; onboarded: number; feedback: number; attendance: "Present" | "Absent" | "Leave";
  status: Status;
};

type Role = "DRO" | "TRO";

const CONFIG: Record<Role, { label: string; scope: string; kpi: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[]; seed: Officer[] }> = {
  DRO: {
    label: "District Retail Officer",
    scope: "District-level field operations",
    kpi: [
      { label: "Active DROs", value: "34", detail: "across 12 districts", icon: UserCheck, tone: "bg-admin-soft text-admin" },
      { label: "Retailers managed", value: "5,212", detail: "+84 this week", icon: Store, tone: "bg-admin-success-soft text-admin-success" },
      { label: "Visits today", value: "286", detail: "92% of plan", icon: MapPin, tone: "bg-admin-warning-soft text-admin-warning" },
      { label: "Feedback open", value: "41", detail: "8 escalated", icon: MessageSquare, tone: "bg-admin-danger-soft text-admin-danger" },
    ],
    seed: [
      { id: "DRO-2201", name: "Ravi Shankar", region: "Bengaluru Urban", retailers: 312, visitsToday: 14, onboarded: 6, feedback: 4, attendance: "Present", status: "Active" },
      { id: "DRO-2202", name: "Meena Kumari", region: "Mysuru", retailers: 268, visitsToday: 11, onboarded: 3, feedback: 2, attendance: "Present", status: "Active" },
      { id: "DRO-2203", name: "Anil Gowda", region: "Mandya", retailers: 190, visitsToday: 0, onboarded: 0, feedback: 1, attendance: "Leave", status: "Pending" },
      { id: "DRO-2204", name: "Sushma Rao", region: "Hassan", retailers: 224, visitsToday: 9, onboarded: 4, feedback: 0, attendance: "Present", status: "Active" },
      { id: "DRO-2205", name: "Imran Pasha", region: "Tumakuru", retailers: 156, visitsToday: 7, onboarded: 2, feedback: 3, attendance: "Absent", status: "Pending" },
    ],
  },
  TRO: {
    label: "Taluk Retail Officer",
    scope: "Taluk-level field operations",
    kpi: [
      { label: "Active TROs", value: "118", detail: "across 64 taluks", icon: UserCheck, tone: "bg-admin-soft text-admin" },
      { label: "Retailers managed", value: "3,108", detail: "+52 this week", icon: Store, tone: "bg-admin-success-soft text-admin-success" },
      { label: "Visits today", value: "642", detail: "88% of plan", icon: MapPin, tone: "bg-admin-warning-soft text-admin-warning" },
      { label: "Feedback open", value: "63", detail: "11 escalated", icon: MessageSquare, tone: "bg-admin-danger-soft text-admin-danger" },
    ],
    seed: [
      { id: "TRO-7711", name: "Harshitha N", region: "Anekal", retailers: 86, visitsToday: 9, onboarded: 3, feedback: 2, attendance: "Present", status: "Active" },
      { id: "TRO-7712", name: "Vikram Singh", region: "Hoskote", retailers: 72, visitsToday: 6, onboarded: 1, feedback: 1, attendance: "Present", status: "Active" },
      { id: "TRO-7713", name: "Deepa Nair", region: "Nelamangala", retailers: 54, visitsToday: 0, onboarded: 0, feedback: 0, attendance: "Leave", status: "Pending" },
      { id: "TRO-7714", name: "Suresh Babu", region: "Yelahanka", retailers: 91, visitsToday: 12, onboarded: 5, feedback: 3, attendance: "Present", status: "Active" },
      { id: "TRO-7715", name: "Manoj Gupta", region: "Devanahalli", retailers: 48, visitsToday: 4, onboarded: 0, feedback: 2, attendance: "Absent", status: "Pending" },
    ],
  },
};

const STATUS_TONE: Record<Status, string> = {
  Active: "bg-admin-success-soft text-admin-success",
  Pending: "bg-admin-warning-soft text-admin-warning",
  Resolved: "bg-admin-soft text-admin",
};
const ATT_TONE: Record<Officer["attendance"], string> = {
  Present: "bg-admin-success-soft text-admin-success",
  Absent: "bg-admin-danger-soft text-admin-danger",
  Leave: "bg-admin-warning-soft text-admin-warning",
};

export function RegionalOperations({ role }: { role: Role }) {
  const cfg = CONFIG[role];
  const [officers, setOfficers] = useState<Officer[]>(cfg.seed);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return officers.filter((o) => {
      const matchTab = tab === "All" || (tab === "Present" ? o.attendance === "Present" : o.status === tab);
      const matchQ = !t || `${o.id} ${o.name} ${o.region}`.toLowerCase().includes(t);
      return matchTab && matchQ;
    });
  }, [officers, tab, query]);

  const resolve = (id: string) => {
    setOfficers((prev) => prev.map((o) => o.id === id ? { ...o, status: "Resolved" } : o));
    toast.success(`${id} cleared`);
  };

  const exportRows = () => {
    downloadCsv(`${role.toLowerCase()}-operations.csv`, ["ID", "Officer", "Region", "Retailers", "Visits", "Onboarded", "Feedback", "Attendance", "Status"],
      officers.map((o) => [o.id, o.name, o.region, String(o.retailers), String(o.visitsToday), String(o.onboarded), String(o.feedback), o.attendance, o.status]));
    toast.success(`${role} report exported`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-admin">{cfg.label}</p>
        <p className="text-xs text-muted-foreground">{cfg.scope} · monitor field force, attendance, onboarding and feedback</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cfg.kpi.map((k) => { const Icon = k.icon; return (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", k.tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{k.value}</p><p className="mt-1 text-[10px] font-semibold text-muted-foreground">{k.detail}</p>
          </div>
        ); })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="All">All</TabsTrigger><TabsTrigger value="Active">Active</TabsTrigger><TabsTrigger value="Pending">Needs action</TabsTrigger><TabsTrigger value="Present">Present</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportRows}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left">
          <thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Officer", "Region", "Retailers", "Visits", "Onboarded", "Feedback", "Attendance", "Status", "Action"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => (
              <tr key={o.id} className="text-[11px] transition hover:bg-muted/30">
                <td className="px-4 py-3"><p className="font-bold">{o.name}</p><p className="font-mono text-[9px] text-muted-foreground">{o.id}</p></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-3 w-3 text-muted-foreground" />{o.region}</span></td>
                <td className="px-4 py-3 font-extrabold">{o.retailers}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3 text-muted-foreground" />{o.visitsToday}</span></td>
                <td className="px-4 py-3 font-semibold text-admin-success">{o.onboarded}</td>
                <td className="px-4 py-3 font-semibold">{o.feedback}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", ATT_TONE[o.attendance])}>{o.attendance}</span></td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", STATUS_TONE[o.status])}>{o.status}</span></td>
                <td className="px-4 py-3">{o.status === "Pending" ? (
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-success" onClick={() => resolve(o.id)}><CheckCircle2 className="h-3 w-3" /> Resolve</Button>
                ) : <span className="text-[10px] text-muted-foreground">—</span>}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">No officers match.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
