import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Loader2, RefreshCw, Wallet, X } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/accountant/salary-requests")({
  head: () => ({ meta: [{ title: "Salary Requests — Accountant Portal" }] }),
  component: Page,
});

const db = supabase as any;
type Req = {
  id: string; user_id: string; reason: string; amount: number | null; needed_by: string | null;
  status: string; applied_at: string; decision_note: string | null;
  decided_at: string | null; paid_at: string | null; payment_reference: string | null; payment_note: string | null;
};
const fmtD = (s: string) => new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const inr = (n: number | null) => "₹" + Number(n ?? 0).toLocaleString("en-IN");

/**
 * Early salary requests HR has approved, waiting on accounts to pay. The
 * accountant's reply — reference number and note — is recorded on the request
 * and shown to the employee, HR and admin alike.
 */
function Page() {
  const [rows, setRows] = useState<Req[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Req | null>(null);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      // RLS: accountants see early_salary requests only (never resignations).
      const { data } = await db.from("hr_staff_requests")
        .select("id,user_id,reason,amount,needed_by,status,applied_at,decision_note,decided_at,paid_at,payment_reference,payment_note")
        .eq("kind", "early_salary")
        .in("status", ["awaiting_payment", "paid"])
        .order("applied_at", { ascending: false }).limit(300);
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

  const pay = async () => {
    if (!paying) return;
    if (!ref.trim()) return toast.error("Enter the payment reference (UTR / NEFT ref)");
    setBusy(true);
    try {
      const { error } = await db.rpc("accountant_pay_staff_request", { p_id: paying.id, p_reference: ref.trim(), p_note: note.trim() || null });
      if (error) return toast.error("Could not record payment", { description: error.message });
      toast.success("Payment recorded", { description: "The employee and HR have been notified." });
      setPaying(null); setRef(""); setNote("");
      load();
    } finally { setBusy(false); }
  };

  const due = useMemo(() => rows.filter((r) => r.status === "awaiting_payment"), [rows]);
  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wallet className="h-5 w-5" />} title="Salary Requests" subtitle="Early salary requests approved by HR, waiting on payment" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{due.length} due · {paid.length} paid</p>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>

        {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div> : (
          <>
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <p className="border-b border-border px-5 py-3 text-sm font-bold">Awaiting payment</p>
              {due.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nothing due — every approved request has been paid.</p> : (
                <ul className="divide-y divide-border">
                  {due.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">{names[r.user_id] ?? "Staff member"} · <span className="text-india-green">{inr(r.amount)}</span>{r.needed_by && <span className="font-normal text-muted-foreground"> · needed by {fmtD(r.needed_by)}</span>}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.reason}{r.decision_note ? ` · HR: ${r.decision_note}` : ""} · approved {r.decided_at ? fmtD(r.decided_at) : "—"}</p>
                      </div>
                      <Button size="sm" onClick={() => { setPaying(r); setRef(""); setNote(""); }} className="bg-india-green text-white hover:bg-india-green/90">
                        <Banknote className="h-4 w-4" /> Mark paid
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <p className="border-b border-border px-5 py-3 text-sm font-bold">Payment history</p>
              {paid.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p> : (
                <ul className="divide-y divide-border">
                  {paid.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">{names[r.user_id] ?? "Staff member"} · {inr(r.amount)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          Paid {r.paid_at ? fmtD(r.paid_at) : "—"}{r.payment_reference ? ` · ref ${r.payment_reference}` : ""}{r.payment_note ? ` · ${r.payment_note}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {paying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setPaying(null)}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Record payment — {names[paying.user_id] ?? "Staff member"}, {inr(paying.amount)}</p>
                <button onClick={() => setPaying(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <label className="mt-4 block text-[11px] font-semibold text-muted-foreground">Payment reference (UTR / NEFT ref) *</label>
              <input className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" placeholder="e.g. NEFT-889123" value={ref} onChange={(e) => setRef(e.target.value)} />
              <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Note (optional — the employee and HR see this)</label>
              <textarea rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="e.g. Credited to salary account, will be adjusted in August payroll" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button onClick={pay} disabled={busy} className="mt-4 w-full bg-india-green text-white hover:bg-india-green/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} Record payment
              </Button>
            </div>
          </div>
        )}
      </div>
    </AccountantShell>
  );
}
