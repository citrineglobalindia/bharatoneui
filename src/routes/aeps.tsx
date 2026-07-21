import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark, Fingerprint, Loader2, RefreshCw, IndianRupee, ShieldCheck,
  AlertTriangle, CheckCircle2, Usb, Search, Receipt, Upload, Wallet, MapPin, Download,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { discoverDeviceVerbose, captureFingerprint, getLatLong, getLatLongStrict, readDeviceInfo, type RdDevice } from "@/lib/rdservice";
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
  const [authMode, setAuthMode] = useState<"finger" | "iris">("finger");
  const [showDrivers, setShowDrivers] = useState(false);
  const [walletSum, setWalletSum] = useState<{ earned: number; paid: number; pending: number; available: number } | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payAmt, setPayAmt] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  // Fallback when the daily 2FA endpoint keeps failing: re-run the full eKYC
  // (OTP + biometric), which Eko also accepts as that day's authentication.
  const [redoKyc, setRedoKyc] = useState(false);

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
  const [acDistrict, setAcDistrict] = useState("");
  const [acState, setAcState] = useState("");
  const [acPincode, setAcPincode] = useState("");
  const [acLine, setAcLine] = useState("");
  const [acGstin, setAcGstin] = useState("");
  const [acAccount, setAcAccount] = useState("");
  const [acIfsc, setAcIfsc] = useState("");
  const [acAadhaar, setAcAadhaar] = useState("");
  const [acShopType, setAcShopType] = useState("");
  const [acStateId, setAcStateId] = useState("");
  const [statesList, setStatesList] = useState<{ value: number; label: string; stateCode: string }[]>([]);
  const [mccList, setMccList] = useState<{ value: number; label: string }[]>([]);
  const [bankList, setBankList] = useState<{ value: string; label: string }[]>([]);
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
    // Status first (independent) so the setup/gate/wallet UI always renders even if the optional wallet calls fail.
    try {
      const st = await call("config").catch(() => null);
      setStatus(st);
    } catch { /* ignore */ }
    try {
      const tx = await (supabase as any).rpc("aeps_my_transactions", { _limit: 25 });
      setTxns((tx?.data as Txn[]) ?? []);
    } catch { /* ignore */ }
    try {
      const ws = await (supabase as any).rpc("aeps_wallet_summary");
      setWalletSum((ws?.data as any) ?? null);
    } catch { /* wallet optional */ }
    try {
      const po = await (supabase as any).from("aeps_payouts").select("*").order("requested_at", { ascending: false }).limit(10);
      setPayouts((po?.data as any[]) ?? []);
    } catch { /* payouts optional */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Eko lookup lists — state codes and shop-type (MCC) codes must come from the API, not be hard-coded.
  useEffect(() => {
    call("get_states").then((r) => setStatesList(r?.list ?? [])).catch(() => {});
    call("get_mcc").then((r) => setMccList(r?.list ?? [])).catch(() => {});
    call("get_banks").then((r) => setBankList(r?.list ?? [])).catch(() => {});
  }, [call]);
  // Auto-select the Eko state code from the typed state name.
  useEffect(() => {
    if (!acState.trim() || !statesList.length) return;
    const m = statesList.find((s) => s.label.toLowerCase() === acState.trim().toLowerCase());
    if (m) setAcStateId(String(m.value));
  }, [acState, statesList]);

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

  // purpose matters for UIDAI auth: the one-time eKYC capture must carry Eko's
  // eKYC wadh ("agent" — proven: eKYC succeeds with it), but customer
  // TRANSACTION captures are wadh-free, and DAILY KYC also authenticates
  // wadh-free — a wadh-stamped daily PID fails with "Invalid Biometric data"
  // even right after a successful eKYC (verified 21 Jul 2026, agent 38520007).
  const scan = async (purpose: "agent" | "customer" | "daily" = "agent") => {
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
    const r = await captureFingerprint(d, purpose === "customer" || purpose === "daily" ? { wadh: "" } : {});
    setScanning(false);
    if (!r.ok || !r.pidData) return toast.error("Capture failed", { description: r.error });
    setPid(r.pidData);
    setQuality(r.quality ?? null);
    toast.success(`Fingerprint captured (quality ${r.quality ?? "?"})`);
  };

  // Daily biometric authentication — NPCI requires this once per day, per agent.
  const dailyAuth = async () => {
    if (!pid) return toast.error("Scan your fingerprint first");
    let latlong: string;
    try { latlong = await getLatLongStrict(); } catch (e: any) { return toast.error("Location required", { description: e.message }); }
    setBusy(true);
    try {
      // Daily KYC uses a wadh-FREE capture (scan("daily")): with the eKYC wadh
      // stamped in, Fingpay rejects it as "Invalid Biometric data" even right
      // after a successful eKYC. Only the one-time eKYC capture carries wadh.
      const { data, error } = await supabase.functions.invoke("aeps-2fa", {
        body: { piddata: pid, latlong },
      });
      let res: any = data;
      if (error) { try { res = await (error as any)?.context?.json?.(); } catch { res = null; } }
      if (!res?.ok) {
        // 1714 "complete bank eKYC" — the agent's one-time eKYC needs to be (re)done.
        // Route them straight into the eKYC re-run flow instead of a dead-end error.
        if (res?.needs_ekyc) {
          setPid(null); setQuality(null);
          setOtpSent(false); setOtpVerified(false); setOtp("");
          setRedoKyc(true);
          toast.warning("Bank eKYC required first", {
            description: "Complete the one-time Biometric eKYC (Send OTP → Verify → scan finger), then run today's authentication again.",
            duration: 12000,
          });
          setTimeout(() => document.getElementById("aeps-ekyc")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
          return;
        }
        // Show the reference Eko asked for, and keep it on screen until dismissed
        // so it can be copied into a support email.
        const ref = res?.client_ref_id ?? "—";
        toast.error(`Authentication rejected — quote ref ${ref} to Eko`, {
          description: `${res?.error ?? "Daily authentication failed"}${res?.reason ? " — " + res.reason : ""}`,
          duration: Infinity,
          action: res?.for_eko
            ? { label: "Copy for Eko", onClick: () => { navigator.clipboard?.writeText(res.for_eko); toast.success("Copied"); } }
            : undefined,
        });
        throw new Error(String(res?.error ?? "Daily authentication failed"));
      }
      toast.success("Daily authentication complete", { description: `Ref ${res.client_ref_id}` });
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
    if (acLine.trim().length < 10) return toast.error("Enter the full shop address (building/shop no., street, area, city) — a short name is rejected by the bank");
    if (!acStateId) return toast.error("Select your state from the list");
    if (!acShopType) return toast.error("Select your shop / business type");
    if (!panPath || !frontPath || !backPath) return toast.error("Upload PAN, Aadhaar front and Aadhaar back (JPG/PDF, under 1 MB)");
    setBusy(true);
    let latlong = "";
    try { const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })); latlong = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`; } catch { /* optional */ }
    try {
      await call("activate", {
        modelname: acModel.trim(), devicenumber: acSerial.trim(),
        account: acAccount.trim(), ifsc: acIfsc.trim().toUpperCase(), aadhaar: acAadhaar,
        shop_type: acShopType.trim() || "4215", state_id: acStateId.trim(), latlong,
        address_line: acLine.trim(), city: acCity.trim(), district: acDistrict.trim() || acCity.trim(), state: acState.trim(), pincode: acPincode, gstin: acGstin.trim().toUpperCase(),
        pan_path: panPath, aadhaar_front_path: frontPath, aadhaar_back_path: backPath,
      });
      toast.success("Activation submitted", { description: "The bank will review and approve in 2–3 business days." });
      await load();
    } catch (e: any) { toast.error("Activation failed", { description: e.message }); }
    finally { setBusy(false); }
  };

  const doSendOtp = async () => {
    setBusy(true);
    // Eko's Send OTP spec requires the agent's live GPS coordinates.
    let latlong = "";
    try { latlong = await getLatLongStrict(); } catch (e: any) { setBusy(false); return toast.error("Location required", { description: e.message }); }
    try {
      const r = await call("kyc_send_otp", { latlong });
      setOtpSent(true); setOtpRef(r.otp_ref_id ?? null);
      setOtpVerified(false); setOtp(""); setPid(null); setQuality(null); // a fresh OTP must be re-verified before biometric
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
    if (!otpVerified) return toast.error("Verify the OTP first", { description: "Send OTP → enter it → Verify, then scan your finger." });
    if (!kycBank) return toast.error("Select your own bank first");
    if (!pid) return toast.error("Scan your fingerprint first");
    setBusy(true);
    let latlong: string;
    try { latlong = await getLatLongStrict(); } catch (e: any) { setBusy(false); return toast.error("Location required", { description: e.message }); }
    try {
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

    setResult(null);
    let latlong: string;
    try { latlong = await getLatLongStrict(); } catch (e: any) { return toast.error("Location required", { description: e.message }); }
    setBusy(true);
    try {
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
      const msg = String(e.message || "");
      if (/2\s*fa|before initiating|biometric authentication|authenticat/i.test(msg)) {
        toast.error("Daily authentication needed", { description: "Scan your own fingerprint to authenticate for today, then retry the transaction." });
      } else {
        toast.error("Transaction failed", { description: `${msg} — re-scan the customer's fingerprint before retrying.` });
      }
      load();
    } finally {
      setBusy(false);
      // A PID capture is single-use at NPCI: resubmitting one returns
      // "Duplicate Biometric data". Force a fresh scan after every attempt.
      setPid(null); setQuality(null);
    }
  };

  const requestPayout = async () => {
    const amt = Number(payAmt);
    if (!(amt > 0)) return toast.error("Enter a valid amount to withdraw");
    if (walletSum && amt > walletSum.available) return toast.error(`You can withdraw up to ${inr(walletSum.available)}`);
    setPayBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("request_aeps_payout", { p_amount: amt });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.message || "Request failed");
      toast.success("Withdrawal requested", { description: "Your request has been sent to the team for payout to your bank." });
      setPayAmt(""); setShowPayout(false); await load();
    } catch (e: any) { toast.error("Could not request withdrawal", { description: e.message }); }
    finally { setPayBusy(false); }
  };

  const recheck = async (t: Txn) => {
    if (!t.client_ref_id) return;
    try {
      const r = await call("inquire", { client_ref_id: t.client_ref_id });
      toast.success(`Status: ${r.status}`, { description: r.message });
      load();
    } catch (e: any) { toast.error("Could not check", { description: e.message }); }
  };

  // Prefer Eko's live bank list (correct bank_code values); fall back to the static list until it loads.
  const allBanks = useMemo(
    () => (bankList.length ? bankList.map((b) => ({ code: b.value, name: b.label })) : AEPS_BANKS),
    [bankList],
  );

  const banks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    const list = q ? allBanks.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : allBanks;
    return list.slice(0, 80);
  }, [bankQuery, allBanks]);

  const kycBanks = useMemo(() => {
    const q = kycBankQuery.trim().toLowerCase();
    const list = q ? allBanks.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : allBanks;
    return list.slice(0, 80);
  }, [kycBankQuery, allBanks]);

  const blocked = status && !status.can_transact;
  // Daily agent authentication is the ONLY thing left (setup otherwise complete) — show the mandatory gate.
  const dailyPending = !!(status && status.onboarded && status.service_activated && status.ekyc_done && !status.daily_kyc_done);

  // AEPS wallet / earnings summary, derived from this agent's transactions.
  const wallet = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let earned = 0, settled = 0, wdVolume = 0, todayCount = 0, txnCount = 0;
    for (const t of txns) {
      if (t.status !== "success") continue;
      txnCount++;
      earned += Number(t.commission || 0);
      if (t.commission_settled) settled += Number(t.commission || 0);
      if (t.operation === "cash_withdrawal" || t.operation === "aadhaar_pay") wdVolume += Number(t.amount || 0);
      if ((t.created_at || "").slice(0, 10) === today) todayCount++;
    }
    return { earned, settled, pending: earned - settled, wdVolume, todayCount, txnCount };
  }, [txns]);

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

        {/* Mandatory daily Agent Authentication gate — blocks all services until today's fingerprint auth is done. */}
        {status?.keys_set && dailyPending && (
          <div className="overflow-hidden rounded-2xl border-2 border-india-green/40 bg-card shadow-soft">
            <div className="flex items-center gap-2 bg-india-green/10 px-5 py-3">
              <ShieldCheck className="h-5 w-5 text-india-green" />
              <div className="flex-1">
                <p className="text-sm font-bold text-india-green">Agent Authentication required</p>
                <p className="text-[11px] text-muted-foreground">NPCI rule: authenticate with your own fingerprint once today before you can serve customers.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full ${pid ? "bg-emerald-100" : "bg-muted"}`}>
                {pid ? <CheckCircle2 className="h-9 w-9 text-emerald-600" /> : <Fingerprint className="h-9 w-9 text-muted-foreground" />}
              </div>
              <div className="inline-flex rounded-lg border border-border p-0.5">
                <button onClick={() => setAuthMode("finger")} className={`rounded-md px-4 h-8 text-xs font-semibold ${authMode === "finger" ? "bg-india-green text-white" : "text-muted-foreground"}`}>Finger</button>
                <button onClick={() => setAuthMode("iris")} className={`rounded-md px-4 h-8 text-xs font-semibold ${authMode === "iris" ? "bg-india-green text-white" : "text-muted-foreground"}`}>Iris</button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => scan("daily")} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 h-10 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />} {pid ? "Re-scan finger" : "Scan my finger"}
                </button>
                
                <button onClick={dailyAuth} disabled={!pid || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-5 h-10 text-sm font-bold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Agent Authentication
                </button>
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> Your shop location is captured for every authentication (NPCI requirement).</p>
              {status.last_error && <p className="text-xs text-rose-600">Banking partner said: {status.last_error}</p>}
            </div>
          </div>
        )}

        {status?.keys_set && ((blocked && !dailyPending) || redoKyc) && (
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
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Step 1 — Register yourself as an AEPS agent</p>
                <p className="mb-2 text-[11px] text-amber-600">Put your <b>given name</b> in First name and only your <b>surname</b> in Surname (e.g. name "RAMYA H R" → First name: <b>RAMYA</b>, Surname: <b>R</b>). PAN and date of birth must match your PAN card. Do not add middle initials in the surname field.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={obFirst} onChange={(e) => setObFirst(e.target.value)} placeholder="First name (given name) *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={obLast} onChange={(e) => setObLast(e.target.value)} placeholder="Surname / last name *" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
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
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Shop / office address *</span>
                    <input value={acLine} onChange={(e) => setAcLine(e.target.value)} placeholder="e.g. 001, 10th B Cross, KR Puram, Hassan" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                    <span className="mt-0.5 block text-[10px] text-amber-600">Enter the full address — building/shop no., street, area and city. A short name like "KR Puram" alone is rejected by the bank.</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">City</span><input value={acCity} onChange={(e) => setAcCity(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">District</span><input value={acDistrict} onChange={(e) => setAcDistrict(e.target.value)} placeholder="e.g. Hassan" className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">State</span><input value={acState} onChange={(e) => setAcState(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                    <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Pincode *</span><input value={acPincode} onChange={(e) => setAcPincode(e.target.value.replace(/\D/g, ""))} maxLength={6} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  </div>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">State (Eko)</span>
                    <select value={acStateId} onChange={(e) => setAcStateId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
                      <option value="">Select state</option>
                      {statesList.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select></label>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Shop / business type</span>
                    <select value={acShopType} onChange={(e) => setAcShopType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
                      <option value="">Select shop type</option>
                      {mccList.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select></label>
                  <label><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">GSTIN (optional)</span><input value={acGstin} onChange={(e) => setAcGstin(e.target.value.toUpperCase())} maxLength={15} placeholder="15-digit GSTIN, if any" className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
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
            {status.onboarded && status.service_activated && (!status.ekyc_done || redoKyc) && (
              <div id="aeps-ekyc" className="mt-4 rounded-xl bg-muted/40 p-4">
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
                      <button onClick={() => scan("agent")} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
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
                <button onClick={() => scan("daily")} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
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

        {/* AEPS Wallet / earnings + payout to bank */}
        {status?.onboarded && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold"><Wallet className="h-4 w-4 text-india-green" /> AEPS Commission Wallet</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${status.daily_kyc_done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {status.daily_kyc_done ? "Active today" : "Auth pending"}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-xl bg-india-green/10 p-4">
                <p className="text-[11px] font-semibold text-india-green">Available to withdraw</p>
                <p className="mt-0.5 text-2xl font-extrabold text-india-green">{inr(walletSum?.available ?? 0)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Earned {inr(walletSum?.earned ?? 0)} · Paid {inr(walletSum?.paid ?? 0)} · In process {inr(walletSum?.pending ?? 0)}</p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-[11px] font-semibold text-muted-foreground">Withdrawal volume</p><p className="mt-0.5 text-base font-extrabold">{inr(wallet.wdVolume)}</p></div>
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-[11px] font-semibold text-muted-foreground">Transactions</p><p className="mt-0.5 text-base font-extrabold">{wallet.txnCount} <span className="text-[11px] font-medium text-muted-foreground">({wallet.todayCount} today)</span></p></div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => setShowPayout((v) => !v)} disabled={!(walletSum && walletSum.available > 0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-xs font-bold text-white disabled:opacity-50">
                <Landmark className="h-3.5 w-3.5" /> Withdraw to bank
              </button>
              <span className="text-[11px] text-muted-foreground">Transfers to your settlement account after team approval.</span>
            </div>

            {showPayout && (
              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-3">
                <label className="flex-1 min-w-[160px]"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Amount to withdraw (₹)</span>
                  <input inputMode="numeric" value={payAmt} onChange={(e) => setPayAmt(e.target.value.replace(/\D/g, ""))} placeholder={`Max ${inr(walletSum?.available ?? 0)}`} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </label>
                <button onClick={() => setPayAmt(String(walletSum?.available ?? 0))} className="rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">Max</button>
                <button onClick={requestPayout} disabled={payBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-xs font-bold text-white disabled:opacity-50">
                  {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Request payout
                </button>
              </div>
            )}

            {payouts.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Recent withdrawals</p>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span>{new Date(p.requested_at).toLocaleDateString("en-IN")} · {inr(Number(p.amount))}{p.utr ? ` · UTR ${p.utr}` : ""}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.status === "requested" ? "In process" : p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">Commission from every successful AEPS transaction is credited here. Withdrawals are paid to your registered settlement bank account.</p>
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
            <button onClick={() => setShowDrivers((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> Drivers
            </button>
            <button onClick={connect} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50">
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Detect device
            </button>
          </div>

          {showDrivers && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-2 font-semibold">Fingerprint device drivers (RD Service) — install for your scanner:</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {[
                  { n: "Mantra RD Service (MFS100 / L1)", u: "https://download.mantratec.com/" },
                  { n: "Morpho / IDEMIA RD Service (MSO 1300)", u: "https://www.idemia.com/rd-service" },
                  { n: "Startek RD Service (FM220)", u: "https://startek.co.in/rd-services/" },
                  { n: "Precision / Evolute / Secugen RD Service", u: "https://www.uidai.gov.in/en/ecosystem/authentication-devices-documents/rd-services.html" },
                ].map((d) => (
                  <a key={d.n} href={d.u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 font-semibold hover:bg-muted">
                    <Download className="h-3.5 w-3.5 text-india-green" /> {d.n}
                  </a>
                ))}
              </div>
              <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-muted-foreground">
                <li>Install the <b>Windows-certified RD Service</b> and <b>Windows Support Tools</b> for your L1 device.</li>
                <li>Plug in the scanner and make sure the RD Service is <b>running</b> with a valid (unexpired) licence.</li>
                <li>Use <b>Chrome or Edge</b>, then click <b>Detect device</b> above.</li>
              </ol>
            </div>
          )}

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
            <button type="button" onClick={() => scan("customer")} disabled={scanning}
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
