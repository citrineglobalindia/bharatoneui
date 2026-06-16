import { createContext, useContext, useState, type ReactNode } from "react";
import { emptyBankDetails, type BankDetailsValue } from "./bank-details";
import type { PaymentData } from "./steps/payment";

export type RegFileKey =
  | "pan"
  | "aadhaar"
  | "shopPhoto"
  | "police"
  | "video"
  | "selfie"
  | "paymentScreenshot";

export type RegFiles = Partial<Record<RegFileKey, File>>;

export type RegData = {
  // account
  email: string;
  mobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  // personal
  firstName: string;
  middleName: string;
  surname: string;
  password: string;
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
  firstName: "",
  middleName: "",
  surname: "",
  password: "",
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
  videoLat: null,
  videoLng: null,
  payment: { utr: "" },
};

type Ctx = {
  data: RegData;
  files: RegFiles;
  set: (patch: Partial<RegData>) => void;
  setFile: (key: RegFileKey, file: File | undefined) => void;
};

const RegistrationContext = createContext<Ctx | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegData>(defaultData);
  const [files, setFiles] = useState<RegFiles>({});
  const set = (patch: Partial<RegData>) => setData((d) => ({ ...d, ...patch }));
  const setFile = (key: RegFileKey, file: File | undefined) =>
    setFiles((s) => {
      const next = { ...s };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  return (
    <RegistrationContext.Provider value={{ data, files, set, setFile }}>
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
