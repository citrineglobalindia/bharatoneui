import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { toast } from "sonner";

export function AepsBankChanges() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"requested" | "approved" | "rejected" | "all">("requested");

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data, error } = await (supabase as any).rpc("admin_list_aeps_bank_changes", { p_status: filter === "all" ? null : filter });
      if (error) throw error;
      setRows((data as any[]) ?? []);
    } catch (e: any) { toast.error("Could not load bank changes", { description: e.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]);

  const act = async (id: string, action: "approve" | "reject") => {
    let remarks: string | null = null;
    if (action === "reject") { remarks = window.prompt("Reason for rejecting (optional):") || null; }
    setBusy(id);
    try {
      const { error } = await (supabase as any).rpc("admin_process_aeps_bank_change", { p_id: id, p_action: action, p_remarks: remarks });
      if (error) throw error;
      toast.success(action === "approve" ? "Bank updated" : "Rejected");
      await load();
    } catch (e: any) { toast.error("Action failed", { description: e.message }); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">Bank change requests</p>
        <div className="flex gap-1.5">
          {(["requested", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 h-7 text-[11px] font-semibold ${filter === f ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {f === "requested" ? "Pending" : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 h-7 text-[11px] font-semibold hover:bg-muted"><RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Retailer</th><th className="p-3">New bank</th><th className="p-3">Requested</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{loading ? "Loading…" : "No bank change requests."}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><div className="font-semibold">{r.retailer_name || "—"}</div><div className="text-[11px] text-muted-foreground">{r.jsko_id} · {r.mobile}</div></td>
                <td className="p-3 text-xs">{r.holder}<br />{r.account} · {r.ifsc}</td>
                <td className="p-3 text-xs">{new Date(r.requested_at).toLocaleString("en-IN")}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{r.status === "requested" ? "Pending" : r.status}</span></td>
                <td className="p-3 text-right">
                  {r.status === "requested" ? (
                    <div className="inline-flex gap-1.5">
                      <button disabled={busy === r.id} onClick={() => act(r.id, "approve")} className="rounded-lg bg-india-green px-3 h-8 text-xs font-bold text-white disabled:opacity-50">Approve</button>
                      <button disabled={busy === r.id} onClick={() => act(r.id, "reject")} className="rounded-lg border border-border px-3 h-8 text-xs font-semibold hover:bg-muted">Reject</button>
                    </div>
                  ) : <span className="text-[11px] text-muted-foreground">{r.processed_at ? new Date(r.processed_at).toLocaleDateString("en-IN") : ""}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
