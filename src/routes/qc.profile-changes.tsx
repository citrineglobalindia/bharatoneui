import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserCog, Loader2, Check, X, RefreshCw, Phone, Mail } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/qc/profile-changes")({
  head: () => ({ meta: [{ title: "Profile Changes — QC Portal" }] }),
  component: Page,
});

type Req = {
  id: string; user_id: string; field: string; old_value: string | null; new_value: string;
  status: string; remarks: string | null; created_at: string;
  requester_name: string | null; requester_email: string | null; requester_phone: string | null;
  application_id: string | null;
};

function Page() {
  const [rows, setRows] = useState<Req[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async (status = tab) => {
    setLoading(true);
    await ensureStaffSession();
    const { data, error } = await (supabase as any).rpc("qc_list_profile_change_requests", { _status: status });
    if (error) toast.error(error.message);
    setRows((data as Req[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [tab]);

  const review = async (r: Req, approve: boolean) => {
    const remarks = approve ? null : (window.prompt("Reason for rejecting (shown to the retailer):") ?? "");
    if (!approve && remarks === null) return;
    setActing(r.id);
    try {
      const { data, error } = await (supabase as any).rpc("review_profile_change_request", { _id: r.id, _approve: approve, _remarks: remarks || null });
      if (error) { toast.error("Review failed", { description: error.message }); return; }
      if (!(data as any)?.ok) {
        const reason = (data as any)?.reason;
        toast.error(reason === "email_taken" ? "That email is already used by another account" : reason === "already_reviewed" ? "Someone else already reviewed this request" : "Review failed");
        return;
      }
      toast.success(approve ? "Approved — the change is now live" : "Rejected — the retailer has been notified");
      await load();
    } finally { setActing(null); }
  };

  const fieldChip = (f: string) => f === "phone"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700"><Phone className="h-3 w-3" /> Mobile</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700"><Mail className="h-3 w-3" /> Email</span>;

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<UserCog className="h-5 w-5" />} title="Profile Changes"
          subtitle="Retailer requests to change their mobile number or email — the change applies only after approval." />

        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 h-9 text-xs font-semibold capitalize transition ${tab === t ? "bg-india-green text-white shadow-soft" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
          <Button variant="outline" className="ml-auto h-9" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Retailer</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Requested on</th>
                <th className="px-4 py-3">{tab === "pending" ? "Action" : "Remarks"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No {tab} requests.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.requester_name || r.requester_email || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{[r.application_id, r.requester_email, r.requester_phone].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-4 py-3">{fieldChip(r.field)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.old_value || <span className="text-muted-foreground">Nill</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{r.new_value}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    {tab === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => review(r, true)} disabled={acting === r.id} className="h-8 bg-india-green text-white">
                          {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => review(r, false)} disabled={acting === r.id} className="h-8 text-rose-600">
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.remarks || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </QcShell>
  );
}
