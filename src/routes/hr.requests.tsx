import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2, LogOut, RefreshCw, Wallet, XCircle } from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/hr/requests")({
  head: () => ({ meta: [{ title: "Staff Requests — HR Portal" }] }),
  component: Page,
});

const db = supabase as any;
type Req = {
  id: string; user_id: string; kind: "resignation" | "early_salary"; reason: string;
  last_working_day: string | null; amount: number | null; needed_by: string | null;
  status: string; applied_at: string; decision_note: string | null;
};
const TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700", withdrawn: "bg-slate-100 text-slate-600",
};
const fmtD = (s: string) => new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Resignations and early-salary requests raised by staff from My HR. */
function Page() {
  const [rows, setRows] = useState<Req[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await db.from("hr_staff_requests").select("*").order("applied_at", { ascending: false }).limit(300);
      const list = (data as Req[]) ?? [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: nm } = await db.rpc("staff_user_names", { _ids: ids });
        const m: Record<string, string> = {};
        for (const u of (nm as any[]) ?? []) m[u.id] = u.name;
        setNames(m);
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const decide = async (r: Req, approve: boolean) => {
    if (!confirm(`${approve ? "Approve" : "Reject"} this ${r.kind === "resignation" ? "resignation" : "early salary request"} from ${names[r.user_id] ?? "staff member"}?`)) return;
    setBusy(r.id);
    try {
      const { error } = await db.rpc("hr_decide_staff_request", { p_id: r.id, p_approve: approve, p_note: note[r.id] || null });
      if (error) return toast.error("Failed", { description: error.message });
      toast.success(approve ? "Approved — they have been notified" : "Rejected — they have been notified");
      load();
    } finally { setBusy(null); }
  };

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);
  const shown = tab === "pending" ? pending : decided;

  return (
    <HrShell>
      <div className="space-y-5">
        <PageHeader icon={<FileText className="h-5 w-5" />} title="Staff Requests" subtitle="Resignations and early salary requests raised by staff from My HR" />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <button onClick={() => setTab("pending")} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === "pending" ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>Pending ({pending.length})</button>
            <button onClick={() => setTab("decided")} className={`rounded-full px-3 h-8 text-xs font-semibold transition ${tab === "decided" ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>Decided ({decided.length})</button>
          </div>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>

        {loading ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {tab === "pending" ? "Nothing waiting on a decision." : "No decided requests yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {r.kind === "resignation" ? <LogOut className="h-4 w-4 text-rose-500" /> : <Wallet className="h-4 w-4 text-india-green" />}
                      {names[r.user_id] ?? "Staff member"}
                      <span className="font-normal text-muted-foreground">· {r.kind === "resignation" ? "Resignation" : "Early salary"}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Applied {fmtD(r.applied_at)}
                      {r.kind === "resignation" && r.last_working_day && <> · proposed last working day <b className="text-foreground">{fmtD(r.last_working_day)}</b></>}
                      {r.kind === "early_salary" && <> · <b className="text-foreground">₹{Number(r.amount ?? 0).toLocaleString("en-IN")}</b>{r.needed_by ? ` needed by ${fmtD(r.needed_by)}` : ""}</>}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${TONE[r.status]}`}>{r.status}</span>
                </div>
                <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">{r.reason}</p>
                {r.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="h-9 flex-1 min-w-[220px] rounded-lg border border-border bg-background px-2.5 text-sm outline-none"
                      placeholder="Decision note (optional — the person sees this)"
                      value={note[r.id] ?? ""}
                      onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" disabled={busy === r.id} onClick={() => decide(r, true)} className="bg-india-green text-white hover:bg-india-green/90">
                      {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r, false)} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : r.decision_note ? (
                  <p className="mt-2 text-xs text-muted-foreground">Decision note: {r.decision_note}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </HrShell>
  );
}
