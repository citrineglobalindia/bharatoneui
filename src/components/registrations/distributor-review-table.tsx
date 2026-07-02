import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, CreditCard, XCircle, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

type DistRow = {
  id: string; application_id: string; username: string | null; status: string;
  distributor_name: string | null; company_name: string | null; proprietor_name: string | null;
  mobile: string | null; alt_mobile: string | null; email: string | null;
  district: string | null; state: string | null; group_name: string | null;
  gst_number: string | null; pan_number: string | null; bank_name: string | null;
  account_number: string | null; ifsc: string | null; address_line: string | null;
  transaction_id: string | null; rejection_reason: string | null; created_at: string;
};

const db = supabase as any;
const statusPill = (s: string) => ({
  under_review: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700",
}[s] ?? "bg-slate-100 text-slate-700");

// Map the KYC-Approvals tab to the distributor status shown under it.
function statusForTab(tab: string): string[] {
  if (tab === "approved") return ["approved"];
  if (tab === "rejected") return ["rejected"];
  if (tab === "accountant_review" || tab === "qc_review" || tab === "telecaller") return ["under_review", "pending", "submitted"];
  return [];
}

export function DistributorReviewTable({ tab }: { tab: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<DistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistRow | null>(null);
  const canReview = role === "admin";

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await db.from("distributor_registrations").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as DistRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const wanted = useMemo(() => statusForTab(tab), [tab]);
  const filtered = useMemo(() => rows.filter((r) => wanted.includes(r.status)), [rows, wanted]);

  const approve = async (r: DistRow) => {
    setBusy(r.id);
    try {
      const { error } = await db.rpc("approve_distributor_registration", { reg_id: r.id });
      if (error) { toast.error("Approve failed", { description: error.message }); return; }
      toast.success("Distributor approved");
      setDetail(null); load();
    } finally { setBusy(null); }
  };
  const reject = async (r: DistRow) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    setBusy(r.id);
    try {
      const { error } = await db.rpc("reject_distributor_registration", { reg_id: r.id, reason: reason || "Rejected" });
      if (error) { toast.error("Reject failed", { description: error.message }); return; }
      toast.success("Distributor rejected");
      setDetail(null); load();
    } finally { setBusy(null); }
  };

  const dt = (s: string) => new Date(s);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Application ID", "Distributor ID", "Distributor Name", "Amount", "Checks", "Contact Number", "Email ID", "Date", "Time", "District", "Taluk", "Status"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              ))}
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={13} className="px-3 py-10 text-center text-muted-foreground">No distributor registrations in this tab.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">{r.application_id}</td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">{r.username || r.application_id}</td>
                <td className="px-3 py-3 font-semibold">{r.distributor_name || r.company_name || r.proprietor_name || "—"}</td>
                <td className="px-3 py-3">—</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{r.gst_number ? "GST ✓" : "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">{r.mobile || "—"}</td>
                <td className="px-3 py-3 text-sm"><span className="block max-w-[200px] truncate" title={r.email || ""}>{r.email || "—"}</span></td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{dt(r.created_at).toLocaleDateString("en-IN")}</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{dt(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-3 text-sm">{r.district || "—"}</td>
                <td className="px-3 py-3 text-sm">—</td>
                <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>{r.status.replace("_", " ")}</span></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    {canReview && r.status === "under_review" && (
                      <>
                        <Button size="sm" className="h-8 bg-india-green text-white" disabled={busy === r.id} onClick={() => approve(r)}>
                          {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-rose-600" disabled={busy === r.id} onClick={() => reject(r)}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] w-[min(720px,96vw)] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between gap-2"><span>{detail?.distributor_name || detail?.company_name || "Distributor"}</span><button onClick={() => setDetail(null)}><X className="h-5 w-5 text-muted-foreground" /></button></DialogTitle></DialogHeader>
          {detail && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{detail.application_id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusPill(detail.status)}`}>{detail.status.replace("_", " ")}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {([
                  ["Distributor ID", detail.username || detail.application_id], ["Proprietor", detail.proprietor_name], ["Company", detail.company_name],
                  ["Group", detail.group_name], ["GST", detail.gst_number], ["PAN", detail.pan_number],
                  ["Mobile", detail.mobile], ["Alt Mobile", detail.alt_mobile], ["Email", detail.email],
                  ["Bank", detail.bank_name], ["Account No", detail.account_number], ["IFSC", detail.ifsc],
                  ["Address", detail.address_line], ["District", detail.district], ["State", detail.state],
                  ["Transaction Id", detail.transaction_id],
                ] as [string, string | null][]).map(([l, v]) => (
                  <div key={l}><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p><p className="font-medium break-words">{v || "—"}</p></div>
                ))}
              </div>
              {detail.status === "rejected" && detail.rejection_reason && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Rejected: {detail.rejection_reason}</p>
              )}
              {canReview && detail.status === "under_review" && (
                <DialogFooter className="mt-4 gap-2">
                  <Button variant="outline" className="text-rose-600" disabled={busy === detail.id} onClick={() => reject(detail)}><XCircle className="h-4 w-4" /> Reject</Button>
                  <Button className="bg-india-green text-white" disabled={busy === detail.id} onClick={() => approve(detail)}>{busy === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
