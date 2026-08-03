// Store → Orders. The packing bench.
//
// The filter lives in the URL rather than in component state so that a refresh,
// a bookmark, or a link from the dashboard all land on the same queue. Getting
// this wrong is what used to send people back to a dashboard every time they
// pressed F5.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Search, PackageCheck, Truck, CheckCircle2, MapPin, Phone,
  ClipboardCheck, PackageOpen, Bike, X, AlertTriangle, Printer, User,
} from "lucide-react";
import { StoreShell } from "@/components/store/store-shell";
import { supabase } from "@/integrations/supabase/client";

/** The queue being looked at, kept in the URL so refresh and links both work. */
type OrderSearch = { s?: string };

export const Route = createFileRoute("/store/orders")({
  head: () => ({ meta: [{ title: "Store Orders — BharatOne" }] }),
  validateSearch: (raw: Record<string, unknown>): OrderSearch =>
    ({ s: typeof raw.s === "string" ? raw.s : undefined }),
  component: StoreOrders,
});

type Row = {
  id: string; order_no: string; placed_at: string | null; delivered_at: string | null;
  status: string; payment_status: string; order_for: string; total: number; items: number;
  ship_name: string | null; ship_phone: string | null; ship_line: string | null;
  ship_landmark: string | null; ship_city: string | null; ship_state: string | null;
  ship_pincode: string | null; courier: string | null; tracking_no: string | null;
  assigned_agent: string | null; agent_name: string | null; retailer_name: string | null;
  notes: string | null; has_open_return: boolean;
};
type Agent = { id: string; name: string; phone: string; area: string | null; active: boolean };
type Detail = {
  order: Row & Record<string, unknown>;
  agent_name: string | null; retailer_name: string | null;
  items: { id: string; name: string; qty: number; image_path: string | null; sku: string | null; brand: string | null }[];
  events: { status: string | null; note: string | null; at: string }[];
  returns: { id: string; qty: number; reason: string; status: string; at: string }[];
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const imgUrl = (p?: string | null) => p ? supabase.storage.from("estore").getPublicUrl(p).data.publicUrl : "";
const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const TONE: Record<string, string> = {
  placed: "bg-sky-100 text-sky-700", confirmed: "bg-indigo-100 text-indigo-700",
  packed: "bg-violet-100 text-violet-700", shipped: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700", delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700", needs_attention: "bg-rose-100 text-rose-700",
};

/**
 * The one action that moves this order forward.
 *
 * Showing every possible status as a dropdown invites mistakes — somebody marks
 * a box "delivered" while it is still on the bench. Each state has exactly one
 * next step, so that is the only button offered.
 */
const NEXT: Record<string, { to: string; label: string; icon: any }> = {
  placed:           { to: "confirmed",        label: "Confirm order", icon: ClipboardCheck },
  confirmed:        { to: "packed",           label: "Mark packed",   icon: PackageOpen },
  packed:           { to: "shipped",          label: "Dispatch",      icon: Truck },
  shipped:          { to: "out_for_delivery", label: "Out for delivery", icon: Bike },
  out_for_delivery: { to: "delivered",        label: "Mark delivered", icon: CheckCircle2 },
};

const QUEUES = [
  { k: "", label: "All open" },
  { k: "placed", label: "To confirm" },
  { k: "confirmed", label: "To pack" },
  { k: "packed", label: "To dispatch" },
  { k: "shipped", label: "Shipped" },
  { k: "out_for_delivery", label: "Out for delivery" },
  { k: "delivered", label: "Delivered" },
  { k: "needs_attention", label: "Needs attention" },
];

const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-violet-500";

function StoreOrders() {
  const navigate = useNavigate();
  const { s } = useSearch({ strict: false }) as OrderSearch;
  const status = s ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: ag }] = await Promise.all([
      (supabase as any).rpc("estore_store_orders", { _status: status || null, _limit: 500 }),
      (supabase as any).rpc("estore_agents_list", { _include_inactive: false }),
    ]);
    if (error) toast.error("Could not load orders", { description: error.message });
    setRows((data as Row[]) ?? []);
    setAgents((ag as Agent[]) ?? []);
    setLoading(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.order_no, r.ship_name, r.ship_phone, r.ship_city, r.ship_pincode, r.tracking_no, r.retailer_name]
        .join(" ").toLowerCase().includes(t));
  }, [rows, q]);

  const openOrder = async (id: string) => {
    const { data } = await (supabase as any).rpc("estore_store_order_detail", { _order: id });
    setOpen((data as Detail) ?? null);
  };

  const advance = async (row: Row, to: string, courier?: string, tracking?: string) => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("estore_store_set_status", {
        _order: row.id, _status: to, _courier: courier ?? null, _tracking: tracking ?? null,
      });
      if (error) throw error;
      if (!data?.ok) return toast.error("Could not update", { description: data?.message });
      toast.success(`${row.order_no} → ${to.replace(/_/g, " ")}`);
      setOpen(null);
      load();
    } catch (e: any) {
      toast.error("Could not update", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  const assign = async (row: Row, agentId: string) => {
    const { error } = await (supabase as any).rpc("estore_store_assign_agent", {
      _order: row.id, _agent: agentId || null,
    });
    if (error) return toast.error("Could not assign", { description: error.message });
    toast.success(agentId ? "Delivery assigned" : "Assignment cleared");
    load();
  };

  return (
    <StoreShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Orders</h1>
            <p className="text-sm text-muted-foreground">
              Paid orders only. Anything unpaid is still a shopping cart, not work.
            </p>
          </div>
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUEUES.map((qq) => (
            <button key={qq.k}
              onClick={() => navigate({ to: "/store/orders", search: qq.k ? { s: qq.k } : {} })}
              className={`rounded-full px-3.5 h-9 text-xs font-semibold transition ${
                status === qq.k ? "bg-violet-600 text-white" : "border border-border bg-card hover:bg-muted"}`}>
              {qq.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input className={`${inp} pl-9`} placeholder="Order number, name, phone, pincode or tracking number"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {rows.length ? "Nothing matches that search." : "Nothing in this queue. "}
            {!rows.length && <span className="font-semibold text-emerald-600">All caught up.</span>}
          </p>
        ) : (
          <div className="space-y-2.5">
            {shown.map((r) => {
              const next = NEXT[r.status];
              const NextIcon = next?.icon ?? PackageCheck;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        <button onClick={() => openOrder(r.id)} className="hover:underline">{r.order_no}</button>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${TONE[r.status] ?? "bg-muted"}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                        {r.has_open_return && (
                          <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-bold text-saffron">Return open</span>
                        )}
                        {r.order_for === "customer" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">For a customer</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.items} item{r.items === 1 ? "" : "s"} · {inr(r.total)} · placed {when(r.placed_at)}
                        {r.retailer_name ? ` · ${r.retailer_name}` : ""}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" /><b>{r.ship_name}</b></span>
                        <a href={`tel:${r.ship_phone}`} className="inline-flex items-center gap-1 text-violet-700 hover:underline">
                          <Phone className="h-3 w-3" />{r.ship_phone}
                        </a>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />{[r.ship_city, r.ship_state, r.ship_pincode].filter(Boolean).join(", ")}
                        </span>
                      </p>
                      {r.tracking_no && (
                        <p className="mt-1 text-xs text-muted-foreground">Courier <b>{r.courier}</b> · {r.tracking_no}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {r.status === "needs_attention" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> Waiting on an administrator
                        </span>
                      ) : next ? (
                        r.status === "packed" ? (
                          <DispatchButton row={r} busy={busy} onDispatch={(c, t) => advance(r, "shipped", c, t)} />
                        ) : (
                          <button onClick={() => advance(r, next.to)} disabled={busy}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-60">
                            <NextIcon className="h-4 w-4" /> {next.label}
                          </button>
                        )
                      ) : null}

                      {["confirmed", "packed", "shipped", "out_for_delivery"].includes(r.status) && (
                        <select value={r.assigned_agent ?? ""} onChange={(e) => assign(r, e.target.value)}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
                          <option value="">Delivery: unassigned</option>
                          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.area ? ` · ${a.area}` : ""}</option>)}
                        </select>
                      )}
                      <button onClick={() => openOrder(r.id)} className="text-xs font-semibold text-violet-700 hover:underline">
                        Open packing slip
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && <PackingSlip d={open} onClose={() => setOpen(null)} />}
    </StoreShell>
  );
}

/**
 * Dispatch needs a courier and a tracking number, so it gets a small form
 * instead of a button. The server refuses a "shipped" without a tracking number
 * too — a parcel nobody can trace is not really shipped.
 */
function DispatchButton({ row, busy, onDispatch }: {
  row: Row; busy: boolean; onDispatch: (courier: string, tracking: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [courier, setCourier] = useState(row.courier ?? "");
  const [tracking, setTracking] = useState(row.tracking_no ?? "");
  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white">
        <Truck className="h-4 w-4" /> Dispatch
      </button>
    );
  }
  return (
    <div className="w-full min-w-[240px] space-y-1.5 rounded-xl border border-border bg-muted/20 p-2.5">
      <input className={inp} placeholder="Courier (e.g. Delhivery)" value={courier} onChange={(e) => setCourier(e.target.value)} />
      <input className={inp} placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
      <div className="flex gap-1.5">
        <button onClick={() => setShow(false)} className="h-9 flex-1 rounded-lg border border-border text-xs font-semibold hover:bg-muted">Cancel</button>
        <button onClick={() => onDispatch(courier.trim(), tracking.trim())}
          disabled={busy || !courier.trim() || !tracking.trim()}
          className="h-9 flex-1 rounded-lg bg-violet-600 text-xs font-bold text-white disabled:opacity-50">
          Dispatch
        </button>
      </div>
    </div>
  );
}

/** What goes in the box, and where it is going. Printable. */
function PackingSlip({ d, onClose }: { d: Detail; onClose: () => void }) {
  const o = d.order;
  const addr = [o.ship_line, o.ship_landmark, o.ship_city, o.ship_state, o.ship_pincode].filter(Boolean).join(", ");
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy/50 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-2xl rounded-2xl bg-card p-5 shadow-elev print:my-0 print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 print:hidden">
          <h3 className="text-base font-extrabold">Packing slip · {o.order_no}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Deliver to</p>
            <p className="mt-1 text-sm font-bold">{o.ship_name}</p>
            <p className="text-sm">{o.ship_phone}</p>
            <p className="mt-1 text-sm text-muted-foreground">{addr}</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Order</p>
            <p className="mt-1">Placed {when(o.placed_at)}</p>
            <p>Status <b className="capitalize">{String(o.status).replace(/_/g, " ")}</b></p>
            {d.retailer_name && <p>Retailer {d.retailer_name}</p>}
            {d.agent_name && <p>Delivery by {d.agent_name}</p>}
            {o.tracking_no && <p>{o.courier} · {o.tracking_no}</p>}
          </div>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="p-2">Item</th><th className="p-2">SKU</th><th className="p-2 text-center">Qty</th><th className="p-2 text-center">Picked</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((i) => (
              <tr key={i.id} className="border-b border-border">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {i.image_path && <img src={imgUrl(i.image_path)} alt="" className="h-8 w-8 rounded object-cover print:hidden" />}
                    <span className="font-semibold">{i.name}</span>
                    {i.brand && <span className="text-xs text-muted-foreground">{i.brand}</span>}
                  </div>
                </td>
                <td className="p-2 text-xs text-muted-foreground">{i.sku ?? "—"}</td>
                <td className="p-2 text-center font-bold">{i.qty}</td>
                <td className="p-2 text-center"><span className="inline-block h-4 w-4 rounded border border-muted-foreground/50" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {d.returns.length > 0 && (
          <div className="mt-4 rounded-xl border border-saffron/30 bg-saffron/5 p-3">
            <p className="text-xs font-bold text-saffron">Returns on this order</p>
            {d.returns.map((r) => (
              <p key={r.id} className="text-xs text-muted-foreground">{r.qty} × — {r.reason} · <span className="capitalize">{r.status}</span></p>
            ))}
          </div>
        )}

        <div className="mt-4 print:hidden">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">History</p>
          <ol className="space-y-1.5 border-l border-border pl-4">
            {d.events.map((e, i) => (
              <li key={i} className="relative text-xs">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                <span className="font-semibold">{e.note ?? e.status}</span>
                <span className="ml-2 text-muted-foreground">{when(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
