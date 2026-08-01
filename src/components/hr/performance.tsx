// BharatOne HR — Performance
//
// An annual appraisal, run on the Indian financial year. Two things are kept
// deliberately separate:
//
//   Goal progress  — a fact about the work, weighted by how much each goal counts.
//   Manager rating — a judgement a person makes.
//
// The screen shows both and never derives one from the other. A weighted average
// of progress percentages is not an appraisal, and presenting it as one would
// dress up an opinion as arithmetic.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChartNoAxesCombined, Loader2, RefreshCw, Plus, Target, Star, X, Trash2,
  CalendarRange, Search, Download, Pencil, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Cycle = {
  id: string; name: string; period_start: string; period_end: string;
  status: "draft" | "open" | "closed"; rating_max: number;
  employees: number; goals: number; reviews_final: number; avg_rating: number | null;
};
type Row = {
  user_id: string; name: string; email: string; department: string | null;
  designation: string | null; goals: number; weight_total: number; goal_progress: number;
  review_status: string; self_rating: number | null; manager_rating: number | null;
  reviewer_name: string | null;
};
type Goal = {
  id: string; title: string; description: string | null; weight_pct: number;
  target: string | null; progress_pct: number; status: string;
};
type Review = {
  self_rating: number | null; self_comments: string | null;
  manager_rating: number | null; manager_comments: string | null;
  strengths: string | null; improvements: string | null;
  status: string; finalised_at: string | null;
};

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";
const area =
  "min-h-[76px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-india-green";

const GOAL_STATUS = [
  { v: "not_started", label: "Not started" },
  { v: "in_progress", label: "In progress" },
  { v: "achieved", label: "Achieved" },
  { v: "missed", label: "Missed" },
];

const REVIEW_STATUS: Record<string, { label: string; tone: string }> = {
  pending:        { label: "Not started",   tone: "bg-muted text-muted-foreground" },
  self_submitted: { label: "Self review in", tone: "bg-sky-100 text-sky-700" },
  reviewed:       { label: "Manager done",  tone: "bg-amber-100 text-amber-700" },
  final:          { label: "Final",         tone: "bg-emerald-100 text-emerald-700" },
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function Performance() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [showCycle, setShowCycle] = useState(false);

  const cycle = cycles.find((c) => c.id === cycleId) ?? null;

  const loadCycles = useCallback(async () => {
    await ensureStaffSession();
    const { data } = await db.rpc("hr_perf_cycles");
    const list = (data as Cycle[]) ?? [];
    setCycles(list);
    setCycleId((prev) => prev || list.find((c) => c.status === "open")?.id || list[0]?.id || "");
  }, []);

  const loadRows = useCallback(async () => {
    if (!cycleId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await db.rpc("hr_perf_overview", { p_cycle: cycleId });
    if (error) toast.error("Could not load the appraisal list", { description: error.message });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [cycleId]);

  useEffect(() => { loadCycles(); }, [loadCycles]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.department, r.designation].join(" ").toLowerCase().includes(term));
  }, [rows, q]);

  const done = rows.filter((r) => r.review_status === "final").length;
  const rated = rows.filter((r) => r.manager_rating != null);
  const avg = rated.length
    ? (rated.reduce((s, r) => s + Number(r.manager_rating), 0) / rated.length).toFixed(1)
    : "—";

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const cols = ["Employee", "Email", "Department", "Designation", "Goals",
                  "Weight total %", "Goal progress %", "Review", "Self", "Manager"];
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(",")].concat(rows.map((r) => [
      r.name, r.email, r.department, r.designation, r.goals, r.weight_total,
      r.goal_progress, REVIEW_STATUS[r.review_status]?.label ?? r.review_status,
      r.self_rating, r.manager_rating,
    ].map(cell).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `performance-${cycle?.name ?? "cycle"}.csv`.replace(/\s+/g, "-");
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${rows.length} people` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ChartNoAxesCombined className="h-5 w-5 text-india-green" /> Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            {cycle
              ? `${cycle.name} · ${fmtDate(cycle.period_start)} to ${fmtDate(cycle.period_end)}`
              : "No review cycle yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { loadCycles(); loadRows(); }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!rows.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setShowCycle(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
            <CalendarRange className="h-4 w-4" /> New cycle
          </button>
        </div>
      </div>

      {cycles.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No review cycle exists yet. Create one to start setting goals.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="People in cycle" value={String(rows.length)} />
            <Stat label="Goals set" value={String(rows.reduce((s, r) => s + r.goals, 0))} />
            <Stat label="Reviews final" value={`${done} of ${rows.length}`}
                  tone={done === rows.length && rows.length ? "text-emerald-600" : "text-amber-600"} />
            <Stat label="Average rating" value={avg === "—" ? "—" : `${avg} / ${cycle?.rating_max ?? 5}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inp} w-auto`} value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.status !== "open" ? ` (${c.status})` : ""}
                </option>
              ))}
            </select>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input className={`${inp} pl-9`} placeholder="Search name, department or role"
                     value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {cycle?.status === "closed" && (
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                Closed — reopen the cycle to make changes
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
          ) : shown.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {rows.length ? "Nobody matches that search." : "No staff records to appraise."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5 text-right">Goals</th>
                    <th className="px-3 py-2.5">Goal progress</th>
                    <th className="px-3 py-2.5">Review</th>
                    <th className="px-3 py-2.5 text-right">Rating</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const badge = REVIEW_STATUS[r.review_status] ?? REVIEW_STATUS.pending;
                    return (
                      <tr key={r.user_id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.designation || "—"}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.department || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.goals}
                          {r.goals > 0 && r.weight_total !== 100 && (
                            <span className="ml-1 text-[10px] text-amber-600" title="Weights do not add up to 100%">
                              {r.weight_total}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.goals === 0 ? <span className="text-muted-foreground">—</span> : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-india-green"
                                     style={{ width: `${r.goal_progress}%` }} />
                              </div>
                              <span className="tabular-nums text-[11px] text-muted-foreground">
                                {r.goal_progress}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.tone}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {r.manager_rating != null ? Number(r.manager_rating).toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setOpen(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">
                            <Pencil className="h-3 w-3" /> Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {open && cycle && (
        <EmployeePanel row={open} cycle={cycle} onClose={() => setOpen(null)}
                       onSaved={() => { loadRows(); loadCycles(); }} />
      )}
      {showCycle && (
        <CycleDialog onClose={() => setShowCycle(false)}
                     onSaved={() => { setShowCycle(false); loadCycles(); }} />
      )}
    </div>
  );
}

/* ── one person's goals and appraisal ─────────────────────────────────── */

function EmployeePanel({ row, cycle, onClose, onSaved }: {
  row: Row; cycle: Cycle; onClose: () => void; onSaved: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const locked = cycle.status === "closed";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.rpc("hr_perf_employee", { p_cycle: cycle.id, p_user: row.user_id });
    setGoals((data?.goals as Goal[]) ?? []);
    setReview((data?.review as Review) ?? null);
    setLoading(false);
  }, [cycle.id, row.user_id]);
  useEffect(() => { load(); }, [load]);

  const weightTotal = goals.reduce((s, g) => s + Number(g.weight_pct || 0), 0);

  const saveGoal = async () => {
    if (!editing?.title?.trim()) return toast.error("Describe the goal");
    setBusy(true);
    const { data, error } = await db.rpc("hr_perf_save_goal", {
      p_id: editing.id ?? null, p_cycle: cycle.id, p_user: row.user_id,
      p_title: editing.title, p_description: editing.description ?? null,
      p_weight: Number(editing.weight_pct ?? 0), p_target: editing.target ?? null,
      p_progress: Number(editing.progress_pct ?? 0), p_status: editing.status ?? "not_started",
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not save", { description: error?.message ?? data?.message });
    }
    toast.success("Goal saved");
    setEditing(null); load(); onSaved();
  };

  const removeGoal = async (g: Goal) => {
    if (!confirm(`Remove “${g.title}”?`)) return;
    const { data, error } = await db.rpc("hr_perf_delete_goal", { p_id: g.id });
    if (error || !data?.ok) {
      return toast.error("Could not remove", { description: error?.message ?? data?.message });
    }
    load(); onSaved();
  };

  const saveReview = async (status: string) => {
    setBusy(true);
    const { data, error } = await db.rpc("hr_perf_save_review", {
      p_cycle: cycle.id, p_user: row.user_id,
      p_self_rating: review?.self_rating ?? null,
      p_self_comments: review?.self_comments ?? null,
      p_manager_rating: review?.manager_rating ?? null,
      p_manager_comments: review?.manager_comments ?? null,
      p_strengths: review?.strengths ?? null,
      p_improvements: review?.improvements ?? null,
      p_status: status,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not save", { description: error?.message ?? data?.message });
    }
    toast.success(status === "final" ? "Review finalised" : "Review saved");
    load(); onSaved();
  };

  const upd = (patch: Partial<Review>) =>
    setReview((r) => ({ ...(r ?? { status: "pending" } as Review), ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">{row.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[row.designation, row.department].filter(Boolean).join(" · ") || row.email}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{cycle.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {locked && (
          <p className="mb-4 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            This cycle is closed. Reopen it from the cycle list to make changes.
          </p>
        )}

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
        ) : (
          <>
            {/* goals */}
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-bold">
                  <Target className="h-4 w-4 text-india-green" /> Goals
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold ${
                    weightTotal === 100 ? "text-emerald-600"
                    : weightTotal === 0 ? "text-muted-foreground" : "text-amber-600"}`}>
                    Weights {weightTotal}%
                  </span>
                  {!locked && (
                    <button onClick={() => setEditing({ status: "not_started", weight_pct: 0, progress_pct: 0 })}
                      className="inline-flex items-center gap-1 rounded-lg bg-india-green px-2.5 py-1 text-xs font-bold text-white">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
              </div>

              {goals.length === 0 ? (
                <p className="rounded-xl border border-border bg-card p-5 text-center text-xs text-muted-foreground">
                  No goals set for this cycle.
                </p>
              ) : (
                <ul className="space-y-2">
                  {goals.map((g) => (
                    <li key={g.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{g.title}</p>
                          {g.description && <p className="text-[11px] text-muted-foreground">{g.description}</p>}
                          {g.target && <p className="mt-0.5 text-[11px] text-muted-foreground">Target: {g.target}</p>}
                        </div>
                        {!locked && (
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => setEditing(g)} className="rounded-lg p-1.5 hover:bg-muted">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeGoal(g)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {g.weight_pct}% weight
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-india-green" style={{ width: `${g.progress_pct}%` }} />
                        </div>
                        <span className="tabular-nums text-[11px] text-muted-foreground">{g.progress_pct}%</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {GOAL_STATUS.find((s) => s.v === g.status)?.label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {editing && (
                <div className="mt-3 space-y-3 rounded-xl border border-india-green/40 bg-card p-4">
                  <label className="block">
                    <Lbl>Goal</Lbl>
                    <input className={inp} value={editing.title ?? ""}
                      placeholder="Close all leave requests within 2 working days"
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </label>
                  <label className="block">
                    <Lbl>Why it matters (optional)</Lbl>
                    <textarea className={area} value={editing.description ?? ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <Lbl>Measure of success</Lbl>
                      <input className={inp} value={editing.target ?? ""} placeholder="2 working days"
                        onChange={(e) => setEditing({ ...editing, target: e.target.value })} />
                    </label>
                    <label className="block">
                      <Lbl>Status</Lbl>
                      <select className={inp} value={editing.status ?? "not_started"}
                        onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                        {GOAL_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <Lbl>Weight %</Lbl>
                      <input type="number" min={0} max={100} className={inp} value={editing.weight_pct ?? 0}
                        onChange={(e) => setEditing({ ...editing, weight_pct: Number(e.target.value) })} />
                    </label>
                    <label className="block">
                      <Lbl>Progress %</Lbl>
                      <input type="number" min={0} max={100} className={inp} value={editing.progress_pct ?? 0}
                        onChange={(e) => setEditing({ ...editing, progress_pct: Number(e.target.value) })} />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(null)}
                      className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                      Cancel
                    </button>
                    <button onClick={saveGoal} disabled={busy}
                      className="h-9 rounded-lg bg-india-green px-4 text-xs font-bold text-white disabled:opacity-60">
                      {busy ? "Saving…" : "Save goal"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* appraisal */}
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Star className="h-4 w-4 text-india-green" /> Appraisal
              </h4>
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <Lbl>Self rating (out of {cycle.rating_max})</Lbl>
                    <input type="number" step="0.5" min={0} max={cycle.rating_max} className={inp}
                      disabled={locked} value={review?.self_rating ?? ""}
                      onChange={(e) => upd({ self_rating: e.target.value === "" ? null : Number(e.target.value) })} />
                  </label>
                  <label className="block">
                    <Lbl>Manager rating (out of {cycle.rating_max})</Lbl>
                    <input type="number" step="0.5" min={0} max={cycle.rating_max} className={inp}
                      disabled={locked} value={review?.manager_rating ?? ""}
                      onChange={(e) => upd({ manager_rating: e.target.value === "" ? null : Number(e.target.value) })} />
                  </label>
                </div>
                <label className="block">
                  <Lbl>What went well</Lbl>
                  <textarea className={area} disabled={locked} value={review?.strengths ?? ""}
                    onChange={(e) => upd({ strengths: e.target.value })} />
                </label>
                <label className="block">
                  <Lbl>Where to improve</Lbl>
                  <textarea className={area} disabled={locked} value={review?.improvements ?? ""}
                    onChange={(e) => upd({ improvements: e.target.value })} />
                </label>
                <label className="block">
                  <Lbl>Manager's comments</Lbl>
                  <textarea className={area} disabled={locked} value={review?.manager_comments ?? ""}
                    onChange={(e) => upd({ manager_comments: e.target.value })} />
                </label>

                {review?.status === "final" && review.finalised_at && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalised on {fmtDate(review.finalised_at)}
                  </p>
                )}

                {!locked && (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => saveReview("reviewed")} disabled={busy}
                      className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60">
                      Save draft
                    </button>
                    <button onClick={() => saveReview("final")} disabled={busy}
                      className="h-9 rounded-lg bg-india-green px-4 text-xs font-bold text-white disabled:opacity-60">
                      {busy ? "Saving…" : "Mark final"}
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  A review cannot be marked final without a manager rating.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ── create a review cycle ────────────────────────────────────────────── */

function CycleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  // Default to the Indian financial year we are currently in, since BharatOne
  // reviews annually — the dates are derived, not typed in and mistyped.
  const now = new Date();
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);
  const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: `FY ${fyStart.getFullYear()}–${String(fyStart.getFullYear() + 1).slice(2)}`,
    start: iso(fyStart), end: iso(fyEnd), status: "open",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("hr_perf_save_cycle", {
      p_id: null, p_name: form.name, p_start: form.start, p_end: form.end, p_status: form.status,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not create the cycle", { description: error?.message ?? data?.message });
    }
    toast.success("Review cycle created");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold">New review cycle</h3>
        <label className="block">
          <Lbl>Name</Lbl>
          <input className={inp} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Lbl>From</Lbl>
            <input type="date" className={inp} value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="block">
            <Lbl>To</Lbl>
            <input type="date" className={inp} value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <Lbl>Status</Lbl>
          <select className={inp} value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft — not visible to staff</option>
            <option value="open">Open — goals and reviews can be recorded</option>
            <option value="closed">Closed — read only</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
            Cancel
          </button>
          <button onClick={save} disabled={busy}
            className="h-10 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</p>
  </div>
);

export default Performance;
