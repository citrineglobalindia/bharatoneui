import { useEffect, useMemo, useState } from "react";
import { Mail, Loader2, RefreshCw, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Sub = { email: string; status: string; source: string | null; created_at: string };

/** Newsletter signups captured from the website footer. */
export function NewsletterAdmin() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    await ensureStaffSession();
    const { data } = await (supabase as any).rpc("admin_newsletter_subscribers", { _limit: 5000 });
    setRows((data as Sub[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.email.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const active = rows.filter((r) => r.status === "subscribed").length;
  const today = rows.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;

  const exportCsv = () => {
    const head = ["Email", "Status", "Source", "Subscribed on"];
    const body = filtered.map((r) => [r.email, r.status, r.source ?? "", new Date(r.created_at).toLocaleString("en-IN")]);
    const csv = [head, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Mail className="h-5 w-5 text-admin" /> Newsletter Subscribers</h2>
          <p className="text-sm text-muted-foreground">Everyone who signed up through the "Stay in the loop" form in the website footer.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-bold text-white disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total signups", rows.length], ["Active subscribers", active], ["Today", today]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="mt-1 text-2xl font-extrabold">{String(v)}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email…"
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30" />
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No subscribers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Subscribed on</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{r.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "subscribed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.source ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
