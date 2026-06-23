import { lazy, Suspense, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const DISTRICTS = [
  "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
  "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada",
  "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar",
  "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi",
  "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir",
];

type PinInfo = { found: boolean; state?: string; district?: string; districts?: string[] };

export function BusinessStep() {
  const { data, set } = useRegistration();
  const addrType = data.addressType;
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null);
  const [pinChecking, setPinChecking] = useState(false);

  useEffect(() => {
    const pin = (data.pincode || "").trim();
    if (pin.length !== 6) { setPinInfo(null); return; }
    let on = true;
    setPinChecking(true);
    (async () => {
      const { data: res } = await supabase.rpc("lookup_pincode", { p_pincode: pin });
      if (!on) return;
      const info = (res as PinInfo) ?? { found: false };
      setPinInfo(info); setPinChecking(false);
      // No auto-fill: user selects State and District manually.
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pincode]);

  const applyPin = () => { if (pinInfo?.found) set({ state: pinInfo.state, district: pinInfo.district }); };
  const districtOptions = Array.from(new Set([...DISTRICTS, ...(pinInfo?.districts ?? []), pinInfo?.district].filter(Boolean))) as string[];
  const stateMatch = !pinInfo?.found || !data.state || data.state.trim().toLowerCase() === (pinInfo.state ?? "").toLowerCase();
  const districtMatch = !pinInfo?.found || !data.district || (pinInfo.districts ?? []).map((d) => d.toLowerCase()).includes(data.district.trim().toLowerCase());
  const PinVerify = () => {
    if (pinChecking) return <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Verifying pincode…</p>;
    if (!pinInfo) return null;
    if (!pinInfo.found) return <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600"><AlertTriangle className="h-3 w-3" /> PIN code not recognised. Please check.</p>;
    if (stateMatch && districtMatch) return <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Verified · {pinInfo.district}, {pinInfo.state}</p>;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
        <AlertTriangle className="h-3 w-3 shrink-0" /> This PIN belongs to <b>{pinInfo.district}, {pinInfo.state}</b>.
        <button type="button" onClick={applyPin} className="rounded-md bg-india-green px-2 py-0.5 text-white">Apply</button>
      </div>
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
        <input
          className={inputCls} autoComplete="off"
          placeholder="Your business name"
          value={data.shopName}
          onChange={(e) => set({ shopName: e.target.value })}
        />
      </Field>

      <Field label="Address Type" required>
        <select
          value={addrType}
          onChange={(e) => set({ addressType: e.target.value as "urban" | "rural" })}
          className={inputCls} autoComplete="off"
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
              <input className={inputCls} autoComplete="off" placeholder="Building or shop number"
                value={data.buildingShopNo} onChange={(e) => set({ buildingShopNo: e.target.value })} />
            </Field>
            <Field label="Street / Area">
              <input className={inputCls} autoComplete="off" placeholder="Street or area name"
                value={data.streetArea} onChange={(e) => set({ streetArea: e.target.value })} />
            </Field>
            <Field label="Ward Number">
              <input className={inputCls} autoComplete="off" placeholder="Ward number"
                value={data.wardNumber} onChange={(e) => set({ wardNumber: e.target.value })} />
            </Field>
            <Field label="Landmark">
              <input className={inputCls} autoComplete="off" placeholder="Nearby landmark"
                value={data.landmark} onChange={(e) => set({ landmark: e.target.value })} />
            </Field>
            <Field label="City" required>
              <input className={inputCls} autoComplete="off" placeholder="City"
                value={data.city} onChange={(e) => set({ city: e.target.value.replace(/[0-9]/g, "") })} />
            </Field>
            <Field label="District" required>
              <select className={inputCls} autoComplete="off" value={data.district} onChange={(e) => set({ district: e.target.value })}>
                <option value="">Select district</option>
                {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="State" required>
              <input className={inputCls} autoComplete="off" value={data.state} onChange={(e) => set({ state: e.target.value })} />
            </Field>
            <Field label="Pincode" required>
              <input className={inputCls} autoComplete="off" placeholder="6 digit pincode" maxLength={6}
                value={data.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} />
              <PinVerify />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop No." required>
              <input className={inputCls} autoComplete="off" placeholder="Shop number"
                value={data.buildingShopNo} onChange={(e) => set({ buildingShopNo: e.target.value })} />
            </Field>
            <Field label="Village Name" required>
              <input className={inputCls} autoComplete="off" placeholder="Village name"
                value={data.villageName} onChange={(e) => set({ villageName: e.target.value })} />
            </Field>
            <Field label="Gram Panchayat" required>
              <input className={inputCls} autoComplete="off" placeholder="Gram Panchayat"
                value={data.gramPanchayat} onChange={(e) => set({ gramPanchayat: e.target.value })} />
            </Field>
            <Field label="Hobli Name" required>
              <input className={inputCls} autoComplete="off" placeholder="Hobli name"
                value={data.hobliName} onChange={(e) => set({ hobliName: e.target.value })} />
            </Field>
            <Field label="Post Office" required>
              <input className={inputCls} autoComplete="off" placeholder="Post office"
                value={data.postOffice} onChange={(e) => set({ postOffice: e.target.value })} />
            </Field>
            <Field label="Post Office Name">
              <input className={inputCls} autoComplete="off" placeholder="Post office name"
                value={data.postOfficeName} onChange={(e) => set({ postOfficeName: e.target.value })} />
            </Field>
            <Field label="PIN Code" required>
              <input className={inputCls} autoComplete="off" placeholder="6 digit pincode" maxLength={6}
                value={data.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} />
              <PinVerify />
            </Field>
            <Field label="Taluk" required>
              <input className={inputCls} autoComplete="off" placeholder="Taluk"
                value={data.taluk} onChange={(e) => set({ taluk: e.target.value })} />
            </Field>
            <Field label="District" required>
              <select className={inputCls} autoComplete="off" value={data.district} onChange={(e) => set({ district: e.target.value })}>
                <option value="">Select district</option>
                {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="State" required>
              <input className={inputCls} autoComplete="off" value={data.state} onChange={(e) => set({ state: e.target.value })} />
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
