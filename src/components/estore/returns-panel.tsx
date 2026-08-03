// E-Store returns — shared by the Store portal and the administrator's E-Store tab.
//
// The lifecycle is deliberately four steps rather than "approve and forget":
// requested -> approved -> received -> refunded. Stock only goes back at
// "received", because approving a return is a promise and the goods may still be
// on a lorry. Marking it refunded is the last word and cannot be undone here.
//
// One copy, two places. A second implementation on the admin screen would drift,
// and the copy that drifted would be the one that forgot to restock.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, PackageCheck, IndianRupee, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


type Row = {
  id: string; order_id: string; order_no: string; item_name: string; qty: number;
  reason: string; detail: string | null; status: string; refund_amount: number;
  restocked: boolean; decision_note: string | null; refund_ref: string | null;
  created_at: string; decided_at: string | null; refunded_at: string | null;
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-violet-500";

const TONE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700", approved: "bg-sky-100 text-sky-700",
  received: "bg-indigo-100 text-indigo-700", refunded: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};
const FILTERS = [
  { k: "", label: "All" }, { k: "requested", label: "New" }, { k: "approved", label: "Approved" },
  { k: "received", label: "Received" }, { k: "refunded", label: "Refunded" }, { k: "rejected", label: "Rejected" },
];

export function ReturnsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Row | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("estore_returns_list", { _status: null, _limit: 300 });
    if (error) toast.error("Could not load returns", { description: error.message });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => filter ? rows.filter((r) => r.status === filter) : rows, [rows, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const decide = async (r: Row, status: string, note?: string, amount?: number, ref?: string) => {
    setBusy(r.id);
    try {
      const { data, error } = await (supabase as any).rpc("estore_decide_return", {
        _return: r.id, _status: status, _note: note ?? null,
        _refund_amount: amount ?? null, _refund_ref: ref ?? null,
      });
      if (error) throw error;
      if (!data?.ok) return toast.error("Could not update", { description: data?.message });
      toast.success(
        status === "received" ? "Goods received — stock put back"
        : status === "refunded" ? "Marked refunded"
        : status === "approved" ? "Return approved" : "Return rejected");
      setRefunding(null); setRejecting(null);
      load();
    } catch (e: any) {
      toast.error("Could not update", { description: String(e.message || e) });
    } finally { setBusy(null); }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Returns</h1>
            <p className="text-sm text-muted-foreground">
              Stock goes back on the shelf when the goods actually arrive, not when the return is approved.
            </p>
          </div>
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`rounded-full px-3.5 h-9 text-xs font-semibold transition ${
                filter === f.k ? "bg-violet-600 text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {f.label}{f.k && counts[f.k] ? ` (${counts[f.k]})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {rows.length ? "Nothing in this state." : "No returns have been raised."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {shown.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {r.order_no}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${TONE[r.status] ?? "bg-muted"}`}>{r.status}</span>
                      {r.restocked && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Back in stock</span>}
                    </p>
                    <p className="mt-0.5 text-sm"><b>{r.qty} × {r.item_name}</b> — {r.reason}</p>
                    {r.detail && <p className="mt-0.5 text-xs text-muted-foreground">“{r.detail}”</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Raised {when(r.created_at)}
                      {r.decided_at ? ` · decided ${when(r.decided_at)}` : ""}
                      {r.refunded_at ? ` · refunded ${when(r.refunded_at)}` : ""}
                    </p>
                    {r.decision_note && <p className="mt-0.5 text-[11px] text-muted-foreground">Note: {r.decision_note}</p>}
                    {r.refund_ref && <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">Refund ref {r.refund_ref}</p>}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-extrabold">{inr(r.refund_amount)}</p>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {r.status === "requested" && (
                        <>
                          <button onClick={() => decide(r, "approved")} disabled={busy === r.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-60">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => setRejecting(r)} disabled={busy === r.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button onClick={() => decide(r, "received")} disabled={busy === r.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-60">
                          <PackageCheck className="h-3.5 w-3.5" /> Goods received
                        </button>
                      )}
                      {r.status === "received" && (
                        <button onClick={() => setRefunding(r)} disabled={busy === r.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-60">
                          <IndianRupee className="h-3.5 w-3.5" /> Mark refunded
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejecting && (
        <NoteDialog title="Reject this return" cta="Reject"
          hint="The retailer sees this, so say why in a sentence they can act on."
          required onClose={() => setRejecting(null)}
          onSave={(note) => decide(rejecting, "rejected", note)} />
      )}
      {refunding && (
        <RefundDialog r={refunding} onClose={() => setRefunding(null)}
          onSave={(amount, ref) => decide(refunding, "refunded", undefined, amount, ref)} />
      )}
    </>
  );
}

function NoteDialog({ title, cta, hint, required, onClose, onSave }: {
  title: string; cta: string; hint: string; required?: boolean;
  onClose: () => void; onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          className="mt-3 min-h-[80px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-violet-500" />
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
          <button onClick={() => onSave(note.trim())} disabled={required && note.trim().length < 3}
            className="h-10 flex-1 rounded-lg bg-violet-600 text-sm font-bold text-white disabled:opacity-50">{cta}</button>
        </div>
      </div>
    </div>
  );
}

function RefundDialog({ r, onClose, onSave }: {
  r: Row; onClose: () => void; onSave: (amount: number, ref: string) => void;
}) {
  const [amount, setAmount] = useState(String(r.refund_amount));
  const [ref, setRef] = useState("");
  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0 && ref.trim().length >= 3;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold"><IndianRupee className="h-4 w-4 text-emerald-600" /> Mark refunded</h3>
            <p className="text-xs text-muted-foreground">{r.order_no} · {r.qty} × {r.item_name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Amount refunded</label>
            <input className={inp} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Refund reference</label>
            <input className={inp} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Razorpay refund id or UTR" />
          </div>
          <p className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            This records that the money has gone back. It does <b>not</b> move the money — issue the refund in Razorpay first,
            then put its reference here so the two can be reconciled.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
            <button onClick={() => onSave(n, ref.trim())} disabled={!valid}
              className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">Mark refunded</button>
          </div>
        </div>
      </div>
    </div>
  );
}
