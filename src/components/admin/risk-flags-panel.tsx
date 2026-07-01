import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, RefreshCw, ShieldAlert, Eye, Check, X, AlertTriangle, MapPin, CreditCard, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Flag = {
  id: string; registration_id: string; rule: string; severity: string; detail: string | null; status: string; created_at: string;
  retailer_registrations: { application_id: string; first_name: string | null; surname: string | null; status: string } | null;
};

const ruleMeta: Record<string, { label: string; icon: any }> = {
  duplicate_pan: { label: "Duplicate PAN", icon: CreditCard },
  duplicate_aadhaar: { label: "Duplicate Aadhaar", icon: Fingerprint },
  duplicate_bank_account: { label: "Duplicate bank account", icon: CreditCard },
  location_cluster: { label: "Location cluster", icon: MapPin },
};
const sevTone: Record<string, string> = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };

export function RiskFlagsPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "reviewed" | "dismissed" | "all">("open");

  async function load() {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await (supabase as any)
      .from("risk_flags")
      .select("*, retailer_registrations(application_id, first_name, surname, status)")
      .order("severity", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as Flag[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    open: rows.filter((r) => r.status === "open").length,
    high: rows.filter((r) => r.status === "open" && r.severity === "high").length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter((r) => tab === "all" || r.status === tab), [rows, tab]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("risk_flags").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldAlert className="h-5 w-5 text-rose-600" /> Risk &amp; Fraud</h2>
          <p className="text-sm text-muted-foreground">Automated fraud signals: {counts.open} open ({counts.high} high severity).</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["open", "reviewed", "dismissed", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 h-9 text-sm font-semibold capitalize transition ${tab === t ? "bg-india-green text-white" : "bg-muted hover:bg-muted/70"}`}>
            {t} {t !== "all" && `(${rows.filter((r) => r.status === t).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Signal</th><th className="px-3 py-2">Applicant</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2">When</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No {tab} risk flags. <AlertTriangle className="inline h-3.5 w-3.5" /></td></tr>
            ) : filtered.map((r) => {
              const meta = ruleMeta[r.rule] ?? { label: r.rule, icon: AlertTriangle };
              const reg = r.retailer_registrations;
              const name = reg ? [reg.first_name, reg.surname].filter(Boolean).join(" ") : "—";
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sevTone[r.severity]}`}>{r.severity}</span></td>
                  <td className="px-3 py-2.5"><span className="flex items-center gap-1.5 font-semibold"><meta.icon className="h-4 w-4 text-muted-foreground" /> {meta.label}</span></td>
                  <td className="px-3 py-2.5"><div className="font-medium">{name}</div><div className="font-mono text-[11px] text-muted-foreground">{reg?.application_id ?? "—"}</div></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.detail}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => navigate({ to: "/review/$id", params: { id: r.registration_id } })} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"><Eye className="h-3.5 w-3.5" /> View</button>
                      {r.status === "open" && (
                        <>
                          <button onClick={() => setStatus(r.id, "reviewed")} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /> Reviewed</button>
                          <button onClick={() => setStatus(r.id, "dismissed")} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /> Dismiss</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
