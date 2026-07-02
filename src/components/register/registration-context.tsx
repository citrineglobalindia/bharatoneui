import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { emptyBankDetails, type BankDetailsValue } from "./bank-details";
import type { PaymentData } from "./steps/payment";

export type RegFileKey =
  | "pan"
  | "aadhaar"
  | "shopPhoto"
  | "shopPhotoInside"
  | "police"
  | "video"
  | "selfie"
  | "passport"
  | "paymentScreenshot";

export type RegFiles = Partial<Record<RegFileKey, File>>;

export type RegData = {
  // account
  email: string;
  mobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  // old JSKO migration id (the JSKO username used at lookup)
  jskoId: string;
  // personal
  firstName: string;
  middleName: string;
  surname: string;
  dob: string;
  password: string;
  personalValid: boolean;
  // business
  shopName: string;
  addressType: "urban" | "rural";
  buildingShopNo: string;
  streetArea: string;
  wardNumber: string;
  landmark: string;
  villageName: string;
  gramPanchayat: string;
  hobliName: string;
  postOffice: string;
  postOfficeName: string;
  taluk: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  bank: BankDetailsValue;
  // kyc
  panNumber: string;
  aadhaarNumber: string;
  // video kyc
  declarationAgreed: boolean;
  termsAgreed: boolean;
  videoLat: number | null;
  videoLng: number | null;
  // payment
  payment: PaymentData;
};

const defaultData: RegData = {
  email: "",
  mobile: "",
  emailVerified: false,
  mobileVerified: false,
  jskoId: "",
  firstName: "",
  middleName: "",
  surname: "",
  dob: "",
  password: "",
  personalValid: false,
  shopName: "",
  addressType: "urban",
  buildingShopNo: "",
  streetArea: "",
  wardNumber: "",
  landmark: "",
  villageName: "",
  gramPanchayat: "",
  hobliName: "",
  postOffice: "",
  postOfficeName: "",
  taluk: "",
  city: "",
  district: "",
  state: "Karnataka",
  pincode: "",
  latitude: null,
  longitude: null,
  bank: emptyBankDetails,
  panNumber: "",
  aadhaarNumber: "",
  declarationAgreed: false,
  termsAgreed: false,
  videoLat: null,
  videoLng: null,
  payment: { utr: "" },
};

type Ctx = {
  data: RegData;
  files: RegFiles;
  set: (patch: Partial<RegData>) => void;
  setFile: (key: RegFileKey, file: File | undefined) => void;
  clearDraft: () => void;
};

const DRAFT_KEY = "bharatone_reg_draft_v1";

// Fields that are NEVER written to / restored from the saved draft — they must be
// entered manually for every registration and never carried over from a prior session.
const TRANSIENT_KEYS: (keyof RegData)[] = [
  "password", "panNumber", "aadhaarNumber",
  "firstName", "middleName", "surname", "dob", "personalValid",
  "shopName", "addressType", "buildingShopNo", "streetArea", "wardNumber", "landmark",
  "villageName", "gramPanchayat", "hobliName", "postOffice", "postOfficeName", "taluk",
  "city", "district", "state", "pincode", "latitude", "longitude", "bank",
];

const RegistrationContext = createContext<Ctx | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegData>(defaultData);
  const [files, setFiles] = useState<RegFiles>({});
  const loaded = useRef(false);

  // Retain in-progress data across Back / refresh within the same browser tab
  // (sessionStorage auto-clears when the tab closes, so it isn't carried across
  // sessions). This is client-side only — nothing reaches admin/QC/accountant until
  // the registration is submitted. clearDraft() wipes it on successful submit.
  useEffect(() => {
    try {
      localStorage.removeItem(DRAFT_KEY); // drop any legacy persistent draft
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // These fields always start blank for a new registration (entered manually,
        // never carried over from a prior session/draft).
        for (const k of TRANSIENT_KEYS) delete parsed[k];
        setData((d) => ({ ...d, ...parsed }));
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      // Business, address, bank, PAN and Aadhaar details are never persisted —
      // they must be entered fresh for every registration (blank by default) and
      // should not sit in browser storage. In-flow Back still keeps them via the
      // in-memory context; only a refresh / new session starts them blank.
      const rest = Object.fromEntries(Object.entries(data).filter(([k]) => !(TRANSIENT_KEYS as string[]).includes(k)));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch { /* ignore */ }
  }, [data]);

  const set = (patch: Partial<RegData>) => setData((d) => ({ ...d, ...patch }));
  const setFile = (key: RegFileKey, file: File | undefined) =>
    setFiles((s) => {
      const next = { ...s };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setData(defaultData);
    setFiles({});
  };
  return (
    <RegistrationContext.Provider value={{ data, files, set, setFile, clearDraft }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider");
  return ctx;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
