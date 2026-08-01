// BharatOne HR — Onboarding
//
// The checklist for people who have been hired but are not yet fully set up. The list
// is created when a candidate is marked Hired in Recruitment, so nothing has to be
// remembered at the hand-off. The checklist itself is editable in the template below,
// because what a joiner needs differs by company and changes over time.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus, Loader2, RefreshCw, CheckCircle2, Circle, Plus, Trash2,
  ListChecks, Mail, Phone, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Task = { id: string; label: string; category: string; sort_order: number; active: boolean };
type Item = {
  id: string; candidate_id: string; task_id: string; done: boolean;
  done_at: string | null; note: string | null;
};
type Joiner = {
  id: string; full_name: string; email: string | null; phone: string | null;
  opening_title: string | null; department: string | null; applied_on: string;
  onboarding_done: number; onboarding_total: number;
};

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

export function Onboarding() {
  const [joiners, setJoiners] = useState<Joiner[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [newTask, setNewTask] = useState({ label: "", category: "Joining" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: pipe }, { data: t }, { data: it }] = await Promise.all([
      db.rpc("hr_pipeline"),
      db.from("hr_onboarding_tasks").select("*").order("sort_order"),
      db.from("hr_onboarding").select("*"),
    ]);
    setJoiners(((pipe as any[]) ?? []).filter((c) => c.current_stage === "hired"));
    setTasks((t as Task[]) ?? []);
    setItems((it as Item[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (item: Item) => {
    setBusy(true);
    const { data, error } = await db.rpc("hr_set_onboarding", {
      p_id: item.id, p_done: !item.done, p_note: null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not update", { description: error?.message ?? data?.message });
    }
    load();
  };

  const addTask = async () => {
    if (!newTask.label.trim()) return toast.error("Describe the task");
    const { error } = await db.from("hr_onboarding_tasks").insert({
      label: newTask.label.trim(), category: newTask.category,
      sort_order: tasks.length + 1,
    });
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Added to the checklist", {
      description: "It applies to people hired from now on.",
    });
    setNewTask({ label: "", category: "Joining" });
    load();
  };

  const retireTask = async (t: Task) => {
    if (!confirm(`Remove “${t.label}” from the checklist?\n\nJoiners who already have it keep it.`)) return;
    const { error } = await db.from("hr_onboarding_tasks").update({ active: false }).eq("id", t.id);
    if (error) return toast.error("Could not remove", { description: error.message });
    toast.success("Removed from the checklist");
    load();
  };

  const byCandidate = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) {
      if (!m.has(i.candidate_id)) m.set(i.candidate_id, []);
      m.get(i.candidate_id)!.push(i);
    }
    return m;
  }, [items]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const pending = joiners.filter((j) => j.onboarding_done < j.onboarding_total);
  const complete = joiners.filter((j) => j.onboarding_total > 0 && j.onboarding_done >= j.onboarding_total);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <UserPlus className="h-5 w-5 text-india-green" /> Onboarding
          </h2>
          <p className="text-sm text-muted-foreground">
            Checklists are created automatically when someone is marked Hired in Recruitment.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setShowTemplate((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <ListChecks className="h-4 w-4" /> Checklist template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="In progress" value={pending.length} tone={pending.length ? "text-amber-600" : ""} />
        <Stat label="Completed" value={complete.length} tone="text-emerald-600" />
        <Stat label="Checklist items" value={tasks.filter((t) => t.active).length} />
      </div>

      {showTemplate && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold">Checklist template</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What every new joiner must complete. Changes apply to people hired from now on —
            existing checklists are left alone.
          </p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {tasks.filter((t) => t.active).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <p className="text-sm">{t.label}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.category}</p>
                </div>
                <button onClick={() => retireTask(t)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="block">
              <Lbl>New task</Lbl>
              <input className={inp} value={newTask.label} placeholder="ESI and PF enrolment"
                onChange={(e) => setNewTask({ ...newTask, label: e.target.value })} />
            </label>
            <label className="block">
              <Lbl>Category</Lbl>
              <select className={inp} value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}>
                {["Joining", "Documents", "Payroll", "Compliance", "Access", "Facilities", "Training"]
                  .map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <button onClick={addTask}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-3 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : joiners.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nobody is being onboarded. When you mark a candidate as Hired in Recruitment, their
          checklist appears here.
        </p>
      ) : (
        <div className="space-y-3">
          {joiners.map((j) => {
            const list = (byCandidate.get(j.id) ?? [])
              .map((i) => ({ item: i, task: taskById.get(i.task_id) }))
              .filter((x) => x.task)
              .sort((a, b) => (a.task!.sort_order ?? 0) - (b.task!.sort_order ?? 0));
            const pct = j.onboarding_total ? Math.round((j.onboarding_done / j.onboarding_total) * 100) : 0;
            const isOpen = open === j.id;

            return (
              <div key={j.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <button onClick={() => setOpen(isOpen ? null : j.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/40">
                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{j.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[j.opening_title, j.department].filter(Boolean).join(" · ") || "No role recorded"}
                    </p>
                    <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                      {j.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{j.email}</span>}
                      {j.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{j.phone}</span>}
                    </div>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="flex justify-between text-[11px]">
                      <span className={pct === 100 ? "font-bold text-emerald-600" : "text-muted-foreground"}>
                        {j.onboarding_done}/{j.onboarding_total}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-india-green"}`}
                           style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {list.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">
                        No checklist items — the template may have been empty when this person was hired.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {list.map(({ item, task }) => (
                          <li key={item.id}>
                            <button onClick={() => toggle(item)} disabled={busy}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 disabled:opacity-60">
                              {item.done
                                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                              <span className={`flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                                {task!.label}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {task!.category}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Creating the platform login and assigning a role is done in Admin → User Management.
        Once that exists, the person appears in Employee Management with their own record.
      </p>
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</p>
  </div>
);

export default Onboarding;
