import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Users, Plus, CalendarDays, Plane, Check, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Emp = { id: string; full_name: string; employee_code: string | null; department: string | null; designation: string | null; phone: string | null; email: string | null; date_of_joining: string | null; status: string };
type Att = { id: string; employee_id: string; day: string; status: string };
type Leave = { id: string; employee_id: string; leave_type: string; from_date: string; to_date: string; reason: string | null; status: string };

const db = supabase as any;
const input = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";
const ATT = ["present", "absent", "half_day", "leave", "wfh", "holiday"];
const attTone: Record<string, string> = { present: "bg-emerald-100 text-emerald-700", absent: "bg-rose-100 text-rose-700", half_day: "bg-amber-100 text-amber-700", leave: "bg-indigo-100 text-indigo-700", wfh: "bg-sky-100 text-sky-700", holiday: "bg-slate-100 text-slate-600" };
const leaveTone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

export function HrmsPanel() {
  const [tab, setTab] = useState<"employees" | "attendance" | "leave">("employees");
  const [emps, setEmps] = useState<Emp[]>([]);
  const [att, setAtt] = useState<Att[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ full_name: "", employee_code: "", department: "", designation: "", phone: "", email: "", date_of_joining: "" });
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: e }, { data: l }] = await Promise.all([
      db.from("hr_employees").select("*").order("created_at", { ascending: false }),
      db.from("hr_leave_requests").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setEmps((e as Emp[]) ?? []);
    setLeaves((l as Leave[]) ?? []);
    setLoading(false);
  }
  async function loadAtt(d: string) {
    const { data } = await db.from("hr_attendance").select("*").eq("day", d);
    setAtt((data as Att[]) ?? []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "attendance") loadAtt(day); }, [tab, day]);

  const addEmployee = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    setAdding(true);
    const { error } = await db.from("hr_employees").insert({ ...form, date_of_joining: form.date_of_joining || null });
    setAdding(false);
    if (error) return toast.error("Couldn't add employee", { description: error.message });
    toast.success("Employee added");
    setForm({ full_name: "", employee_code: "", department: "", designation: "", phone: "", email: "", date_of_joining: "" });
    load();
  };
  const toggleEmp = async (e: Emp) => {
    const s = e.status === "active" ? "inactive" : "active";
    await db.from("hr_employees").update({ status: s }).eq("id", e.id);
    setEmps((xs) => xs.map((x) => (x.id === e.id ? { ...x, status: s } : x)));
  };

  const attMap = useMemo(() => Object.fromEntries(att.map((a) => [a.employee_id, a.status])), [att]);
  const markAtt = async (empId: string, status: string) => {
    const { error } = await db.from("hr_attendance").upsert({ employee_id: empId, day, status }, { onConflict: "employee_id,day" });
    if (error) return toast.error(error.message);
    loadAtt(day);
  };

  const decideLeave = async (l: Leave, status: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("hr_leave_requests").update({ status, decided_by: u.user?.id ?? null, decided_at: new Date().toISOString() }).eq("id", l.id);
    if (error) return toast.error(error.message);
    setLeaves((ls) => ls.map((x) => (x.id === l.id ? { ...x, status } : x)));
  };

  const empName = (id: string) => emps.find((e) => e.id === id)?.full_name ?? "—";
  const activeEmps = emps.filter((e) => e.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Users className="h-5 w-5 text-india-green" /> HRMS</h2>
          <p className="text-sm text-muted-foreground">Employees, daily attendance and leave management.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([["employees", "Employees", Users], ["attendance", "Attendance", CalendarDays], ["leave", "Leave", Plane]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-semibold transition ${tab === k ? "bg-india-green text-white" : "bg-muted hover:bg-muted/70"}`}><Icon className="h-4 w-4" /> {label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : tab === "employees" ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4 text-india-green" /> Add employee</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input className={input} placeholder="Full name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <input className={input} placeholder="Employee code" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
              <input className={input} placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <input className={input} placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className={input} type="date" title="Date of joining" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
              <button onClick={addEmployee} disabled={adding} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-bold text-white hover:bg-india-green/90 disabled:opacity-50">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Designation</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">DOJ</th><th className="px-3 py-2 text-right">Status</th></tr></thead>
              <tbody>
                {emps.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No employees yet.</td></tr> : emps.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{e.full_name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.employee_code || "—"}</td>
                    <td className="px-3 py-2">{e.department || "—"}</td>
                    <td className="px-3 py-2">{e.designation || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{[e.phone, e.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-xs">{e.date_of_joining || "—"}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => toggleEmp(e)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${e.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{e.status}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === "attendance" ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-bold">Mark attendance for</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm" />
          </div>
          {activeEmps.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Add active employees first.</p> : (
            <div className="space-y-2">
              {activeEmps.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div><span className="text-sm font-semibold">{e.full_name}</span> <span className="text-xs text-muted-foreground">{e.designation}</span></div>
                  <div className="flex flex-wrap gap-1">
                    {ATT.map((s) => (
                      <button key={s} onClick={() => markAtt(e.id, s)} className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition ${attMap[e.id] === s ? attTone[s] : "border border-border hover:bg-muted"}`}>{s.replace("_", " ")}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
            <tbody>
              {leaves.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No leave requests.</td></tr> : leaves.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{empName(l.employee_id)}</td>
                  <td className="px-3 py-2 capitalize">{l.leave_type}</td>
                  <td className="px-3 py-2 text-xs">{l.from_date}</td>
                  <td className="px-3 py-2 text-xs">{l.to_date}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{l.reason || "—"}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${leaveTone[l.status]}`}>{l.status}</span></td>
                  <td className="px-3 py-2 text-right">
                    {l.status === "pending" && (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => decideLeave(l, "approved")} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /> Approve</button>
                        <button onClick={() => decideLeave(l, "rejected")} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"><X className="h-3.5 w-3.5" /> Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
