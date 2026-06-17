import { useEffect, useState } from "react";
import { Loader2, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Row = {
  id: string; application_no: string; category_name: string; service_name: string;
  full_name: string; phone: string; email: string; aadhaar_number: string; pan_number: string;
  service_charge: number; commission_price: number; status: string; submitter_name: string | null; created_at: string;
};
const tone: Record<string, string> = {
  submitted: "bg-saffron/10 text-saffron", in_progress: "bg-amber-500/10 text-amber-600",
  approved: "bg-india-green/10 text-india-green", completed: "bg-india-green/10 text-india-green",
  rejected: "bg-rose-500/10 text-rose-600",
};

export function ServiceApplicationsView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data } = await supabase.from("service_applications")
        .select("id,application_no,category_name,service_name,full_name,phone,email,aadhaar_number,pan_number,service_charge,commission_price,status,submitter_name,created_at")
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><FileSearch className="h-5 w-5 text-admin" /> Service Applications</h2>
          <p className="text-sm text-muted-foreground">All applications submitted through the New Application form.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Application</th><th className="px-3 py-2">Applicant</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Commission</th><th className="px-3 py-2">Submitted by</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No applications submitted yet.</td></tr>
              : rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{r.application_no}</td>
                <td className="px-3 py-2"><div className="font-semibold">{r.full_name}</div><div className="text-[11px] text-muted-foreground">{r.pan_number || r.aadhaar_number}</div></td>
                <td className="px-3 py-2"><div className="font-medium">{r.service_name}</div><div className="text-[11px] text-muted-foreground">{r.category_name}</div></td>
                <td className="px-3 py-2 text-xs">{r.phone}<br />{r.email}</td>
                <td className="px-3 py-2">₹{Number(r.service_charge).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-india-green">₹{Number(r.commission_price).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-xs">{r.submitter_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status.replace("_", " ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
