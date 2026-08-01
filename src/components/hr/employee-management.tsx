// BharatOne HR — Employee Management
//
// The employee directory, built on the staff records the platform already holds
// rather than a parallel HR list. Retailers and distributors are partners, not
// employees, so they never appear here.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Loader2,
  X,
  Building2,
  Phone,
  Mail,
  CalendarDays,
  BadgeCheck,
  Briefcase,
  MapPin,
  Shield,
  CreditCard,
  GraduationCap,
  UserCog,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Row = {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string | null;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  employment_type: string;
  status: string;
  date_of_joining: string | null;
  work_location: string | null;
  reports_to: string | null;
  reports_to_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-emerald-100 text-emerald-700" },
  probation: { label: "Probation", tone: "bg-amber-100 text-amber-700" },
  notice: { label: "Notice", tone: "bg-orange-100 text-orange-700" },
  on_leave: { label: "On leave", tone: "bg-sky-100 text-sky-700" },
  resigned: { label: "Resigned", tone: "bg-slate-100 text-slate-600" },
  terminated: { label: "Terminated", tone: "bg-rose-100 text-rose-700" },
};

const TYPES = [
  ["full_time", "Full time"],
  ["part_time", "Part time"],
  ["contract", "Contract"],
  ["intern", "Intern"],
  ["consultant", "Consultant"],
] as const;

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const date = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export function EmployeeManagement() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dept, setDept] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await db.rpc("hr_employees_list", { p_q: null, p_status: null });
    if (error) toast.error("Could not load employees", { description: error.message });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const openEmployee = async (r: Row) => {
    setOpen(r);
    setDetail(null);
    setDetailLoading(true);
    setForm({
      employment_type: r.employment_type ?? "full_time",
      status: r.status ?? "active",
      date_of_joining: r.date_of_joining ?? "",
      work_location: r.work_location ?? "",
      reports_to: r.reports_to ?? "",
      probation_until: "",
      notes: "",
    });
    const { data } = await db.rpc("hr_employee_detail", { p_user: r.user_id });
    if (data?.employment) {
      setForm((f: any) => ({
        ...f,
        probation_until: data.employment.probation_until ?? "",
        notes: data.employment.notes ?? "",
        date_of_exit: data.employment.date_of_exit ?? "",
      }));
    }
    setDetail(data);
    setDetailLoading(false);
  };

  const save = async () => {
    if (!open) return;
    setSaving(true);
    const { data, error } = await db.rpc("hr_save_employment", {
      p_user: open.user_id,
      p_type: form.employment_type || "full_time",
      p_status: form.status || "active",
      p_doj: form.date_of_joining || null,
      p_exit: form.date_of_exit || null,
      p_reports_to: form.reports_to || null,
      p_location: form.work_location || null,
      p_probation_until: form.probation_until || null,
      p_notes: form.notes || null,
    });
    setSaving(false);
    if (error || !data?.ok) {
      return toast.error("Could not save", { description: error?.message ?? data?.message });
    }
    toast.success("Employment details saved");
    setOpen(null);
    load();
  };

  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (dept && r.department !== dept) return false;
      if (!needle) return true;
      return [r.name, r.email, r.employee_code, r.department, r.designation, r.phone, r.roles]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, status, dept]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      probation: rows.filter((r) => r.status === "probation").length,
      exiting: rows.filter((r) => ["notice", "resigned", "terminated"].includes(r.status)).length,
    }),
    [rows],
  );

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const head = [
      "Name",
      "Employee code",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Roles",
      "Employment type",
      "Status",
      "Date of joining",
      "Location",
      "Reports to",
    ];
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(",")]
      .concat(
        filtered.map((r) =>
          [
            r.name,
            r.employee_code,
            r.email,
            r.phone,
            r.department,
            r.designation,
            r.roles,
            r.employment_type,
            STATUS[r.status]?.label ?? r.status,
            r.date_of_joining,
            r.work_location,
            r.reports_to_name,
          ]
            .map(cell)
            .join(","),
        ),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${filtered.length} employees` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Users className="h-5 w-5 text-india-green" /> Employee Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Everyone on the staff roll. Retailers and distributors are partners and are not listed
            here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Total staff", v: stats.total, i: Users },
          { l: "Active", v: stats.active, i: BadgeCheck, tone: "text-emerald-600" },
          { l: "On probation", v: stats.probation, i: CalendarDays, tone: "text-amber-600" },
          {
            l: "Exiting",
            v: stats.exiting,
            i: AlertTriangle,
            tone: stats.exiting ? "text-rose-600" : "",
          },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <c.i className="h-3.5 w-3.5" /> {c.l}
            </div>
            <div className={`mt-1 text-2xl font-extrabold tabular-nums ${c.tone ?? ""}`}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, code, department, phone…"
            className={`${inp} pl-9`}
          />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className={`${inp} w-auto`}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inp} w-auto`}
        >
          <option value="">Any status</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-india-green" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? "No staff records found. Employees are people with a staff role on the platform."
            : "No employees match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Employee</th>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Designation</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Joined</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.user_id}
                  onClick={() => openEmployee(r)}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.employee_code ?? "—"}</td>
                  <td className="px-3 py-2.5">{r.department ?? "—"}</td>
                  <td className="px-3 py-2.5">{r.designation ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {TYPES.find((t) => t[0] === r.employment_type)?.[1] ?? r.employment_type}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {date(r.date_of_joining)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS[r.status]?.tone ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {STATUS[r.status]?.label ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            {filtered.length} of {rows.length} · click a row to view the full record
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold">{open.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {[open.designation, open.department].filter(Boolean).join(" · ") ||
                    "No designation recorded"}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="grid h-40 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-india-green" />
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Fact icon={Mail} label="Email" value={open.email} />
                  <Fact icon={Phone} label="Phone" value={open.phone ?? detail?.profile?.phone} />
                  <Fact icon={Shield} label="Roles" value={open.roles} />
                  <Fact icon={Building2} label="Employee code" value={open.employee_code} />
                  <Fact
                    icon={CalendarDays}
                    label="Date of birth"
                    value={date(detail?.profile?.dob)}
                  />
                  <Fact
                    icon={MapPin}
                    label="Location"
                    value={[detail?.profile?.district, detail?.profile?.state]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <Fact
                    icon={CreditCard}
                    label="Bank"
                    value={
                      detail?.profile?.bank_name
                        ? `${detail.profile.bank_name} · ${detail.profile.ifsc ?? ""}`
                        : null
                    }
                  />
                  <Fact icon={GraduationCap} label="Education" value={detail?.profile?.education} />
                  <Fact icon={Briefcase} label="Experience" value={detail?.profile?.experience} />
                  <Fact
                    icon={AlertTriangle}
                    label="Emergency contact"
                    value={
                      detail?.profile?.emergency_contact_name
                        ? `${detail.profile.emergency_contact_name} · ${detail.profile.emergency_contact_phone ?? ""}`
                        : null
                    }
                  />
                </div>

                {Array.isArray(detail?.balances) && detail.balances.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Leave balance this year
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {detail.balances.map((b: any) => {
                        const left =
                          Number(b.entitled) +
                          Number(b.carried) +
                          Number(b.adjustment) -
                          Number(b.taken);
                        return (
                          <div key={b.code} className="rounded-xl border border-border p-3">
                            <p className="text-[11px] font-semibold" style={{ color: b.colour }}>
                              {b.name}
                            </p>
                            <p className="mt-0.5 text-lg font-extrabold tabular-nums">{left}</p>
                            <p className="text-[10px] text-muted-foreground">
                              of {Number(b.entitled) + Number(b.carried) + Number(b.adjustment)} ·{" "}
                              {b.taken} taken
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-border p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
                    <UserCog className="h-4 w-4 text-india-green" /> Employment details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Employment type">
                      <select
                        className={inp}
                        value={form.employment_type}
                        onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                      >
                        {TYPES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        className={inp}
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        {Object.entries(STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date of joining">
                      <input
                        type="date"
                        className={inp}
                        value={form.date_of_joining ?? ""}
                        onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
                      />
                    </Field>
                    <Field label="Probation until">
                      <input
                        type="date"
                        className={inp}
                        value={form.probation_until ?? ""}
                        onChange={(e) => setForm({ ...form, probation_until: e.target.value })}
                      />
                    </Field>
                    <Field label="Work location">
                      <input
                        className={inp}
                        value={form.work_location ?? ""}
                        placeholder="Hassan office"
                        onChange={(e) => setForm({ ...form, work_location: e.target.value })}
                      />
                    </Field>
                    <Field label="Reports to">
                      <select
                        className={inp}
                        value={form.reports_to ?? ""}
                        onChange={(e) => setForm({ ...form, reports_to: e.target.value })}
                      >
                        <option value="">Nobody</option>
                        {rows
                          .filter((x) => x.user_id !== open.user_id)
                          .map((x) => (
                            <option key={x.user_id} value={x.user_id}>
                              {x.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    {["notice", "resigned", "terminated"].includes(form.status) && (
                      <Field label="Date of exit">
                        <input
                          type="date"
                          className={inp}
                          value={form.date_of_exit ?? ""}
                          onChange={(e) => setForm({ ...form, date_of_exit: e.target.value })}
                        />
                      </Field>
                    )}
                    <div className="sm:col-span-2">
                      <Field label="HR notes (not visible to the employee)">
                        <textarea
                          className={`${inp} h-20 py-2`}
                          value={form.notes ?? ""}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setOpen(null)}
                      className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
                    >
                      Close
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  Personal details, bank and KYC come from the person's own profile and are changed
                  there, so HR and the employee never hold different versions of the same fact.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm">{value || "—"}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export default EmployeeManagement;
