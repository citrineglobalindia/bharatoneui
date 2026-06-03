import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, LogIn, LogOut, CheckCircle2, XCircle, Plane, Timer, MapPin,
  CalendarDays, Clock3, Sun, TrendingUp,
} from "lucide-react";
import { RegionalShell, type RegionalConfig } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";

type AttStatus = "Present" | "Absent" | "Leave" | "Half Day" | "Late" | "Holiday";

interface LedgerRow {
  date: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number;
  status: AttStatus;
  note?: string;
}

const STATUS_META: Record<AttStatus, { cls: string; dot: string }> = {
  Present: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Absent: { cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  Leave: { cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  "Half Day": { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  Late: { cls: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  Holiday: { cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

const LEDGER: LedgerRow[] = [
  { date: "01 Jun", day: "Mon", checkIn: "09:42", checkOut: "18:05", hours: 8.4, status: "Late", note: "Traffic delay" },
  { date: "31 May", day: "Sun", checkIn: null, checkOut: null, hours: 0, status: "Holiday" },
  { date: "30 May", day: "Sat", checkIn: "09:05", checkOut: "13:30", hours: 4.4, status: "Half Day", note: "Field visit" },
  { date: "29 May", day: "Fri", checkIn: null, checkOut: null, hours: 0, status: "Leave", note: "Casual leave" },
  { date: "28 May", day: "Thu", checkIn: "08:58", checkOut: "18:12", hours: 9.2, status: "Present" },
  { date: "27 May", day: "Wed", checkIn: "09:01", checkOut: "18:00", hours: 8.9, status: "Present" },
  { date: "26 May", day: "Tue", checkIn: null, checkOut: null, hours: 0, status: "Absent" },
  { date: "25 May", day: "Mon", checkIn: "08:55", checkOut: "18:20", hours: 9.4, status: "Present" },
  { date: "24 May", day: "Sun", checkIn: null, checkOut: null, hours: 0, status: "Holiday" },
  { date: "23 May", day: "Sat", checkIn: "09:10", checkOut: "17:45", hours: 8.5, status: "Present" },
  { date: "22 May", day: "Fri", checkIn: "09:20", checkOut: "18:00", hours: 8.6, status: "Late" },
  { date: "21 May", day: "Thu", checkIn: "08:50", checkOut: "18:10", hours: 9.3, status: "Present" },
];

const LEAVE_BALANCE = [
  { label: "Casual", used: 3, total: 12, color: "bg-sky-500" },
  { label: "Sick", used: 1, total: 8, color: "bg-emerald-500" },
  { label: "Earned", used: 4, total: 15, color: "bg-violet-500" },
];

export function AttendanceLedger({ cfg }: { cfg: RegionalConfig }) {
  const tone = cfg.accent === "rose" ? "rose" : "saffron";
  const accentBtn = cfg.accent === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700";
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const stats = useMemo(() => {
    const count = (s: AttStatus) => LEDGER.filter((r) => r.status === s).length;
    const working = LEDGER.filter((r) => r.status !== "Holiday").length;
    const present = count("Present") + count("Late") + count("Half Day");
    const totalHours = LEDGER.reduce((a, r) => a + r.hours, 0);
    return {
      present,
      absent: count("Absent"),
      leave: count("Leave"),
      late: count("Late"),
      halfDay: count("Half Day"),
      working,
      attendancePct: Math.round((present / (working || 1)) * 100),
      avgHours: (totalHours / (present || 1)).toFixed(1),
    };
  }, []);

  function handleCheckIn() {
    const t = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    setCheckedIn(true);
    setCheckInAt(t);
    setCheckOutAt(null);
    toast.success(`Checked in at ${t}`);
  }
  function handleCheckOut() {
    const t = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    setCheckedIn(false);
    setCheckOutAt(t);
    toast.success(`Checked out at ${t}`);
  }

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <PageHeader
          icon={<CalendarClock className="h-5 w-5" />}
          title="Attendance & Check-in"
          subtitle="Mark your daily check-in / check-out and review your attendance ledger."
        />

        {/* Check-in hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 text-white shadow-elev">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> {cfg.user.role} · {cfg.scope}</p>
              <p className="font-display text-4xl font-extrabold mt-1 tabular-nums" suppressHydrationWarning>{mounted ? timeStr : "--:--:--"}</p>
              <p className="text-sm text-white/60 mt-0.5" suppressHydrationWarning>{mounted ? dateStr : ""}</p>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="inline-flex items-center gap-1 text-white/70"><LogIn className="h-3.5 w-3.5 text-emerald-400" /> In: <b className="text-white">{checkInAt ?? "—"}</b></span>
                <span className="inline-flex items-center gap-1 text-white/70"><LogOut className="h-3.5 w-3.5 text-rose-400" /> Out: <b className="text-white">{checkOutAt ?? "—"}</b></span>
                <span className="inline-flex items-center gap-1 text-white/70"><MapPin className="h-3.5 w-3.5 text-amber-400" /> Office</span>
              </div>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <span className={`self-start sm:self-end inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${checkedIn ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>
                <span className={`h-2 w-2 rounded-full ${checkedIn ? "bg-emerald-400 animate-pulse" : "bg-white/50"}`} /> {checkedIn ? "On duty" : checkOutAt ? "Checked out" : "Not checked in"}
              </span>
              {!checkedIn ? (
                <button onClick={handleCheckIn} className="h-12 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-elev transition">
                  <LogIn className="h-5 w-5" /> Check In
                </button>
              ) : (
                <button onClick={handleCheckOut} className="h-12 px-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center justify-center gap-2 shadow-elev transition">
                  <LogOut className="h-5 w-5" /> Check Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Present Days" value={String(stats.present)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" delta={{ value: `${stats.attendancePct}% rate`, positive: true }} />
          <StatCard label="Absent" value={String(stats.absent)} icon={<XCircle className="h-5 w-5" />} tone="rose" />
          <StatCard label="Leaves Taken" value={String(stats.leave)} icon={<Plane className="h-5 w-5" />} tone="sky" />
          <StatCard label="Late / Half Day" value={`${stats.late} / ${stats.halfDay}`} icon={<Timer className="h-5 w-5" />} tone="violet" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Ledger */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-extrabold flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-muted-foreground" /> Attendance Ledger</p>
              <span className="text-xs text-muted-foreground">Last {LEDGER.length} days</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Check In</th>
                    <th className="px-4 py-2.5">Check Out</th>
                    <th className="px-4 py-2.5">Hours</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {LEDGER.map((r, i) => (
                    <tr key={r.date} className={`border-b border-border last:border-0 ${i % 2 ? "bg-muted/20" : ""}`}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{r.date}</p>
                        <p className="text-[11px] text-muted-foreground">{r.day}</p>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">{r.checkIn ?? "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">{r.checkOut ?? "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums font-semibold">{r.hours ? `${r.hours}h` : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_META[r.status].cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[r.status].dot}`} /> {r.status}
                        </span>
                        {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-sm font-extrabold flex items-center gap-1.5 mb-3"><TrendingUp className="h-4 w-4 text-muted-foreground" /> This Month</p>
              <div className="flex items-end gap-2">
                <span className={`font-display text-4xl font-extrabold ${cfg.accent === "rose" ? "text-rose-600" : "text-amber-600"}`}>{stats.attendancePct}%</span>
                <span className="text-xs text-muted-foreground mb-1.5">attendance</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${accentBtn}`} style={{ width: `${stats.attendancePct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-lg bg-muted/40 py-2">
                  <p className="font-display text-lg font-extrabold text-slate-900">{stats.working}</p>
                  <p className="text-[10px] text-muted-foreground">Working</p>
                </div>
                <div className="rounded-lg bg-muted/40 py-2">
                  <p className="font-display text-lg font-extrabold text-slate-900">{stats.avgHours}h</p>
                  <p className="text-[10px] text-muted-foreground">Avg / day</p>
                </div>
                <div className="rounded-lg bg-muted/40 py-2">
                  <p className="font-display text-lg font-extrabold text-slate-900">{stats.late}</p>
                  <p className="text-[10px] text-muted-foreground">Late</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-sm font-extrabold flex items-center gap-1.5 mb-3"><Plane className="h-4 w-4 text-muted-foreground" /> Leave Balance</p>
              <div className="space-y-3">
                {LEAVE_BALANCE.map((l) => (
                  <div key={l.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{l.label}</span>
                      <span className="text-muted-foreground">{l.total - l.used} of {l.total} left</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${l.color}`} style={{ width: `${(l.used / l.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.success("Leave request submitted for approval")} className={`mt-4 w-full h-10 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-1.5 ${accentBtn}`}>
                <Clock3 className="h-4 w-4" /> Apply for Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}