// BharatOne HR — Reports
//
// Three views over the same records HR works with daily. All arithmetic happens in
// the database, so a report and the screen it summarises can never disagree.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileChartColumn, Loader2, RefreshCw, Download, Users, CalendarDays, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Tab = "staff" | "leave" | "attendance";

const inp =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const todayStr = () => new Date().toISOString().slice(0, 10);

export function HrReports() {
  const [tab, setTab] = useState<Tab>("staff");
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(todayStr());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const call =
      tab === "staff"      ? db.rpc("hr_report_staff", { p_from: from, p_to: to })
      : tab === "leave"    ? db.rpc("hr_report_leave", { p_from: from, p_to: to })
                           : db.rpc("hr_report_attendance", { p_year: year });
    const { data, error } = await call;
    if (error) toast.error("Could not build the report", { description: error.message });
    setRows((data as any[]) ?? []);
    setLoading(false);
  }, [tab, from, to, year]);
  useEffect(() => { load(); }, [load]);

  const COLUMNS: Record<Tab, { key: string; label: string; num?: boolean }[]> = {
    staff: [
      { key: "name", label: "Employee" },
      { key: "employee_code", label: "Code" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "employment_type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "tenure_months", label: "Months", num: true },
      { key: "leave_taken", label: "Leave taken", num: true },
      { key: "days_present", label: "Present", num: true },
      { key: "days_absent", label: "Absent", num: true },
    ],
    leave: [
      { key: "leave_name", label: "Leave type" },
      { key: "requests", label: "Requests", num: true },
      { key: "days", label: "Days approved", num: true },
      { key: "approved", label: "Approved", num: true },
      { key: "rejected", label: "Rejected", num: true },
      { key: "pending", label: "Pending", num: true },
    ],
    attendance: [
      { key: "month_name", label: "Month" },
      { key: "present", label: "Present", num: true },
      { key: "absent", label: "Absent", num: true },
      { key: "half_day", label: "Half days", num: true },
      { key: "wfh", label: "Work from home", num: true },
      { key: "on_duty", label: "On duty", num: true },
      { key: "leave_days", label: "Leave days", num: true },
    ],
  };

  const cols = COLUMNS[tab];

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => c.label).join(",")]
      .concat(rows.map((r) => cols.map((c) => cell(r[c.key])).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `hr-${tab}-report-${todayStr()}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${rows.length} rows` });
  };

  const TABS: { k: Tab; label: string; icon: any; hint: string }[] = [
    { k: "staff", label: "Staff", icon: Users, hint: "Everyone, with tenure, leave taken and attendance" },
    { k: "leave", label: "Leave", icon: CalendarDays, hint: "Usage by leave type — useful when reviewing entitlements" },
    { k: "attendance", label: "Attendance", icon: CalendarCheck, hint: "Month by month across the company" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <FileChartColumn className="h-5 w-5 text-india-green" /> Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            {TABS.find((t) => t.k === tab)?.hint}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!rows.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {TABS.map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                tab === k ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "attendance" ? (
          <select className={inp} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              From <input type="date" className={inp} value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              To <input type="date" className={inp} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing to report for this period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 ${c.num ? "text-right" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/40">
                  {cols.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.num ? "text-right tabular-nums" : ""}`}>
                      {r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            {rows.length} rows
          </div>
        </div>
      )}
    </div>
  );
}

export default HrReports;
