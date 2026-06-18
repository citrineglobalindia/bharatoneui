import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Loader2, RefreshCw, ClipboardCheck, ShieldCheck, XCircle, PhoneCall } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
export const Route = createFileRoute("/qc/reports")({
  head: () => ({ meta: [{ title: "QC Reports — BharatOne" }] }),
  component: () => {
    const [d, setD] = useState<any>(null); const [loading, setLoading] = useState(true);
    async function load() { setLoading(true); try { await ensureStaffSession(); const { data } = await supabase.rpc("qc_dashboard"); setD(data ?? {}); } finally { setLoading(false); } }
    useEffect(() => { load(); }, []);
    const cards = [["Pending QC", d?.qc_pending ?? 0, ClipboardCheck, "bg-amber-500/10 text-amber-600"], ["Approved", d?.approved ?? 0, ShieldCheck, "bg-india-green/10 text-india-green"], ["Rejected", d?.rejected ?? 0, XCircle, "bg-rose-500/10 text-rose-600"], ["With Telecaller", d?.telecaller ?? 0, PhoneCall, "bg-orange-500/10 text-orange-600"]];
    const total = Number(d?.total || 0);
    return (
      <QcShell>
        <div className="space-y-5">
          <PageHeader icon={<BarChart3 className="h-5 w-5" />} title="QC Reports" subtitle="Verification outcomes across all registrations." actions={<button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />
          {loading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([l, v, Icon, t]: any, i) => (<div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-center gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl ${t}`}><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-2xl font-extrabold">{v}</p>{total ? <p className="text-[11px] text-muted-foreground">{Math.round((Number(v)/total)*100)}% of {total}</p> : null}</div></div></div>))}</div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="mb-3 text-sm font-bold">Outcome distribution</p>
                {["approved","rejected","qc_pending","telecaller"].map((k) => { const v = Number(d?.[k] || 0); const pct = total ? (v/total)*100 : 0; return (<div key={k} className="mb-2"><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-muted-foreground">{k.replace("_"," ")}</span><span className="font-bold">{v}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-india-green" style={{ width: `${pct}%` }} /></div></div>); })}
              </div>
            </>
          )}
        </div>
      </QcShell>
    );
  },
});
