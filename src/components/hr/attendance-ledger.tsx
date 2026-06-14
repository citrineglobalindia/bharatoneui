import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Code = "P" | "A" | "H" | "HD" | "L" | "WFH" | "WO";
const legend: { code: Code; label: string; className: string }[] = [
  { code: "P", label: "Present", className: "bg-india-green/10 text-india-green" },
  { code: "A", label: "Absent", className: "bg-destructive/10 text-destructive" },
  { code: "H", label: "Holiday", className: "bg-hr-soft text-hr" },
  { code: "HD", label: "Half Day", className: "bg-saffron/10 text-saffron" },
  { code: "L", label: "Leave", className: "bg-warning/10 text-warning-foreground" },
  { code: "WFH", label: "Work from home", className: "bg-secondary text-secondary-foreground" },
  { code: "WO", label: "Weekly Off", className: "bg-muted text-muted-foreground" },
];
const employees = [
  { id: "BO-E1001", name: "Aarav Sharma", department: "Technology" }, { id: "BO-E1002", name: "Meera Nair", department: "Operations" },
  { id: "BO-E1003", name: "Rohan Desai", department: "Finance" }, { id: "BO-E1004", name: "Fatima Khan", department: "Quality" },
  { id: "BO-E1005", name: "Vikram Gowda", department: "Sales" }, { id: "BO-E1006", name: "Nisha Verma", department: "Human Resources" },
];

function codeFor(employeeIndex: number, day: number): Code {
  const weekday = new Date(2026, 5, day).getDay();
  if (weekday === 0) return "WO";
  if (day === 15) return "H";
  if ((employeeIndex * 7 + day) % 19 === 0) return "A";
  if ((employeeIndex * 5 + day) % 17 === 0) return "L";
  if ((employeeIndex * 3 + day) % 13 === 0) return "HD";
  if ((employeeIndex + day) % 11 === 0) return "WFH";
  return "P";
}
const days = Array.from({ length: 30 }, (_, index) => index + 1);
const classFor = (code: Code) => legend.find((item) => item.code === code)?.className ?? "bg-muted";

export function AttendanceLedger() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [monthIndex, setMonthIndex] = useState(5);
  const rows = useMemo(() => employees.filter((employee) => (department === "all" || employee.department === department) && `${employee.name} ${employee.id}`.toLowerCase().includes(query.toLowerCase())), [department, query]);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(2026, monthIndex, 1));
  const counts = (employeeIndex: number) => days.reduce<Record<Code, number>>((totals, day) => { totals[codeFor(employeeIndex, day)] += 1; return totals; }, { P: 0, A: 0, H: 0, HD: 0, L: 0, WFH: 0, WO: 0 });
  const exportCsv = () => {
    const headings = ["Employee ID", "Employee", "Department", ...days.map((day) => `${day} Jun`), "Present", "Absent", "Holiday", "Half Day", "Leave", "WFH", "Weekly Off"];
    const data = rows.map((employee) => { const employeeIndex = employees.indexOf(employee); const total = counts(employeeIndex); return [employee.id, employee.name, employee.department, ...days.map((day) => codeFor(employeeIndex, day)), total.P, total.A, total.H, total.HD, total.L, total.WFH, total.WO]; });
    const csv = [headings, ...data].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `attendance-${monthLabel.toLowerCase().replace(" ", "-")}.csv`; anchor.click(); URL.revokeObjectURL(url);
    toast.success("Attendance ledger exported", { description: `${rows.length} employee records downloaded.` });
  };
  const summary = employees.reduce((total, _, index) => { const employeeCounts = counts(index); total.present += employeeCounts.P; total.absent += employeeCounts.A; total.leave += employeeCounts.L; total.halfDay += employeeCounts.HD; return total; }, { present: 0, absent: 0, leave: 0, halfDay: 0 });

  return <div className="space-y-5">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-hr-soft text-hr"><CalendarDays className="h-5 w-5" /></div><h1 className="font-display text-2xl font-extrabold">Attendance Ledger</h1><p className="mt-1 text-sm text-muted-foreground">Monthly employee-wise attendance register with daily status and payroll-ready totals.</p></div><div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}><ChevronLeft /></Button><span className="min-w-36 text-center text-sm font-bold">{monthLabel}</span><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonthIndex((value) => Math.min(11, value + 1))}><ChevronRight /></Button></div></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Present entries", value: summary.present, tone: "text-india-green" }, { label: "Absent entries", value: summary.absent, tone: "text-destructive" }, { label: "Leave entries", value: summary.leave, tone: "text-warning-foreground" }, { label: "Half days", value: summary.halfDay, tone: "text-saffron" }].map((item) => <div className="rounded-xl border border-border bg-card p-4 shadow-soft" key={item.label}><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p><p className={`mt-1 font-display text-2xl font-extrabold ${item.tone}`}>{item.value}</p></div>)}</div>
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"><div className="space-y-3 border-b border-border p-4"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><h2 className="text-sm font-bold">Monthly register</h2><p className="text-[11px] text-muted-foreground">{rows.length} employees · Jun 1–30, 2026</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="flex h-9 items-center gap-2 rounded-md border border-input px-3"><Search className="h-4 w-4 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none sm:w-48" placeholder="Search employee…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={department} onValueChange={setDepartment}><SelectTrigger className="w-full sm:w-44"><Filter className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{Array.from(new Set(employees.map((employee) => employee.department))).map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button></div></div>
      <div className="flex flex-wrap gap-2">{legend.map((item) => <span key={item.code} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className={`rounded px-1.5 py-0.5 font-extrabold ${item.className}`}>{item.code}</span>{item.label}</span>)}</div></div>
      <div className="max-h-[520px] overflow-auto"><table className="min-w-[1900px] border-collapse text-xs"><thead className="sticky top-0 z-20 bg-muted"><tr><th className="sticky left-0 z-30 min-w-52 border-b border-r border-border bg-muted px-4 py-3 text-left">Employee</th>{days.map((day) => <th key={day} className="w-11 border-b border-r border-border py-2 text-center"><span className="block font-bold">{day}</span><span className="text-[9px] font-normal text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { weekday: "narrow" }).format(new Date(2026, 5, day))}</span></th>)}{legend.map((item) => <th key={item.code} className="min-w-14 border-b border-r border-border px-2 text-center">{item.code}</th>)}</tr></thead><tbody>{rows.map((employee) => { const index = employees.indexOf(employee); const total = counts(index); return <tr key={employee.id} className="hover:bg-muted/30"><td className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-2"><span className="block font-bold">{employee.name}</span><span className="text-[9px] text-muted-foreground">{employee.id} · {employee.department}</span></td>{days.map((day) => { const code = codeFor(index, day); return <td className="border-b border-r border-border p-1 text-center" key={day}><span className={`inline-grid min-h-7 min-w-7 place-items-center rounded px-1 text-[10px] font-extrabold ${classFor(code)}`}>{code}</span></td>; })}{legend.map((item) => <td className="border-b border-r border-border text-center font-bold" key={item.code}>{total[item.code]}</td>)}</tr>; })}</tbody></table></div>
    </section>
  </div>;
}