// Store dashboard — the day's work, counted.
//
// Every tile is a queue somebody has to empty, in the order they have to be
// emptied. There are no revenue figures here on purpose: a packing bench needs
// to know how many boxes are waiting, not what the company earned this week.
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Loader2, RefreshCw, PackageCheck, Boxes, RotateCcw, Bike, AlertTriangle,
  Truck, CheckCircle2, ClipboardCheck, PackageOpen,
} from "lucide-react";
import { StoreShell } from "@/components/store/store-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/store/dashboard")({
  head: () => ({ meta: [{ title: "Store Dashboard — BharatOne" }] }),
  component: StoreDashboard,
});

type Stats = {
  to_confirm: number; to_pack: number; to_dispatch: number; in_transit: number;
  needs_attention: number; delivered_7d: number; low_stock: number; out_of_stock: number;
  open_returns: number; agents: number;
};

function StoreDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc("estore_store_stats");
    setS((data as Stats) ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const queues = [
    { label: "To confirm", n: s?.to_confirm ?? 0, icon: ClipboardCheck, q: "placed", tone: "text-sky-600" },
    { label: "To pack", n: s?.to_pack ?? 0, icon: PackageOpen, q: "confirmed", tone: "text-indigo-600" },
    { label: "To dispatch", n: s?.to_dispatch ?? 0, icon: PackageCheck, q: "packed", tone: "text-violet-600" },
    { label: "In transit", n: s?.in_transit ?? 0, icon: Truck, q: "shipped", tone: "text-blue-600" },
  ];

  return (
    <StoreShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Today at the store</h1>
            <p className="text-sm text-muted-foreground">Everything waiting on you, in the order it has to be done.</p>
          </div>
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : (
          <>
            {(s?.needs_attention ?? 0) > 0 && (
              <Link to="/store/orders" search={{ s: "needs_attention" }}
                className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 hover:bg-rose-100">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{s?.needs_attention} order{s?.needs_attention === 1 ? "" : "s"} need attention</p>
                  <p className="text-xs">Paid, but the stock was gone by the time the payment landed. An administrator has to decide on a refund or a replacement.</p>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {queues.map((q) => {
                const Icon = q.icon;
                return (
                  <Link key={q.label} to="/store/orders" search={{ s: q.q }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-violet-300">
                    <Icon className={`h-5 w-5 ${q.tone}`} />
                    <p className="mt-2 text-2xl font-extrabold">{q.n}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{q.label}</p>
                  </Link>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Link to="/store/inventory"
                className={`rounded-2xl border p-4 shadow-soft transition hover:border-violet-300 ${
                  (s?.out_of_stock ?? 0) > 0 ? "border-rose-200 bg-rose-50" : "border-border bg-card"}`}>
                <Boxes className={`h-5 w-5 ${(s?.out_of_stock ?? 0) > 0 ? "text-rose-600" : "text-amber-600"}`} />
                <p className="mt-2 text-2xl font-extrabold">{s?.low_stock ?? 0}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  Running low{(s?.out_of_stock ?? 0) > 0 ? ` · ${s?.out_of_stock} at zero` : ""}
                </p>
              </Link>
              <Link to="/store/returns" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-violet-300">
                <RotateCcw className="h-5 w-5 text-saffron" />
                <p className="mt-2 text-2xl font-extrabold">{s?.open_returns ?? 0}</p>
                <p className="text-xs font-semibold text-muted-foreground">Open returns</p>
              </Link>
              <Link to="/store/agents" className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-violet-300">
                <Bike className="h-5 w-5 text-violet-600" />
                <p className="mt-2 text-2xl font-extrabold">{s?.agents ?? 0}</p>
                <p className="text-xs font-semibold text-muted-foreground">Delivery agents</p>
              </Link>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-2 text-2xl font-extrabold">{s?.delivered_7d ?? 0}</p>
                <p className="text-xs font-semibold text-muted-foreground">Delivered this week</p>
              </div>
            </div>
          </>
        )}
      </div>
    </StoreShell>
  );
}
