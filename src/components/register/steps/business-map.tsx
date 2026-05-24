import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation, MapPin } from "lucide-react";
import { inputCls } from "../field";
import { Button } from "@/components/ui/button";

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

export default function BusinessMap() {
  const [coords, setCoords] = useState({ lat: 12.937917, lng: 77.476868 });

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
          className={inputCls}
          value={coords.lat}
          onChange={(e) => setCoords((c) => ({ ...c, lat: +e.target.value || 0 }))}
        />
        <input
          className={inputCls}
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
    </div>
  );
}