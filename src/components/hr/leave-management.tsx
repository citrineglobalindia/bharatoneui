// BharatOne HR — Leave Management
//
// Apply, approve and track leave. Day counts and balance checks are done on the
// server, never here: the browser only shows what the server worked out, so a request
// cannot be pushed through by editing the page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  X,
  Loader2,
  RefreshCw,
  Download,
  Plus,
  Clock,
  CircleSlash,
  CheckCircle2,
  Search,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Req = {
  id: string;
  user_id: string;
  employee: string;
  employee_code: string | null;
  department: string | null;
  leave_code: string;
  leave_name: string;
  colour: string;
  from_date: string;
  to_date: string;
  days: number;
  half_day: boolean;
  reason: string;
  proof_path: string | null;
  status: string;
  applied_at: string;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string | null;
};

type LeaveType = { code: string; name: string; annual_days: number; colour: string; paid: boolean };
type Employee = { user_id: string; name: string; employee_code: string | null };

const TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function LeaveManagement() {
  const [rows, setRows] = useState<Req[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [decide, setDecide] = useState<{ row: Req; approve: boolean } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: list }, { data: t }, { data: emp }] = await Promise.all([
      db.rpc("hr_leave_list", { p_status: null, p_from: null, p_to: null, p_limit: 500 }),
      db
        .from("hr_leave_types")
        .select("code,name,annual_days,colour,paid")
        .eq("active", true)
        .order("sort_order"),
      db.rpc("hr_employees_list", { p_q: null, p_status: null }),
    ]);
    setRows((list as Req[]) ?? []);
    setTypes((t as LeaveType[]) ?? []);
    setStaff(
      ((emp as any[]) ?? []).map((e) => ({
        user_id: e.user_id,
        name: e.name,
        employee_code: e.employee_code,
      })),
    );
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submitDecision = async () => {
    if (!decide) return;
    setBusy(decide.row.id);
    const { data, error } = await db.rpc("hr_decide_leave", {
      p_id: decide.row.id,
      p_approve: decide.approve,
      p_note: note || null,
    });
    setBusy(null);
    if (error || !data?.ok) {
      return toast.error("Could not save the decision", {
        description: error?.message ?? data?.message,
      });
    }
    toast.success(decide.approve ? "Leave approved" : "Leave rejected", {
      description: `${decide.row.employee} has been notified.`,
    });
    setDecide(null);
    setNote("");
    load();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!needle) return true;
      return [r.employee, r.employee_code, r.department, r.leave_name, r.reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, tab, q]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      daysOut: rows.filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.days), 0),
    }),
    [rows],
  );

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const head = [
      "Employee",
      "Code",
      "Department",
      "Leave type",
      "From",
      "To",
      "Days",
      "Status",
      "Reason",
      "Applied",
      "Decided by",
      "Decision note",
    ];
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(",")]
      .concat(
        filtered.map((r) =>
          [
            r.employee,
            r.employee_code,
            r.department,
            r.leave_name,
            r.from_date,
            r.to_date,
            r.days,
            r.status,
            r.reason,
            r.applied_at,
            r.decided_by_name,
            r.decision_note,
          ]
            .map(cell)
            .join(","),
        ),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `leave-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${filtered.length} requests` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <CalendarDays className="h-5 w-5 text-india-green" /> Leave Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Sundays and declared holidays are never counted against a balance.
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
          <button
            onClick={() => setApplyOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" /> Apply leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            l: "Awaiting decision",
            v: counts.pending,
            i: Clock,
            tone: counts.pending ? "text-amber-600" : "",
          },
          { l: "Approved", v: counts.approved, i: CheckCircle2, tone: "text-emerald-600" },
          { l: "Rejected", v: counts.rejected, i: CircleSlash, tone: "" },
          { l: "Days approved", v: counts.daysOut, i: Users, tone: "" },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <c.i className="h-3.5 w-3.5" /> {c.l}
            </div>
            <div className={`mt-1 text-2xl font-extrabold tabular-nums ${c.tone}`}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(
            [
              ["pending", `Pending (${counts.pending})`],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
              ["all", "All"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                tab === k ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employee, department, reason…"
            className={`${inp} pl-9`}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-india-green" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "Nothing awaiting a decision." : "No leave requests here yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Employee</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Dates</th>
                <th className="px-3 py-2.5">Days</th>
                <th className="px-3 py-2.5">Reason</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{r.employee}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[r.employee_code, r.department].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${r.colour}20`, color: r.colour }}
                    >
                      {r.leave_name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {d(r.from_date)}
                    {r.from_date !== r.to_date && <> → {d(r.to_date)}</>}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {r.days}
                    {r.half_day && (
                      <span className="text-[10px] font-normal text-muted-foreground"> half</span>
                    )}
                  </td>
                  <td className="max-w-[240px] px-3 py-2.5 text-xs text-muted-foreground">
                    {r.reason}
                    {r.decision_note && (
                      <div className="mt-0.5 italic">
                        “{r.decision_note}”{r.decided_by_name ? ` — ${r.decided_by_name}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TONE[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {r.status === "pending" && (
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => {
                            setDecide({ row: r, approve: true });
                            setNote("");
                          }}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-india-green px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setDecide({ row: r, approve: false });
                            setNote("");
                          }}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1 text-[11px] font-bold text-rose-600 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decide && (
        <Modal
          onClose={() => setDecide(null)}
          title={decide.approve ? "Approve this leave?" : "Reject this leave?"}
        >
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">{decide.row.employee}</b> — {decide.row.leave_name},{" "}
            {decide.row.days} day(s) from {d(decide.row.from_date)}.
          </p>
          <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs">{decide.row.reason}</p>
          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {decide.approve ? "Note (optional)" : "Reason for rejecting (required)"}
            </span>
            <textarea
              className={`${inp} h-20 py-2`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={decide.approve ? "Anything the employee should know" : "Explain why"}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setDecide(null)}
              className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={submitDecision}
              disabled={!!busy || (!decide.approve && !note.trim())}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white disabled:opacity-50 ${
                decide.approve ? "bg-india-green" : "bg-rose-600"
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {decide.approve ? "Approve" : "Reject"}
            </button>
          </div>
        </Modal>
      )}

      {applyOpen && (
        <ApplyLeave
          types={types}
          staff={staff}
          onClose={() => setApplyOpen(false)}
          onDone={() => {
            setApplyOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ apply */

function ApplyLeave({
  types,
  staff,
  onClose,
  onDone,
}: {
  types: LeaveType[];
  staff: Employee[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    user_id: "",
    code: types[0]?.code ?? "casual",
    from: "",
    to: "",
    half: false,
    reason: "",
  });
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Ask the server how many working days this is, so the figure shown is the figure
  // that will actually be charged.
  useEffect(() => {
    if (!form.from || !form.to) {
      setDays(null);
      return;
    }
    let cancelled = false;
    db.rpc("hr_working_days", { p_from: form.from, p_to: form.to, p_half: form.half }).then(
      ({ data }: any) => {
        if (!cancelled) setDays(data == null ? null : Number(data));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [form.from, form.to, form.half]);

  const submit = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("hr_apply_leave", {
      p_code: form.code,
      p_from: form.from,
      p_to: form.to,
      p_reason: form.reason,
      p_half: form.half,
      p_user: form.user_id || null,
      p_proof: null,
    });
    setBusy(false);
    if (error) return toast.error("Could not apply", { description: error.message });
    if (!data?.ok) return toast.error("Could not apply", { description: data?.message });
    toast.success("Leave applied", { description: `${data.days} day(s) submitted for approval.` });
    onDone();
  };

  const ready = form.from && form.to && form.reason.trim() && (days ?? 0) > 0;

  return (
    <Modal onClose={onClose} title="Apply for leave">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Employee
          </span>
          <select
            className={inp}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          >
            <option value="">Myself</option>
            {staff.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.name}
                {s.employee_code ? ` (${s.employee_code})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Leave type
          </span>
          <select
            className={inp}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          >
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
                {t.annual_days > 0 ? ` — ${t.annual_days}/year` : " — unpaid"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={form.half}
            className="h-4 w-4 accent-india-green"
            onChange={(e) =>
              setForm({
                ...form,
                half: e.target.checked,
                to: e.target.checked ? form.from : form.to,
              })
            }
          />
          <span className="text-sm">Half day</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            From
          </span>
          <input
            type="date"
            className={inp}
            value={form.from}
            onChange={(e) =>
              setForm({ ...form, from: e.target.value, to: form.half ? e.target.value : form.to })
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <input
            type="date"
            className={inp}
            value={form.to}
            disabled={form.half}
            min={form.from}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Reason
          </span>
          <textarea
            className={`${inp} h-20 py-2`}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
      </div>

      {days !== null && (
        <p
          className={`mt-3 rounded-lg p-3 text-sm ${days > 0 ? "bg-india-green/10" : "bg-amber-100 text-amber-800"}`}
        >
          {days > 0 ? (
            <>
              This will use{" "}
              <b>
                {days} working day{days === 1 ? "" : "s"}
              </b>
              . Sundays and holidays in the range are not counted.
            </>
          ) : (
            "Those dates are all Sundays or holidays, so no leave is needed."
          )}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!ready || busy}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Apply
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default LeaveManagement;
