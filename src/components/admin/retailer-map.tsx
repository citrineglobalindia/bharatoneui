import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Pt = { name: string; shop: string | null; district: string | null; mobile: string | null; status: string; lat: number; lng: number };

function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
    }
    if (document.getElementById("leaflet-js")) { const t = setInterval(() => { if (w.L) { clearInterval(t); resolve(w.L); } }, 100); return; }
    const s = document.createElement("script"); s.id = "leaflet-js"; s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => resolve(w.L); s.onerror = reject; document.body.appendChild(s);
  });
}
const tone: Record<string, string> = { approved: "#138808", completed: "#138808", qc_review: "#6366f1", accountant_review: "#f59e0b", rejected: "#e11d48", telecaller: "#f97316" };

export function RetailerMap({ scope }: { scope: "admin" | "distributor" }) {
  const [pts, setPts] = useState<Pt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dist, setDist] = useState("all");
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);

  async function load() {
    setLoading(true);
    try { await ensureStaffSession(); const { data } = await supabase.rpc(scope === "admin" ? "admin_retailer_map" : "distributor_retailer_map"); setPts(((data as Pt[]) ?? []).filter((p) => p.lat && p.lng)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

  const districts = useMemo(() => Array.from(new Set(pts.map((p) => p.district).filter(Boolean))) as string[], [pts]);
  const shown = useMemo(() => pts.filter((p) => (dist === "all" || p.district === dist) && (!q || [p.name, p.shop, p.mobile, p.district].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))), [pts, q, dist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet().catch(() => null);
      if (!L || cancelled || !mapRef.current) return;
      if (!map.current) {
        map.current = L.map(mapRef.current, { scrollWheelZoom: false }).setView([20.5937, 78.9629], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map.current);
      }
      if (layer.current) layer.current.remove();
      layer.current = L.layerGroup().addTo(map.current);
      const bounds: any[] = [];
      shown.forEach((p) => {
        const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: tone[p.status] || "#64748b", fillOpacity: 0.9 });
        m.bindPopup(`<b>${p.name}</b><br/>${p.shop || ""}<br/>${p.district || ""}<br/>${p.mobile || ""}<br/><span style="text-transform:capitalize">${p.status.replace("_", " ")}</span>`);
        m.addTo(layer.current); bounds.push([p.lat, p.lng]);
      });
      if (bounds.length) map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      setTimeout(() => map.current && map.current.invalidateSize(), 100);
    })();
    return () => { cancelled = true; };
  }, [shown]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><MapPin className="h-5 w-5 text-india-green" /> Retailer Map <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-xs font-bold text-india-green">{pts.length}</span></h2>
          <p className="text-sm text-muted-foreground">{scope === "admin" ? "All retailers" : "Your district's retailers"} plotted by registration location.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-52 rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none" placeholder="Search retailer" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value={dist} onChange={(e) => setDist(e.target.value)}><option value="all">All districts</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div ref={mapRef} style={{ height: "62vh", width: "100%" }} className="bg-muted/30">{loading && <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <p className="border-b border-border px-3 py-2.5 text-sm font-bold">Retailers ({shown.length})</p>
          <div className="max-h-[58vh] overflow-y-auto">
            {shown.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No located retailers.</p>
              : shown.map((p, i) => (
                <button key={i} onClick={() => { if (map.current) { map.current.setView([p.lat, p.lng], 14); } }} className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left hover:bg-muted/50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tone[p.status] || "#64748b" }} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block truncate text-[11px] text-muted-foreground">{p.shop || "—"} · {p.district || "—"}</span></span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
