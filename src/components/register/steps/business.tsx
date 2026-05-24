import { useState } from "react";
import { Building2, MapPin, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Field, inputCls, SectionCard, StepHeader } from "../field";
import { Button } from "@/components/ui/button";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function BusinessStep() {
  const [coords, setCoords] = useState({ lat: 12.937917, lng: 77.476868 });
  const [addrType, setAddrType] = useState<"urban" | "rural">("urban");

  const useGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) =>
      setCoords({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
    );
  };

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Building2 className="h-5 w-5" />}
        title="Business Details"
        description="Enter your shop information, address and pin your location on the map."
      />

      <Field label="Shop / Business Name" required>
        <input className={inputCls} placeholder="Your business name" />
      </Field>

      <Field label="Address Type" required>
        <select
          value={addrType}
          onChange={(e) => setAddrType(e.target.value as "urban" | "rural")}
          className={inputCls}
        >
          <option value="urban">🏙 Urban</option>
          <option value="rural">🌾 Rural</option>
        </select>
      </Field>

      <SectionCard
        title={addrType === "urban" ? "Urban Address" : "Rural Address"}
        icon={<MapPin className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Building / Shop No" required>
            <input className={inputCls} placeholder="Building or shop number" />
          </Field>
          <Field label="Street / Area">
            <input className={inputCls} placeholder="Street or area name" />
          </Field>
          <Field label={addrType === "urban" ? "Ward Number" : "Village"}>
            <input className={inputCls} placeholder={addrType === "urban" ? "Ward number" : "Village name"} />
          </Field>
          <Field label="Landmark">
            <input className={inputCls} placeholder="Nearby landmark" />
          </Field>
          <Field label={addrType === "urban" ? "City" : "Taluk"} required>
            <input className={inputCls} placeholder={addrType === "urban" ? "City" : "Taluk"} />
          </Field>
          <Field label="District" required>
            <select className={inputCls}>
              <option>Select district</option>
              <option>Bengaluru Urban</option>
              <option>Bengaluru Rural</option>
              <option>Hassan</option>
              <option>Mysuru</option>
            </select>
          </Field>
          <Field label="State" required>
            <input className={inputCls} defaultValue="Karnataka" />
          </Field>
          <Field label="Pincode" required>
            <input className={inputCls} placeholder="6 digit pincode" maxLength={6} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Pin Shop Location on Map" icon={<MapPin className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground -mt-2">
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
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[coords.lat, coords.lng]} icon={icon} />
            <ClickPicker onPick={(lat, lng) => setCoords({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) })} />
          </MapContainer>
        </div>
        <p className="text-xs text-primary font-medium">
          📍 Coordinates: {coords.lat}, {coords.lng}
        </p>
      </SectionCard>

      <div>
        <h3 className="text-base font-bold text-foreground">Bank Details (Optional)</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Account Holder Name">
            <input className={inputCls} placeholder="Account holder name" />
          </Field>
          <Field label="Bank Name">
            <input className={inputCls} placeholder="e.g. State Bank of India" />
          </Field>
          <Field label="Account Number">
            <input className={inputCls} placeholder="Account no." />
          </Field>
          <Field label="IFSC Code">
            <input className={inputCls} placeholder="IFSC" />
          </Field>
        </div>
      </div>
    </div>
  );
}