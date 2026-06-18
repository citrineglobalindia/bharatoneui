import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation, MapPin } from "lucide-react";
import { inputCls } from "../field";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function BusinessMap({ onChange }: { onChange?: (lat: number, lng: number) => void }) {
  const [coords, setCoords] = useState({ lat: 12.937917, lng: 77.476868 });
  const [prox, setProx] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => { onChange?.(coords.lat, coords.lng); }, [coords.lat, coords.lng]);
  useEffect(() => {
    let on = true; setChecking(true);
    const t = setTimeout(async () => {
      try { const { data } = await supabase.rpc("check_retailer_location", { p_lat: coords.lat, p_lng: coords.lng }); if (on) setProx(data); } finally { if (on) setChecking(false); }
    }, 600);
    return () => { on = false; clearTimeout(t); };
  }, [coords.lat, coords.lng]);

  const useGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) =>
      setCoords({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Click on the map or drag the pin to set your shop location. GPS is optional.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className={inputCls} autoComplete="off"
          value={coords.lat}
          onChange={(e) => setCoords((c) => ({ ...c, lat: +e.target.value || 0 }))}
        />
        <input
          className={inputCls} autoComplete="off"
          value={coords.lng}
          onChange={(e) => setCoords((c) => ({ ...c, lng: +e.target.value || 0 }))}
        />
        <Button variant="outline" onClick={useGPS} className="h-11 shrink-0">
          <Navigation className="h-4 w-4" /> GPS
        </Button>
      </div>
      <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          key={`${coords.lat}-${coords.lng}`}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[coords.lat, coords.lng]} icon={icon} />
          <ClickPicker onPick={(lat, lng) => setCoords({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) })} />
        </MapContainer>
      </div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <MapPin className="h-3.5 w-3.5" /> Coordinates: {coords.lat}, {coords.lng}
      </p>
      {prox && (prox.allowed
        ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Location available{prox.nearest_km != null ? ` — nearest agent ${prox.nearest_km} km away` : ""} (min {prox.radius_km} km).</div>
        : <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This location already has an existing agent ({prox.nearest_name?.trim() || "nearby"}) within {prox.radius_km} km. Please choose another location to register.</div>)}
      {checking && <p className="text-[11px] text-muted-foreground">Checking location availability…</p>}
    </div>
  );
}