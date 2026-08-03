// Store → Inventory.
//
// Two things only: what is running out, and booking in a delivery from a
// supplier. Booking stock OUT is not here — a write-off is an accounting
// decision and the RPC refuses it from this role. Anyone at the bench who breaks
// something raises it with an administrator, which is the point.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Search, Boxes, PackagePlus, AlertTriangle, History, X,
} from "lucide-react";
import { StoreShell } from "@/components/store/store-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/store/inventory")({
  head: () => ({ meta: [{ title: "Store Inventory — BharatOne" }] }),
  component: StoreInventory,
});

type Low = {
  id: string; name: string; sku: string | null; brand: string | null;
  stock_qty: number; low_stock_at: number; active: boolean;
  category: string | null; image_path: string | null;
};
type Prod = { id: string; name: string; sku: string | null; brand: string | null; stock_qty: number; low_stock_at: number };
type Move = {
  id: string; product_id: string; product_name: string; change: number;
  reason: string; balance_after: number; created_at: string; by_name: string | null;
};

const imgUrl = (p?: string | null) => p ? supabase.storage.from("estore").getPublicUrl(p).data.publicUrl : "";
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-violet-500";
const when = (s: string) => new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function StoreInventory() {
  const [low, setLow] = useState<Low[]>([]);
  const [all, setAll] = useState<Prod[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [receiving, setReceiving] = useState<Prod | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: lo }, { data: pr }, { data: mv }] = await Promise.all([
      (supabase as any).rpc("estore_low_stock", { _limit: 200 }),
      supabase.from("estore_products").select("id,name,sku,brand,stock_qty,low_stock_at")
        .eq("active", true).order("name"),
      (supabase as any).rpc("estore_stock_ledger", { _limit: 60, _product: null }),
    ]);
    setLow((lo as Low[]) ?? []);
    setAll((pr as Prod[]) ?? []);
    setMoves((mv as Move[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((p) => `${p.name} ${p.sku ?? ""} ${p.brand ?? ""}`.toLowerCase().includes(t));
  }, [all, q]);

  return (
    <StoreShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Inventory</h1>
            <p className="text-sm text-muted-foreground">What is running out, and booking in what has arrived.</p>
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
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
                <AlertTriangle className={`h-4 w-4 ${low.length ? "text-rose-600" : "text-emerald-600"}`} />
                Running low ({low.length})
              </h2>
              {low.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nothing is below its reorder level.
                </p>
              ) : (
                <div className="grid gap-2.5 lg:grid-cols-2">
                  {low.map((p) => (
                    <div key={p.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${p.stock_qty === 0 ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50/50"}`}>
                      {p.image_path
                        ? <img src={imgUrl(p.image_path)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        : <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted"><Boxes className="h-5 w-5 text-muted-foreground" /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku ? `SKU ${p.sku} · ` : ""}{p.category ?? "Uncategorised"}
                        </p>
                        <p className={`text-xs font-bold ${p.stock_qty === 0 ? "text-rose-700" : "text-amber-700"}`}>
                          {p.stock_qty === 0 ? "Out of stock" : `${p.stock_qty} left`} · reorder at {p.low_stock_at}
                        </p>
                      </div>
                      <button onClick={() => setReceiving({ id: p.id, name: p.name, sku: p.sku, brand: p.brand, stock_qty: p.stock_qty, low_stock_at: p.low_stock_at })}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white">
                        <PackagePlus className="h-3.5 w-3.5" /> Receive
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><Boxes className="h-4 w-4 text-violet-600" /> All products</h2>
                <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input className={`${inp} pl-9`} placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="p-3">Product</th><th className="p-3">SKU</th>
                      <th className="p-3 text-center">In stock</th><th className="p-3 text-center">Reorder at</th><th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-3 font-semibold">{p.name}{p.brand && <span className="ml-2 text-xs font-normal text-muted-foreground">{p.brand}</span>}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                        <td className={`p-3 text-center font-bold ${p.stock_qty === 0 ? "text-rose-600" : p.stock_qty <= p.low_stock_at ? "text-amber-600" : ""}`}>{p.stock_qty}</td>
                        <td className="p-3 text-center text-muted-foreground">{p.low_stock_at}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => setReceiving(p)} className="text-xs font-semibold text-violet-700 hover:underline">Receive stock</button>
                        </td>
                      </tr>
                    ))}
                    {shown.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No product matches that search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><History className="h-4 w-4 text-muted-foreground" /> Recent stock movements</h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="p-3">When</th><th className="p-3">Product</th><th className="p-3">Reason</th>
                      <th className="p-3 text-center">Change</th><th className="p-3 text-center">Balance</th><th className="p-3">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="p-3 text-xs text-muted-foreground">{when(m.created_at)}</td>
                        <td className="p-3">{m.product_name}</td>
                        <td className="p-3 text-xs capitalize text-muted-foreground">{m.reason.replace(/_/g, " ")}</td>
                        <td className={`p-3 text-center font-bold ${m.change > 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.change > 0 ? "+" : ""}{m.change}</td>
                        <td className="p-3 text-center">{m.balance_after}</td>
                        <td className="p-3 text-xs text-muted-foreground">{m.by_name ?? "System"}</td>
                      </tr>
                    ))}
                    {moves.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No movements yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {receiving && <ReceiveDialog p={receiving} onClose={() => setReceiving(null)} onDone={() => { setReceiving(null); load(); }} />}
    </StoreShell>
  );
}

function ReceiveDialog({ p, onClose, onDone }: { p: Prod; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter how many units arrived");
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc("estore_receive_stock", {
        _product: p.id, _qty: Math.round(n), _note: note.trim() || null,
      });
      if (error) throw error;
      toast.success(`${p.name} — now ${data.stock_qty} in stock`);
      onDone();
    } catch (e: any) {
      toast.error("Could not book it in", { description: String(e.message || e) });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold"><PackagePlus className="h-4 w-4 text-violet-600" /> Receive stock</h3>
            <p className="text-xs text-muted-foreground">{p.name} · {p.stock_qty} in stock now</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Units received</label>
            <input className={inp} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 25" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Note (optional)</label>
            <input className={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier or invoice number" />
          </div>
          <p className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            This is recorded in the stock ledger against your name. To take stock <b>out</b>, ask an administrator — a write-off is an accounting entry.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-sm font-bold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Book in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
