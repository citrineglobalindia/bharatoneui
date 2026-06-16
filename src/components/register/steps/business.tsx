import { lazy, Suspense } from "react";
import { Building2, MapPin } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { Field, inputCls, SectionCard, StepHeader } from "../field";
import { BankDetailsSection } from "../bank-details";
import { useRegistration } from "../registration-context";

const BusinessMap = lazy(() => import("./business-map"));

const MapFallback = (
  <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
    Loading map…
  </div>
);

const DISTRICTS = ["Bengaluru Urban", "Bengaluru Rural", "Hassan", "Mysuru"];

export function BusinessStep() {
  const { data, set } = useRegistration();
  const addrType = data.addressType;

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Building2 className="h-5 w-5" />}
        title="Business Details"
        description="Enter your shop information, address and pin your location on the map."
      />

      <Field label="Shop / Business Name" required>
        <input
          className={inputCls}
          placeholder="Your business name"
          value={data.shopName}
          onChange={(e) => set({ shopName: e.target.value })}
        />
      </Field>

      <Field label="Address Type" required>
        <select
          value={addrType}
          onChange={(e) => set({ addressType: e.target.value as "urban" | "rural" })}
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
        {addrType === "urban" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Building / Shop No" required>
              <input className={inputCls} placeholder="Building or shop number"
                value={data.buildingShopNo} onChange={(e) => set({ buildingShopNo: e.target.value })} />
            </Field>
            <Field label="Street / Area">
              <input className={inputCls} placeholder="Street or area name"
                value={data.streetArea} onChange={(e) => set({ streetArea: e.target.value })} />
            </Field>
            <Field label="Ward Number">
              <input className={inputCls} placeholder="Ward number"
                value={data.wardNumber} onChange={(e) => set({ wardNumber: e.target.value })} />
            </Field>
            <Field label="Landmark">
              <input className={inputCls} placeholder="Nearby landmark"
                value={data.landmark} onChange={(e) => set({ landmark: e.target.value })} />
            </Field>
            <Field label="City" required>
              <input className={inputCls} placeholder="City"
                value={data.city} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <Field label="District" required>
              <select className={inputCls} value={data.district} onChange={(e) => set({ district: e.target.value })}>
                <option value="">Select district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="State" required>
              <input className={inputCls} value={data.state} onChange={(e) => set({ state: e.target.value })} />
            </Field>
            <Field label="Pincode" required>
              <input className={inputCls} placeholder="6 digit pincode" maxLength={6}
                value={data.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop No." required>
              <input className={inputCls} placeholder="Shop number"
                value={data.buildingShopNo} onChange={(e) => set({ buildingShopNo: e.target.value })} />
            </Field>
            <Field label="Village Name" required>
              <input className={inputCls} placeholder="Village name"
                value={data.villageName} onChange={(e) => set({ villageName: e.target.value })} />
            </Field>
            <Field label="Gram Panchayat" required>
              <input className={inputCls} placeholder="Gram Panchayat"
                value={data.gramPanchayat} onChange={(e) => set({ gramPanchayat: e.target.value })} />
            </Field>
            <Field label="Hobli Name" required>
              <input className={inputCls} placeholder="Hobli name"
                value={data.hobliName} onChange={(e) => set({ hobliName: e.target.value })} />
            </Field>
            <Field label="Post Office" required>
              <input className={inputCls} placeholder="Post office"
                value={data.postOffice} onChange={(e) => set({ postOffice: e.target.value })} />
            </Field>
            <Field label="Post Office Name">
              <input className={inputCls} placeholder="Post office name"
                value={data.postOfficeName} onChange={(e) => set({ postOfficeName: e.target.value })} />
            </Field>
            <Field label="PIN Code" required>
              <input className={inputCls} placeholder="6 digit pincode" maxLength={6}
                value={data.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Taluk" required>
              <input className={inputCls} placeholder="Taluk"
                value={data.taluk} onChange={(e) => set({ taluk: e.target.value })} />
            </Field>
            <Field label="District" required>
              <select className={inputCls} value={data.district} onChange={(e) => set({ district: e.target.value })}>
                <option value="">Select district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="State" required>
              <input className={inputCls} value={data.state} onChange={(e) => set({ state: e.target.value })} />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Pin Shop Location on Map" icon={<MapPin className="h-5 w-5" />}>
        <ClientOnly fallback={MapFallback}>
          <Suspense fallback={MapFallback}>
            <BusinessMap onChange={(lat, lng) => set({ latitude: lat, longitude: lng })} />
          </Suspense>
        </ClientOnly>
      </SectionCard>

      <BankDetailsSection value={data.bank} onChange={(bank) => set({ bank })} required />
    </div>
  );
}
