// BharatOne HR — Attendance
//
// A month at a glance, one row per employee. Holidays, Sundays and approved leave are
// filled in from the calendar and the leave register rather than marked by hand — so
// the grid can never disagree with what leave says. Only the genuinely discretionary
// days (present, absent, half day, work from home, on duty) are HR's to set.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck, ChevronLeft, ChevronRight, Loader2, RefreshCw, Download,
  CheckCheck, Search, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Cell = {
  user_id: string; name: string; employee_code: string | null; department: string | null;
  day: string; status: string; source: string; note: string | null;
};

/** Every state a day can be in, with the single letter shown in the grid. */
const CODE: Record<string, { ch: string; cls: string; label: string }> = {
  present:    { ch: "P",  cls: "bg-emerald-100 text-emerald-800", label: "Present" },
  absent:     { ch: "A",  cls: "bg-rose-100 text-rose-700",       label: "Absent" },
  half_day:   { ch: "½",  cls: "bg-amber-100 text-amber-800",     label: "Half day" },
  wfh:        { ch: "W",  cls: "bg-sky-100 text-sky-800",         label: "Work from home" },
  on_duty:    { ch: "OD", cls: "bg-indigo-100 text-indigo-800",   label: "On duty" },
  leave:      { ch: "L",  cls: "bg-violet-100 text-violet-800",   label: "Approved leave" },
  holiday:    { ch: "H",  cls: "bg-orange-100 text-orange-800",   label: "Holiday" },
  weekly_off: { ch: "—",  cls: "bg-muted text-muted-foreground",  label: "Weekly off" },
  not_marked: { ch: "",   cls: "bg-background",                    label: "Not marked" },
};

/** What HR is allowed to set by hand — the derived states are not in this list. */
const SETTABLE = ["present", "absent", "half_day", "wfh", "on_duty", "not_marked"] as const;

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

export function Attendance() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Cell | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await db.rpc("hr_attendance_month", { p_year: year, p_month: month });
    if (error) toast.error("Could not load attendance", { description: error.message });
    setCells((data as Cell[]) ?? []);
    setLoading(false);
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const n = new Date(year, month, 0).getDate();
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [year, month]);

  /** cells → one row per person, indexed by day-of-month. */
  const rows = useMemo(() => {
    const byUser = new Map<string, { info: Cell; days: Record<number, Cell> }>();
    for (const c of cells) {
      const dnum = Number(c.day.slice(8, 10));
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, { info: c, days: {} });
      byUser.get(c.user_id)!.days[dnum] = c;
    }
    const list = [...byUser.values()];
    const needle = q.trim().toLowerCase();
    return needle
      ? list.filter((r) => [r.info.name, r.info.employee_code, r.info.department]
          .filter(Boolean).join(" ").toLowerCase().includes(needle))
      : list;
  }, [cells, q]);

  const totals = (r: { days: Record<number, Cell> }) => {
    let p = 0, a = 0, l = 0;
    for (const c of Object.values(r.days)) {
      if (c.status === "present" || c.status === "wfh" || c.status === "on_duty") p += 1;
      else if (c.status === "half_day") p += 0.5;
      else if (c.status === "absent") a += 1;
      else if (c.status === "leave") l += 1;
    }
    return { p, a, l };
  };

  const setStatus = async (cell: Cell, status: string) => {
    setBusy(true);
    const { data, error } = await db.rpc("hr_mark_attendance", {
      p_user: cell.user_id, p_day: cell.day, p_status: status, p_note: null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not mark", { description: error?.message ?? data?.message });
    }
    setPick(null);
    load();
  };

  const markAllPresent = async () => {
    const day = new Date().toISOString().slice(0, 10);
    if (!confirm(`Mark everyone present for today (${day})?\n\nAnyone already marked, or on approved leave, is left as they are.`)) return;
    setBusy(true);
    const { data, error } = await db.rpc("hr_mark_day_present", { p_day: day });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not mark the day", { description: error?.message ?? data?.message });
    }
    toast.success(`${data.marked} marked present`);
    load();
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const head = ["Employee", "Code", "Department", ...days.map(String), "Present", "Absent", "Leave"];
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(",")].concat(rows.map((r) => {
      const t = totals(r);
      return [r.info.name, r.info.employee_code, r.info.department,
        ...days.map((d) => CODE[r.days[d]?.status ?? "not_marked"]?.ch ?? ""),
        t.p, t.a, t.l].map(cell).join(",");
    })).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `attendance-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${rows.length} employees` });
  };

  const shift = (by: number) => {
    const m = month + by;
    if (m < 1) { setMonth(12); setYear(year - 1); }
    else if (m > 12) { setMonth(1); setYear(year + 1); }
    else setMonth(m);
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <CalendarCheck className="h-5 w-5 text-india-green" /> Attendance
          </h2>
          <p className="text-sm text-muted-foreground">
            Holidays, Sundays and approved leave fill themselves in — you only mark the rest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!rows.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          {isCurrentMonth && (
            <button onClick={markAllPresent} disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white disabled:opacity-50">
              <CheckCheck className="h-4 w-4" /> Mark today present
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-border bg-card">
          <button onClick={() => shift(-1)} className="p-2 hover:bg-muted" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] px-2 text-center text-sm font-bold">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={() => shift(1)} className="p-2 hover:bg-muted" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee or department…"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-india-green" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        {Object.entries(CODE).filter(([k]) => k !== "not_marked").map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${v.cls}`}>
            <b>{v.ch}</b> {v.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No staff to show for {MONTHS[month - 1]} {year}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  Employee
                </th>
                {days.map((d) => {
                  const dow = new Date(year, month - 1, d).getDay();
                  return (
                    <th key={d} className={`w-7 px-0 py-2 text-center text-[10px] font-bold ${dow === 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                      {d}
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center text-[10px] uppercase text-muted-foreground">P</th>
                <th className="px-2 py-2 text-center text-[10px] uppercase text-muted-foreground">A</th>
                <th className="px-2 py-2 text-center text-[10px] uppercase text-muted-foreground">L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = totals(r);
                return (
                  <tr key={r.info.user_id} className="border-t border-border">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5">
                      <div className="text-xs font-semibold">{r.info.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {[r.info.employee_code, r.info.department].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    {days.map((dnum) => {
                      const c = r.days[dnum];
                      const st = c?.status ?? "not_marked";
                      const meta = CODE[st] ?? CODE.not_marked;
                      const editable = c && c.source !== "calendar" && c.source !== "leave";
                      return (
                        <td key={dnum} className="p-0.5 text-center">
                          <button
                            title={`${meta.label}${c?.note ? ` — ${c.note}` : ""}`}
                            disabled={!editable}
                            onClick={() => editable && setPick(c!)}
                            className={`h-6 w-6 rounded text-[10px] font-bold ${meta.cls} ${
                              editable ? "hover:ring-2 hover:ring-india-green/40" : "cursor-default opacity-90"}`}
                          >
                            {meta.ch}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 text-center font-bold tabular-nums text-emerald-700">{t.p}</td>
                    <td className="px-2 text-center font-bold tabular-nums text-rose-600">{t.a}</td>
                    <td className="px-2 text-center font-bold tabular-nums text-violet-700">{t.l}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            {rows.length} employees · click any editable day to change it. Holidays, Sundays and
            approved leave come from the calendar and cannot be overwritten here.
          </div>
        </div>
      )}

      {pick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPick(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold">{pick.name}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(pick.day).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SETTABLE.map((s) => (
                <button key={s} onClick={() => setStatus(pick, s)} disabled={busy}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                    pick.status === s ? "border-india-green ring-2 ring-india-green/30" : "border-border hover:bg-muted"}`}>
                  {CODE[s]?.label ?? "Clear"}
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              To record leave, use Leave Management — approved leave appears here automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
