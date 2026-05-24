import { lazy, Suspense, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { Field, inputCls, SectionCard, StepHeader } from "../field";

const BusinessMap = lazy(() => import("./business-map"));

const MapFallback = (
  <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
    Loading map…
  </div>
);

export function BusinessStep() {
  const [addrType, setAddrType] = useState<"urban" | "rural">("urban");

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
        <ClientOnly fallback={MapFallback}>
          <Suspense fallback={MapFallback}>
            <BusinessMap />
          </Suspense>
        </ClientOnly>
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