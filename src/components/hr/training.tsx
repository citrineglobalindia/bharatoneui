// BharatOne HR — Training
//
// A course catalogue and who has been put on what. Two notes on the design:
//
//  * "Overdue" is worked out from the due date every time the screen is read,
//    never stored. A stored flag would need a nightly job to stay honest and
//    would be wrong in between runs.
//  * Assigning is idempotent. Putting somebody on a course they are already on
//    reports "already enrolled" rather than resetting their progress.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  GraduationCap, Loader2, RefreshCw, Plus, X, Search, Users, ShieldCheck,
  Clock3, CheckCircle2, AlertTriangle, Pencil, Trash2, Download, UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Course = {
  id: string; title: string; description: string | null; category: string;
  mode: string; duration_hours: number | null; mandatory: boolean; active: boolean;
  assigned: number; completed: number; overdue: number; in_progress: number;
};
type Enrol = {
  id: string; user_id: string; name: string; email: string; department: string | null;
  assigned_on: string; due_on: string | null; status: string;
  completed_on: string | null; score: number | null; overdue: boolean; notes: string | null;
};
type Staff = { user_id: string; name: string; email: string; department: string | null };
type Overview = {
  ok: boolean; courses: number; mandatory: number; assigned: number;
  completed: number; overdue: number;
  by_department: { department: string; assigned: number; completed: number }[];
};

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";
const area =
  "min-h-[70px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-india-green";

const MODES = [
  { v: "online", label: "Online" },
  { v: "classroom", label: "Classroom" },
  { v: "on_the_job", label: "On the job" },
  { v: "external", label: "External provider" },
];

const STATUS: Record<string, { label: string; tone: string }> = {
  assigned:    { label: "Assigned",    tone: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", tone: "bg-sky-100 text-sky-700" },
  completed:   { label: "Completed",   tone: "bg-emerald-100 text-emerald-700" },
  waived:      { label: "Waived",      tone: "bg-amber-100 text-amber-700" },
};

const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function Training() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [roster, setRoster] = useState<Course | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: list, error }, { data: ov }] = await Promise.all([
      db.rpc("hr_courses_list", { p_include_inactive: showInactive }),
      db.rpc("hr_training_overview"),
    ]);
    if (error) toast.error("Could not load courses", { description: error.message });
    setCourses((list as Course[]) ?? []);
    setStats((ov as Overview) ?? null);
    setLoading(false);
  }, [showInactive]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((c) =>
      [c.title, c.category, c.description].join(" ").toLowerCase().includes(term));
  }, [courses, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <GraduationCap className="h-5 w-5 text-india-green" /> Training
          </h2>
          <p className="text-sm text-muted-foreground">
            Courses, who is enrolled and what has been completed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setEditing({ mode: "online", category: "General", mandatory: false, active: true })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> New course
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active courses" value={stats?.courses ?? 0} icon={GraduationCap}
              hint={stats?.mandatory ? `${stats.mandatory} mandatory` : undefined} />
        <Stat label="Enrolments" value={stats?.assigned ?? 0} icon={Users} />
        <Stat label="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} tone="text-emerald-600" />
        <Stat label="Overdue" value={stats?.overdue ?? 0} icon={AlertTriangle}
              tone={stats?.overdue ? "text-rose-600" : "text-emerald-600"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input className={`${inp} pl-9`} placeholder="Search courses"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <input type="checkbox" checked={showInactive}
                 onChange={(e) => setShowInactive(e.target.checked)} />
          Show retired courses
        </label>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {courses.length
            ? "No course matches that search."
            : "No courses yet. Add the first one — POSH awareness and information security are the usual starting points for an Indian company."}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((c) => {
            const pct = c.assigned ? Math.round((c.completed / c.assigned) * 100) : 0;
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {c.title}
                      {c.mandatory && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-india-green/10 px-2 py-0.5 text-[10px] font-bold text-india-green">
                          <ShieldCheck className="h-3 w-3" /> Mandatory
                        </span>
                      )}
                      {!c.active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Retired
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.category} · {MODES.find((m) => m.v === c.mode)?.label}
                      {c.duration_hours ? ` · ${c.duration_hours}h` : ""}
                    </p>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <button onClick={() => setEditing(c)} className="shrink-0 rounded-lg p-1.5 hover:bg-muted">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-india-green" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                    {c.completed}/{c.assigned} done
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      <Clock3 className="h-3 w-3" /> {c.overdue} overdue
                    </span>
                  )}
                  {c.in_progress > 0 && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      {c.in_progress} in progress
                    </span>
                  )}
                  <button onClick={() => setRoster(c)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">
                    <Users className="h-3.5 w-3.5" /> Manage people
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stats && stats.by_department.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold">Completion by department</h3>
          <ul className="mt-3 space-y-2">
            {stats.by_department.map((d) => {
              const pct = d.assigned ? Math.round((d.completed / d.assigned) * 100) : 0;
              return (
                <li key={d.department}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{d.department}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {d.completed}/{d.assigned} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-india-green" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {editing && (
        <CourseDialog course={editing} onClose={() => setEditing(null)}
                      onSaved={() => { setEditing(null); load(); }} />
      )}
      {roster && (
        <RosterPanel course={roster} onClose={() => setRoster(null)} onChanged={load} />
      )}
    </div>
  );
}

/* ── create or edit a course ──────────────────────────────────────────── */

function CourseDialog({ course, onClose, onSaved }: {
  course: Partial<Course>; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Course>>(course);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.title?.trim()) return toast.error("Give the course a title");
    setBusy(true);
    const { data, error } = await db.rpc("hr_course_save", {
      p_id: f.id ?? null, p_title: f.title, p_description: f.description ?? null,
      p_category: f.category ?? "General", p_mode: f.mode ?? "online",
      p_hours: f.duration_hours ?? null, p_mandatory: !!f.mandatory, p_active: f.active !== false,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not save", { description: error?.message ?? data?.message });
    }
    toast.success(f.id ? "Course updated" : "Course added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-extrabold">{f.id ? "Edit course" : "New course"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <label className="block">
          <Lbl>Title</Lbl>
          <input className={inp} value={f.title ?? ""} placeholder="POSH awareness"
                 onChange={(e) => setF({ ...f, title: e.target.value })} />
        </label>
        <label className="block">
          <Lbl>What it covers</Lbl>
          <textarea className={area} value={f.description ?? ""}
                    onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Lbl>Category</Lbl>
            <input className={inp} value={f.category ?? ""} placeholder="Compliance"
                   onChange={(e) => setF({ ...f, category: e.target.value })} />
          </label>
          <label className="block">
            <Lbl>Delivered</Lbl>
            <select className={inp} value={f.mode ?? "online"}
                    onChange={(e) => setF({ ...f, mode: e.target.value })}>
              {MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </label>
          <label className="block">
            <Lbl>Duration (hours)</Lbl>
            <input type="number" step="0.5" min={0} className={inp} value={f.duration_hours ?? ""}
                   onChange={(e) => setF({ ...f, duration_hours: e.target.value === "" ? null : Number(e.target.value) })} />
          </label>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.mandatory}
                     onChange={(e) => setF({ ...f, mandatory: e.target.checked })} />
              Mandatory for all staff
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.active !== false}
                     onChange={(e) => setF({ ...f, active: e.target.checked })} />
              Available to assign
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={busy}
            className="h-10 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── who is on this course ────────────────────────────────────────────── */

function RosterPanel({ course, onClose, onChanged }: {
  course: Course; onClose: () => void; onChanged: () => void;
}) {
  const [rows, setRows] = useState<Enrol[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      db.rpc("hr_training_roster", { p_course: course.id }),
      db.rpc("hr_employees_list", { p_q: null, p_status: "active" }),
    ]);
    setRows((r as Enrol[]) ?? []);
    setStaff((s as Staff[]) ?? []);
    setLoading(false);
  }, [course.id]);
  useEffect(() => { load(); }, [load]);

  const enrolled = new Set(rows.map((r) => r.user_id));
  const available = staff.filter((s) => !enrolled.has(s.user_id));

  const assign = async () => {
    if (picked.size === 0) return toast.error("Choose at least one person");
    setBusy(true);
    const { data, error } = await db.rpc("hr_training_assign", {
      p_course: course.id, p_users: [...picked], p_due: due || null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not assign", { description: error?.message ?? data?.message });
    }
    toast.success(`Assigned to ${data.added}`, {
      description: data.already_enrolled
        ? `${data.already_enrolled} were already enrolled and were left as they are.`
        : undefined,
    });
    setPicked(new Set()); setAdding(false); load(); onChanged();
  };

  const setStatus = async (e: Enrol, status: string, score?: number | null) => {
    const { data, error } = await db.rpc("hr_training_set", {
      p_id: e.id, p_status: status, p_score: score ?? null, p_notes: null, p_due: null,
    });
    if (error || !data?.ok) {
      return toast.error("Could not update", { description: error?.message ?? data?.message });
    }
    load(); onChanged();
  };

  const remove = async (e: Enrol) => {
    if (!confirm(`Remove ${e.name} from “${course.title}”?`)) return;
    const { data, error } = await db.rpc("hr_training_remove", { p_id: e.id });
    if (error || !data?.ok) {
      return toast.error("Could not remove", { description: error?.message ?? data?.message });
    }
    load(); onChanged();
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [["Name", "Email", "Department", "Assigned", "Due", "Status", "Completed", "Score"].join(",")]
      .concat(rows.map((r) => [r.name, r.email, r.department, r.assigned_on, r.due_on,
        STATUS[r.status]?.label ?? r.status, r.completed_on, r.score].map(cell).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${course.title}-roster.csv`.replace(/\s+/g, "-");
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">{course.title}</h3>
            <p className="text-xs text-muted-foreground">
              {rows.length} enrolled · {rows.filter((r) => r.status === "completed").length} completed
              {rows.some((r) => r.overdue) && ` · ${rows.filter((r) => r.overdue).length} overdue`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} disabled={!rows.length}
              className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => setAdding((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-india-green px-3 text-xs font-bold text-white">
              <UserPlus className="h-3.5 w-3.5" /> Add people
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {adding && (
          <section className="mb-5 rounded-xl border border-india-green/40 bg-card p-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <Lbl>Complete by (optional)</Lbl>
                <input type="date" className={inp} value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
              <button onClick={assign} disabled={busy || picked.size === 0}
                className="h-10 rounded-lg bg-india-green px-4 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "Assigning…" : `Assign to ${picked.size || ""}`.trim()}
              </button>
              {available.length > 0 && (
                <button
                  onClick={() => setPicked(picked.size === available.length
                    ? new Set() : new Set(available.map((s) => s.user_id)))}
                  className="h-10 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                  {picked.size === available.length ? "Clear all" : "Select everyone"}
                </button>
              )}
            </div>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">Everyone on staff is already enrolled.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {available.map((s) => (
                  <li key={s.user_id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                      <input type="checkbox" checked={picked.has(s.user_id)}
                        onChange={(e) => {
                          const next = new Set(picked);
                          if (e.target.checked) next.add(s.user_id); else next.delete(s.user_id);
                          setPicked(next);
                        }} />
                      <span className="flex-1 text-sm">{s.name}</span>
                      <span className="text-[11px] text-muted-foreground">{s.department || "—"}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nobody is enrolled yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Person</th>
                  <th className="px-3 py-2.5">Due</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Score</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.department || r.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={r.overdue ? "font-semibold text-rose-600" : "text-muted-foreground"}>
                        {fmt(r.due_on)}
                      </span>
                      {r.overdue && <p className="text-[10px] font-bold text-rose-600">Overdue</p>}
                    </td>
                    <td className="px-3 py-2">
                      <select value={r.status} onChange={(e) => setStatus(r, e.target.value)}
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${STATUS[r.status]?.tone ?? ""}`}>
                        {Object.entries(STATUS).map(([v, s]) =>
                          <option key={v} value={v}>{s.label}</option>)}
                      </select>
                      {r.completed_on && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{fmt(r.completed_on)}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min={0} max={100} defaultValue={r.score ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          if (v !== (r.score ?? null)) setStatus(r, r.status, v);
                        }}
                        className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-right text-xs tabular-nums outline-none focus:border-india-green" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

const Stat = ({ label, value, icon: Icon, hint, tone }: {
  label: string; value: number; icon: any; hint?: string; tone?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
    <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export default Training;
