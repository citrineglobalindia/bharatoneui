import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, ShieldCheck, XCircle, FileSearch, IdCard, Loader2, RefreshCw, PhoneCall } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

export const Route = createFileRoute("/qc/dashboard")({
  head: () => ({ meta: [{ title: "QC Dashboard — BharatOne" }] }),
  component: DashboardPage,
});
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function Stat({ icon: Icon, label, value, tone, to }: any) {
  const inner = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elev">
      <div className="flex items-center gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p></div></div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function DashboardPage() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("qc_dashboard"); setD(data ?? {}); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<ClipboardCheck className="h-5 w-5" />} title="QC Dashboard" subtitle="Verification queue and KYC outcomes."
          actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />
        {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={ClipboardCheck} label="Pending QC" value={d?.qc_pending ?? 0} tone="bg-amber-500/10 text-amber-600" to="/qc/kyc-queue" />
              <Stat icon={ShieldCheck} label="Approved" value={d?.approved ?? 0} tone="bg-india-green/10 text-india-green" />
              <Stat icon={XCircle} label="Rejected" value={d?.rejected ?? 0} tone="bg-rose-500/10 text-rose-600" />
              <Stat icon={PhoneCall} label="With Telecaller" value={d?.telecaller ?? 0} tone="bg-orange-500/10 text-orange-600" />
              <Stat icon={FileSearch} label="Total Registrations" value={d?.total ?? 0} tone="bg-blue-500/10 text-blue-600" />
              <Stat icon={IdCard} label="Old JSKO IDs" value={d?.jsko_ids ?? 0} tone="bg-violet-500/10 text-violet-600" to="/qc/jsko" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-3 text-sm font-bold">Applications awaiting QC</p>
              {(d?.recent ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-2">Application</th><th className="py-2">Name</th><th className="py-2">Type</th><th className="py-2">Amount</th><th className="py-2">Status</th></tr></thead>
                  <tbody>{(d.recent as any[]).map((r, i) => (<tr key={i} className="border-t border-border"><td className="py-2 font-mono text-xs">{r.application_id}</td><td className="py-2 font-semibold">{r.name}</td><td className="py-2 text-muted-foreground">{r.registration_type === "old" ? "Old JSKO" : "Retailer"}</td><td className="py-2">{r.payment_amount ? inr(r.payment_amount) : "—"}</td><td className="py-2"><StatusBadge status="QC" /></td></tr>))}</tbody></table></div>}
            </div>
          </>
        )}
      </div>
    </QcShell>
  );
}
