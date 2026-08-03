// E-Store delivery agents — shared by the Store portal and the administrator's
// E-Store tab.
//
// The estore_delivery_agents table and the "assign to agent" control on the
// admin order screen have both existed since the E-Store was built, but nothing
// could ever create an agent, so the table was empty and the control was a dead
// end. This is the missing half.
//
// Agents are retired rather than deleted: an order delivered last month still
// has to be able to say who took it.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Bike, Phone, MapPin, Search, X, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


type Agent = {
  id: string; name: string; phone: string; area: string | null;
  vehicle_no: string | null; notes: string | null; active: boolean;
  created_at: string; open_orders: number; delivered: number;
};

const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-violet-500";

export function AgentsPanel() {
  const [rows, setRows] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRetired, setShowRetired] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("estore_agents_list", { _include_inactive: showRetired });
    if (error) toast.error("Could not load agents", { description: error.message });
    setRows((data as Agent[]) ?? []);
    setLoading(false);
  }, [showRetired]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((a) => `${a.name} ${a.phone} ${a.area ?? ""} ${a.vehicle_no ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Delivery agents</h1>
            <p className="text-sm text-muted-foreground">The people who take the parcels out. Orders are assigned to them from the Orders screen.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={() => setEditing({ active: true })}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> Add agent
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input className={`${inp} pl-9`} placeholder="Name, phone, area or vehicle" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
            Show retired agents
          </label>
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {rows.length ? "Nobody matches that search."
              : "No delivery agents yet. Add the people who take parcels out and you can assign orders to them."}
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((a) => (
              <div key={a.id} className={`rounded-2xl border p-4 shadow-soft ${a.active ? "border-border bg-card" : "border-dashed border-border bg-muted/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                      <Bike className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {a.name}
                        {!a.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Retired</span>}
                      </p>
                      <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline">
                        <Phone className="h-3 w-3" /> {a.phone}
                      </a>
                      {a.area && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {a.area}</p>}
                      {a.vehicle_no && <p className="text-xs text-muted-foreground">Vehicle {a.vehicle_no}</p>}
                      {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => setEditing(a)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex gap-4 border-t border-border pt-2.5 text-xs">
                  <span><b className="text-base">{a.open_orders}</b> <span className="text-muted-foreground">out with them</span></span>
                  <span><b className="text-base">{a.delivered}</b> <span className="text-muted-foreground">delivered</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && <AgentDialog a={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </>
  );
}

function AgentDialog({ a, onClose, onDone }: {
  a: Partial<Agent>; onClose: () => void; onDone: () => void;
}) {
  const [f, setF] = useState({
    name: a.name ?? "", phone: a.phone ?? "", area: a.area ?? "",
    vehicle_no: a.vehicle_no ?? "", notes: a.notes ?? "", active: a.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const phoneOk = /^[6-9]\d{9}$/.test(f.phone);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Enter the agent's name");
    if (!phoneOk) return toast.error("Enter a valid 10-digit mobile number");
    setSaving(true);
    try {
      const { error } = await (supabase as any).rpc("estore_save_agent", {
        _id: a.id ?? null, _name: f.name.trim(), _phone: f.phone,
        _area: f.area.trim() || null, _vehicle_no: f.vehicle_no.trim() || null,
        _notes: f.notes.trim() || null, _active: f.active,
      });
      if (error) throw error;
      toast.success(a.id ? "Agent updated" : "Agent added");
      onDone();
    } catch (e: any) {
      const m = String(e.message || e);
      toast.error("Could not save", {
        description: m.includes("INVALID_PHONE") ? "That is not a valid Indian mobile number." : m,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Bike className="h-4 w-4 text-violet-600" /> {a.id ? "Edit agent" : "Add delivery agent"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Name</label>
            <input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mobile number</label>
            <input className={inp} inputMode="numeric" maxLength={10} value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10 digits" />
            {f.phone.length === 10 && !phoneOk && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">An Indian mobile number starts with 6, 7, 8 or 9.</p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Area</label>
              <input className={inp} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="e.g. Mysuru South" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vehicle number</label>
              <input className={inp} value={f.vehicle_no} onChange={(e) => setF({ ...f, vehicle_no: e.target.value.toUpperCase() })} placeholder="KA 09 AB 1234" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Notes</label>
            <input className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" />
          </div>
          {a.id && (
            <label className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
              <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
              <span>Active — uncheck to retire. Past deliveries keep their name.</span>
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-sm font-bold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
