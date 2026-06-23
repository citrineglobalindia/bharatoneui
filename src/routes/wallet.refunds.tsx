import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Banknote, Loader2, RefreshCw, Plus, X, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { downloadWalletCsv } from "@/lib/wallet-export";

export const Route = createFileRoute("/wallet/refunds")({
  head: () => ({ meta: [{ title: "Wallet · Refund Requests — BharatOne" }] }),
  component: RefundsPage,
});

type Row = { id: string; refund_no: string; operator: string | null; location: string | null; refund_for: string; amount: number; status: string; created_at: string };
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };
const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

function RefundsPage() {
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ refund_for: "", operator: "", location: "", amount: "" });

  async function load() { setLoading(true); const { data } = await supabase.from("refund_requests").select("id,refund_no,operator,location,refund_for,amount,status,created_at").order("created_at", { ascending: false }); setRows((data as Row[]) ?? []); setLoading(false); }
  const exportCsv = () => {
    downloadWalletCsv("refund-requests.csv", rows.map((r) => ({
      "CR amount": r.amount, "Amount": r.amount, "Type": "Refund",
      "Reference Table": "refund_requests", "Reference Id": r.refund_no, "Order Id": r.id,
      "Tracking id": r.refund_no, "Service Department": r.operator || r.location || "",
      "Service Remarks": (r.refund_for || "") + (r.status ? ` · ${r.status}` : ""),
      "Creation Date Time": new Date(r.created_at).toLocaleString("en-IN"),
    })));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!f.refund_for.trim()) return toast.error("Please enter what the refund is for");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setBusy(false); return toast.error("Please sign in again"); }
    const { error } = await supabase.from("refund_requests").insert({ user_id: u.user.id, refund_for: f.refund_for.trim(), operator: f.operator || null, location: f.location || null, amount: f.amount ? Number(f.amount) : 0 });
    setBusy(false);
    if (error) return toast.error("Could not create", { description: error.message });
    toast.success("Refund request created"); setOpen(false); setF({ refund_for: "", operator: "", location: "", amount: "" }); load();
  };

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Banknote className="h-5 w-5" />} title="Refund Requests" subtitle="Raise and track your refund requests"
          actions={<><button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Export</button><button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button><Button onClick={() => setOpen(true)} className="bg-india-green text-white"><Plus className="h-4 w-4" /> Create</Button></>} />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">Number</th><th className="px-3 py-2.5">Operator</th><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Refund For</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">No record found.</td></tr>
                : rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.refund_no}</td>
                    <td className="px-3 py-2.5">{r.operator || "—"}</td>
                    <td className="px-3 py-2.5">{r.location || "—"}</td>
                    <td className="px-3 py-2.5">{r.refund_for}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{inr(r.amount)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[r.status] ?? "bg-muted"}`}>{r.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><p className="font-display text-lg font-extrabold">New Refund Request</p><button onClick={() => setOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
            <div className="mt-4 space-y-3">
              <div><label className="text-[11px] font-semibold text-muted-foreground">Refund For *</label><input className={input} value={f.refund_for} onChange={(e) => setF({ ...f, refund_for: e.target.value })} placeholder="e.g. Failed AEPS transaction" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-muted-foreground">Operator</label><input className={input} value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })} placeholder="Operator" /></div>
                <div><label className="text-[11px] font-semibold text-muted-foreground">Amount (₹)</label><input type="number" className={input} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" /></div>
              </div>
              <div><label className="text-[11px] font-semibold text-muted-foreground">Location</label><input className={input} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Location" /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={busy} className="bg-india-green text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Submit</Button></div>
          </div>
        </div>
      )}
    </RetailerShell>
  );
}
