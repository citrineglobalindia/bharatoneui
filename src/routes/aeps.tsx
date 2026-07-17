import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark, Fingerprint, Loader2, RefreshCw, IndianRupee, ShieldCheck,
  AlertTriangle, CheckCircle2, Usb, Search, Receipt, Upload,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { discoverDeviceVerbose, captureFingerprint, getLatLong, readDeviceInfo, type RdDevice } from "@/lib/rdservice";
import { AEPS_BANKS } from "@/lib/aeps-banks";

export const Route = createFileRoute("/aeps")({
  head: () => ({ meta: [{ title: "AEPS Banking — BharatOne" }] }),
  component: AepsPage,
});

type Txn = {
  id: string; operation: string; amount: number; status: string;
  aadhaar_last4: string | null; rrn: string | null; message: string | null;
  balance: number | null; client_ref_id: string | null;
  commission: number; commission_settled: boolean; created_at: string;
};
type Status = {
  env: string; keys_set: boolean; user_code: string | null;
  onboarded: boolean; service_activated: boolean; ekyc_done: boolean;
  daily_kyc_done: boolean; can_transact: boolean; last_error: string | null;
};

const OPS = [
  { key: "cash_withdrawal", label: "Cash Withdrawal", needsAmount: true },
  { key: "balance_enquiry", label: "Balance Enquiry", needsAmount: false },
  { key: "mini_statement", label: "Mini Statement", needsAmount: false },
  { key: "aadhaar_pay", label: "Aadhaar Pay", needsAmount: true },
] as const;

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const tone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-amber-100 text-amber-800",
};

function AepsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  // device
  const [device, setDevice] = useState<RdDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);

  // form
  const [op, setOp] = useState<string>("cash_withdrawal");
  const [aadhaar, setAadhaar] = useState("");
  const [mobile, setMobile] = useState("");
  const [bank, setBank] = useState("");
  const [bankQuery, setBankQuery] = useState("");
  const [kycBank, setKycBank] = useState("");
  const [kycBankQuery, setKycBankQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // AEPS onboarding / eKYC wizard
  const [setupOpen, setSetupOpen] = useState(false);
  const [obFirst, setObFirst] = useState("");
  const [obLast, setObLast] = useState("");
  const [obMobile, setObMobile] = useState("");
  const [obPan, setObPan] = useState("");
  const [obDob, setObDob] = useState("");
  const [obPincode, setObPincode] = useState("");
  const [obCity, setObCity] = useState("");
  const [obState, setObState] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRef, setOtpRef] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  // Activation step
  const [acModel, setAcModel] = useState("");
  const [acSerial, setAcSerial] = useState("");
  const [acCity, setAcCity] = useState("");
  const [acState, setAcState] = useState("");
  const [acPincode, setAcPincode] = useState("");
  const [acLine, setAcLine] = useState("");
  const [acAccount, setAcAccount] = useState("");
  const [acIfsc, setAcIfsc] = useState("");
  const [acAadhaar, setAcAadhaar] = useState("");
  const [acShopType, setAcShopType] = useState("");
  const [acStateId, setAcStateId] = useState("");
  const [panPath, setPanPath] = useState("");
  const [frontPath, setFrontPath] = useState("");
  const [backPath, setBackPath] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const needsAmount = OPS.find((o) => o.key === op)?.needsAmount ?? false;

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("aeps", { body: { action, ...extra } });
    if (error) {
      let msg = "Request failed";
      try {
        const ctx = (error as { context?: Response }).context;
        const b = ctx ? await ctx.json() : null;
        if (b?.error) msg = String(b.message ?? b.error);
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error(String((data as any).message ?? (data as any).error));
    return data as any;
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [st, tx] = await Promise.all([
        call("config").catch(() => null),
        (supabase as any).rpc("aeps_my_transactions", { _limit: 25 }),
      ]);
      setStatus(st);
      setTxns((tx.data as Txn[]) ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setScanning(true);
    setDeviceHint(null);
    const r = await discoverDeviceVerbose();
    setScanning(false);
    if (!r.device) {
      setDeviceHint(r.hint);
      return toast.error("No fingerprint scanner found", { description: r.hint });
    }
    setDevice(r.device);
    toast.success("Scanner connected", { description: r.device.info || `Port ${r.device.port}` });
  };

  const scan = async () => {
    let d = device;
    if (!d) {
      setScanning(true);
      const r = await discoverDeviceVerbose();
      setScanning(false);
      if (!r.device) {
        setDeviceHint(r.hint);
        return toast.error("No fingerprint scanner found", { description: r.hint });
      }
      d = r.device;
      setDevice(d);
    }
    setScanning(true);
    setPid(null); setQuality(null);
    const r = await captureFingerprint(d);
    setScanning(false);
    if (!r.ok || !r.pidData) return toast.error("Capture failed", { description: r.error });
    setPid(r.pidData);
    setQuality(r.quality ?? null);
    toast.success(`Fingerprint captured (quality ${r.quality ?? "?"})`);
  };

  // Daily biometric authentication — NPCI requires this once per day, per agent.
  const dailyAuth = async () => {
    if (!pid) return toast.error("Scan the retailer's fingerprint first");
    setBusy(true);
    try {
      const latlong = await getLatLong();
      await call("kyc_daily", { piddata: pid, latlong });
      toast.success("Daily authentication complete");
      setPid(null); setQuality(null);
      load();
    } catch (e: any) {
      toast.error("Authentication failed", { description: e.message });
    } finally { setBusy(false); }
  };

  // --- AEPS setup wizard steps ---
  const doOnboard = async () => {
    if (!obFirst.trim()) return toast.error("Enter your first name");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(obPan.trim())) return toast.error("Enter a valid PAN (e.g. ABCDE1234F)");
    if (!/^\d{10}$/.test(obMobile)) return toast.error("Enter your 10-digit mobile number");
    if (!obDob) return toast.error("Select your date of birth");
    if (!/^\d{6}$/.test(obPincode)) return toast.error("Enter your 6-digit shop pincode");
    if (!obCity.trim()) return toast.error("Enter your city");
    if (!obState.trim()) return toast.error("Enter your state");
    setBusy(true);
    try {
      await call("onboard", { first_name: obFirst.trim(), last_name: obLast.trim(), mobile: obMobile, pan: obPan.trim().toUpperCase(), dob: obDob, pincode: obPincode, city: obCity.trim(), state: obState.trim() });
      toast.success("Registered with the banking partner");
      await load();
    } catch (e: any) { toast.error("Registration failed", { description: e.message }); }
    finally { setBusy(false); }
  };

  // Detect the biometric device's model + serial from a single capture.
  const detectDevice = async () => {
    let d = device;
    if (!d) {
      setScanning(true);
      const r = await discoverDeviceVerbose();
      setScanning(false);
      if (!r.device) return toast.error("No scanner found", { description: r.hint });
      d = r.device; setDevice(d);
    }
    setScanning(true);
    const r = await captureFingerprint(d);
    setScanning(false);
    if (!r.ok || !r.pidData) return toast.error("Capture failed", { description: r.error });
    const info = readDeviceInfo(r.pidData);
    if (info.model) setAcModel(info.model);
    if (info.serial) setAcSerial(info.serial);
    toast.success("Device details read", { description: `${info.model || "?"} · ${info.serial || "?"}` });
  };

  const uploadDoc = async (which: "pan" | "front" | "back", file: File) => {
    // Eko: JPG/JPEG/PDF only, under 1 MB, no PNG.
    const okType = /\.(jpe?g|pdf)$/i.test(file.name) && file.type !== "image/png";
    if (!okType) return toast.error("Use a JPG or PDF file (not PNG)");
    if (file.size > 1024 * 1024) return toast.error("File must be under 1 MB");
    setUploading(which);
    try {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      const ext = file.name.split(".").pop();
      const path = `${uid}/${which}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("aeps-activation").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      if (which === "pan") setPanPath(path);
      else if (which === "front") setFrontPath(path);
      else setBackPath(path);
      toast.success(`${which === "pan" ? "PAN" : which === "front" ? "Aadhaar front" : "Aadhaar back"} uploaded`);
    } catch (e: any) {
      toast.error("Upload failed", { description: e.message });
    } finally { setUploading(null); }
  };

  const doActivate = async () => {
    if (!acModel.trim() || !acSerial.trim()) return toast.error("Select the device brand and enter the serial number");
    if (!acAccount.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(acIfsc.trim())) return toast.error("Enter the settlement account number and a valid IFSC");
    if (!/^\d{12}$/.test(acAadhaar)) return toast.error("Enter your 12-digit Aadhaar number");
    if (!/^\d{6}$/.test(acPincode)) return toast.error("Enter the 6-digit office pincode");
    if (!panPath || !frontPath || !backPath) return toast.error("Upload PAN, Aadhaar front and Aadhaar back (JPG/PDF, under 1 MB)");
    setBusy(true);
    let latlong = "";
    try { const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })); latlong = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`; } catch { /* optional */ }
    try {
      await call("activate", {
        modelname: acModel.trim(), devicenumber: acSerial.trim(),
        account: acAccount.trim(), ifsc: acIfsc.trim().toUpperCase(), aadhaar: acAadhaar,
        shop_type: acShopType.trim() || "4215", state_id: acStateId.trim(), latlong,
        address_line: acLine.trim(), city: acCity.trim(), state: acState.trim(), pincode: acPincode,
        pan_path: panPath, aadhaar_front_path: frontPath, aadhaar_back_path: backPath,
      });
      toast.success("Activation submitted", { description: "The bank will review and approve in 2–3 business days." });
      await load();
    } catch (e: any) { toast.error("Activation failed", { description: e.message }); }
    finally { setBusy(false); }
  };

  const doSendOtp = async () => {
    setBusy(true);
    try {
      const r = await call("kyc_send_otp");
      setOtpSent(true); setOtpRef(r.otp_ref_id ?? null);
      toast.success("OTP sent to your registered mobile");
    } catch (e: any) { toast.error("Could not send OTP", { description: e.message }); }
    finally { setBusy(false); }
  };

  const doVerifyOtp = async () => {
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the OTP");
    setBusy(true);
    try {
      await call("kyc_verify_otp", { otp, otp_ref_id: otpRef });
      setOtpVerified(true);
      toast.success("OTP verified — now scan your fingerprint");
    } catch (e: any) { toast.error("OTP verification failed", { description: e.message }); }
    finally { setBusy(false); }
  };

  const doBiometricKyc = async () => {
    if (!kycBank) return toast.error("Select your own bank first");
    if (!pid) return toast.error("Scan your fingerprint first");
    setBusy(true);
    try {
      const latlong = await getLatLong();
      await call("kyc_biometric", { piddata: pid, bank_code: kycBank, latlong });
      toast.success("Biometric eKYC complete");
      setPid(null); setQuality(null); setOtpSent(false); setOtpVerified(false); setOtp("");
      await load();
    } catch (e: any) { toast.error("Biometric eKYC failed", { description: e.message }); }
    finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(aadhaar)) return toast.error("Enter the customer's 12-digit Aadhaar number");
    if (!/^\d{10}$/.test(mobile)) return toast.error("Enter the customer's 10-digit mobile number");
    if (!bank) return toast.error("Select the customer's bank");
    if (needsAmount && !(Number(amount) > 0)) return toast.error("Enter a valid amount");
    if (!pid) return toast.error("Capture the customer's fingerprint");

    setBusy(true); setResult(null);
    try {
      const latlong = await getLatLong();
      const r = await call("transact", {
        operation: op,
        aadhaar,
        customer_mobile: mobile,
        bank_code: bank,
        amount: needsAmount ? Number(amount) : 0,
        piddata: pid,
        latlong,
        notify_customer: true,
      });
      setResult(r);
      toast.success(r.message || "Transaction successful");
      setAmount(""); setPid(null); setQuality(null);
      load();
    } catch (e: any) {
      if (String(e.message).includes("biometric authentication")) {
        toast.error("Daily authentication needed", { description: "Scan your own fingerprint and press “Daily authentication”." });
      } else {
        toast.error("Transaction failed", { description: e.message });
      }
      load();
    } finally { setBusy(false); }
  };

  const recheck = async (t: Txn) => {
    if (!t.client_ref_id) return;
    try {
      const r = await call("inquire", { client_ref_id: t.client_ref_id });
      toast.success(`Status: ${r.status}`, { description: r.message });
      load();
    } catch (e: any) { toast.error("Could not check", { description: e.message }); }
  };

  const banks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    const list = q ? AEPS_BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : AEPS_BANKS;
    return list.slice(0, 80);
  }, [bankQuery]);

  const kycBanks = useMemo(() => {
    const q = kycBankQuery.trim().toLowerCase();
    const list = q ? AEPS_BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : AEPS_BANKS;
    return list.slice(0, 80);
  }, [kycBankQuery]);

  const blocked = status && !status.can_transact;

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Landmark className="h-5 w-5" />}
          title="AEPS Banking"
          subtitle="Aadhaar-enabled cash withdrawal, balance enquiry, mini statement and Aadhaar Pay"
          actions={
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-10 text-sm font-semibold hover:bg-muted">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          }
        />

        {/* Readiness */}
        {status && !status.keys_set && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>AEPS is not configured yet. An administrator must set the Eko API keys before transactions can be made.</span>
          </div>
        )}

        {status?.keys_set && blocked && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-india-green" /> One-time AEPS setup</p>
            <div className="space-y-2 text-sm">
              <Step done={status.onboarded} label="Register with the banking partner" />
              <Step done={status.service_activated} label="Activate the AEPS service" />
              <Step done={status.ekyc_done} label="One-time biometric eKYC (OTP + fingerprint)" />
              <Step done={status.daily_kyc_done} label="Today's biometric authentication" />
            </div>

            {/* Step 1 — onboard */}
            {!status.onboarded && (
              <div className="mt-4 rounded-xl bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Step 1 — Register yourself as an AEPS agent</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={obFirst} onChange={(e) => setObFirst(e.target.value)} placeholder="First name *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obLast} onChange={(e) => setObLast(e.target.value)} placeholder="Last name" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obMobile} onChange={(e) => setObMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="Mobile number *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obPan} onChange={(e) => setObPan(e.target.value.toUpperCase())} maxLength={10} placeholder="PAN *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">Date of birth *
                    <input type="date" value={obDob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setObDob(e.target.value)} className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
                  </label>
                  <input value={obPincode} onChange={(e) => setObPincode(e.target.value.replace(/\D/g, ""))} maxLength={6} placeholder="Shop pincode *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obCity} onChange={(e) => setObCity(e.target.value)} placeholder="City *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obState} onChange={(e) => setObState(e.target.value)} placeholder="State *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <button onClick={doOnboard} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-xs font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Register for AEPS
                </button>
              </div>
            )}

            {/* Step 2 — activate (device details + KYC document uploads) */}
            {status.onboarded && !status.service_activated && (
              <div className="mt-4 rounded-xl bg-muted/40 p-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Step 2 — Activate the AEPS service</p>
                <p className="mb-3 text-[11px] text-muted-foreground">The bank verifies these documents and approves within 2–3 business days before you can transact.</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
                    <label className="flex-1"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Biometric device brand *</span>
                      <select value={acModel} onChange={(e) => setAcModel(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="">— select —</option>
                        <option value="Mantra">Mantra</option>
                        <option value="Morpho">Morpho</option>
                        <option value="Startek">Startek</option>
                        <option value="Evolute">Evolute</option>
                        <option value="Precision">Precision</option>
                        <option value="Secugen">Secugen</option>
                      </select></label>
                    <label className="flex-1"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Device serial number *</span>
                      <input value={acSerial} onChange={(e) => setAcSerial(e.target.value)} placeholder="Device serial" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                    <button onClick={detectDevice} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                      {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Usb className="h-3.5 w-3.5" />} Detect from scanner
                    </button>
                  </div>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Shop / office address</span>
                    <input value={acLine} onChange={(e) => setAcLine(e.target.value)} placeholder="Address line" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                  <div className="grid grid-cols-3 gap-2">
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">City</span><input value={acCity} onChange={(e) => setAcCity(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">State</span><input value={acState} onChange={(e) => setAcState(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Pincode *</span><input value={acPincode} onChange={(e) => setAcPincode(e.target.value.replace(/\D/g, ""))} maxLength={6} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  </div>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">State code (Eko)</span><input value={acStateId} onChange={(e) => setAcStateId(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 23" className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Shop type code</span><input value={acShopType} onChange={(e) => setAcShopType(e.target.value)} placeholder="e.g. 4215" className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Your (agent) Aadhaar number *</span><input value={acAadhaar} onChange={(e) => setAcAadhaar(e.target.value.replace(/\D/g, ""))} maxLength={12} placeholder="12-digit Aadhaar" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Settlement account number *</span><input value={acAccount} onChange={(e) => setAcAccount(e.target.value.replace(/\D/g, ""))} placeholder="Bank account no." className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Settlement IFSC *</span><input value={acIfsc} onChange={(e) => setAcIfsc(e.target.value.toUpperCase())} maxLength={11} placeholder="e.g. SBIN0001234" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                </div>

                <p className="mb-2 mt-3 text-[11px] font-semibold text-muted-foreground">Documents — JPG or PDF, under 1 MB each (PNG not accepted)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([["pan", "PAN card", panPath], ["front", "Aadhaar front", frontPath], ["back", "Aadhaar back", backPath]] as const).map(([k, label, path]) => (
                    <label key={k} className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border bg-card px-3 py-3 text-center text-xs hover:bg-muted">
                      {uploading === k ? <Loader2 className="h-4 w-4 animate-spin" /> : path ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                      <span className={path ? "font-semibold text-emerald-700" : "font-medium"}>{path ? `${label} ✓` : label}</span>
                      <input type="file" accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDoc(k, e.target.files[0])} />
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button onClick={doActivate} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-xs font-semibold text-white disabled:opacity-50">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Submit for activation
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — one-time eKYC (OTP then fingerprint) */}
            {status.onboarded && status.service_activated && !status.ekyc_done && (
              <div className="mt-4 rounded-xl bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Step 3 — One-time biometric eKYC</p>
                {!otpVerified ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={doSendOtp} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                      {busy && !otpSent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {otpSent ? "Resend OTP" : "Send OTP to my mobile"}
                    </button>
                    {otpSent && (
                      <>
                        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="Enter OTP" className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm" />
                        <button onClick={doVerifyOtp} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white disabled:opacity-50">
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify OTP
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">OTP verified. Select the bank linked to your Aadhaar, then place your finger on the scanner and capture.</p>
                    <div className="relative max-w-sm">
                      <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                      <input value={kycBankQuery} onChange={(e) => setKycBankQuery(e.target.value)}
                        placeholder="Search your bank…" className="mb-1 h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
                    </div>
                    <select value={kycBank} onChange={(e) => setKycBank(e.target.value)}
                      className="h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm outline-none">
                      <option value="">Select your bank</option>
                      {kycBanks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={scan} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                        {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />} {pid ? "Re-scan" : "Scan my finger"}
                      </button>
                      <button onClick={doBiometricKyc} disabled={!pid || !kycBank || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white disabled:opacity-50">
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Complete eKYC
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — daily auth */}
            {status.onboarded && status.service_activated && status.ekyc_done && !status.daily_kyc_done && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground flex-1">
                  Step 4 — NPCI requires you to authenticate with your own fingerprint once each day before serving customers.
                </p>
                <button onClick={scan} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />} Scan my finger
                </button>
                <button onClick={dailyAuth} disabled={!pid || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Daily authentication
                </button>
              </div>
            )}

            {status.last_error && <p className="mt-3 text-xs text-rose-600">Banking partner said: {status.last_error}</p>}
          </div>
        )}

        {/* Scanner */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <Usb className={`h-5 w-5 ${device ? "text-emerald-600" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-semibold">{device ? "Scanner connected" : "Fingerprint scanner"}</p>
              <p className="text-xs text-muted-foreground">{device ? (device.info || `127.0.0.1:${device.port}`) : "Mantra, Morpho, Startek and other UIDAI-registered devices"}</p>
            </div>
            {pid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Captured{quality != null ? ` · quality ${quality}` : ""}
              </span>
            )}
            <button onClick={connect} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Detect device
            </button>
          </div>

          {!device && deviceHint && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <p className="flex items-start gap-1.5 font-semibold"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {deviceHint}</p>
              <p className="mt-2 font-semibold">To use AEPS you need:</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>A UIDAI-registered fingerprint scanner (Mantra MFS100, Morpho MSO 1300, Startek FM220 or similar), plugged in.</li>
                <li>That device's <b>RD service</b> installed and running, with a valid (unexpired) RD licence.</li>
                <li>Google Chrome or Microsoft Edge — other browsers block the connection to the scanner.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Transaction */}
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {OPS.map((o) => (
              <button key={o.key} type="button" onClick={() => { setOp(o.key); setResult(null); }}
                className={`rounded-full px-3 h-9 text-xs font-semibold transition ${op === o.key ? "bg-india-green text-white" : "border border-border bg-card hover:bg-muted"}`}>
                {o.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer Aadhaar number *">
              <input inputMode="numeric" maxLength={12} value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhaar" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Customer mobile number *">
              <input inputMode="numeric" maxLength={10} value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Customer's bank *">
              <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <input value={bankQuery} onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Search bank…" className="mb-1 h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
              </div>
              <select value={bank} onChange={(e) => setBank(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none">
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </Field>
            {needsAmount && (
              <Field label="Amount (₹) *">
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="500" className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none" />
                </div>
              </Field>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={scan} disabled={scanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 h-10 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {pid ? "Re-scan customer's finger" : "Scan customer's finger"}
            </button>
            <button type="submit" disabled={busy || !pid || !!blocked}
              className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-gradient px-5 h-10 text-sm font-bold text-white shadow-elev disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />} Proceed
            </button>
          </div>
          <p className="mt-2 text-right text-[11px] text-muted-foreground">
            The fingerprint is encrypted by the scanner itself and is never stored by BharatOne.
          </p>
        </form>

        {/* Result */}
        {result?.ok && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Receipt className="h-4 w-4" /> {result.message || "Transaction successful"}</p>
            <div className="mt-2 grid gap-1 text-sm text-emerald-900 sm:grid-cols-2">
              {result.balance != null && <p>Account balance: <b>{inr(Number(result.balance))}</b></p>}
              {result.amount > 0 && <p>Amount: <b>{inr(result.amount)}</b></p>}
              {result.rrn && <p>RRN: <b>{result.rrn}</b></p>}
              {result.client_ref_id && <p>Reference: <b>{result.client_ref_id}</b></p>}
            </div>
            {Array.isArray(result.statement) && result.statement.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg bg-white p-2">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground"><tr><th className="p-1">Date</th><th className="p-1">Narration</th><th className="p-1 text-right">Amount</th></tr></thead>
                  <tbody>
                    {result.statement.map((s: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1 whitespace-nowrap">{s.date ?? s.txn_date ?? "—"}</td>
                        <td className="p-1">{s.narration ?? s.description ?? "—"}</td>
                        <td className="p-1 text-right font-semibold">{s.amount ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Operation</th>
                <th className="px-3 py-2">Aadhaar</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">RRN</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No AEPS transactions yet.</td></tr>
              ) : txns.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 capitalize">{t.operation.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.aadhaar_last4 ? `XXXX XXXX ${t.aadhaar_last4}` : "—"}</td>
                  <td className="px-3 py-2 font-semibold">{t.amount > 0 ? inr(t.amount) : t.balance != null ? inr(t.balance) : "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.rrn ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${tone[t.status] ?? "bg-muted"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    {t.status === "pending_reconciliation" && (
                      <button onClick={() => recheck(t)} className="ml-2 text-[11px] font-semibold text-india-green underline">Check</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.commission > 0 ? <span className={t.commission_settled ? "font-semibold text-emerald-600" : "text-muted-foreground"}>{inr(t.commission)}</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />}
      <span className={done ? "text-muted-foreground line-through" : "font-medium"}>{label}</span>
    </div>
  );
}
