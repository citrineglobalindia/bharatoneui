import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  Copy,
  Check,
  Upload,
  Smartphone,
  Sparkles,
  Landmark,
  Building2,
  Hash,
  User,
  Calendar,
  FileImage,
  X,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { Field, SectionCard, StepHeader, Notice, inputCls } from "../field";
import { Button } from "@/components/ui/button";
import { useRegistration } from "../registration-context";

export type PaymentData = {
  utr: string;
  screenshotName?: string;
  method?: "upi" | "imps" | "neft" | "rtgs" | "bank_transfer";
  paidOn?: string;
  payerName?: string;
  payerBank?: string;
  payerAccount?: string;
  remarks?: string;
};

const UPI_ID = "MSBHARATONESERVICESANDAFFILIATESPRIVATELIMITED.eazypay@icici";
const PAYEE = "Bharatone Services And Affiliates Private Limited";

function formatINR(n: number) {
  return n.toLocaleString("en-IN");
}
const BANK = {
  account: "847705000009",
  ifsc: "ICIC0008477",
  bank: "ICICI Bank",
  branch: "Bengaluru Main Branch",
  type: "Current Account",
};

export function PaymentStep({
  value,
  onChange,
  planLabel = "New Retailer Registration",
  amount = 4999,
}: {
  value: PaymentData;
  onChange: (v: PaymentData) => void;
  planLabel?: string;
  amount?: number;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setFile } = useRegistration();

  const amountStr = String(amount);
  const amountDisplay = `₹${formatINR(amount)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${amountStr}&cu=INR&tn=KYC%20Verification`
  )}`;
  const upiDeepLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${amountStr}&cu=INR&tn=KYC%20Verification`;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setFileSize(f.size);
    setFile("paymentScreenshot", f);
    onChange({ ...value, screenshotName: f.name });
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileSize(null);
    setFile("paymentScreenshot", undefined);
    onChange({ ...value, screenshotName: undefined });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<CreditCard className="h-5 w-5" />}
        title="KYC Verification Charges"
        description={`Complete the payment for ${planLabel} before final form submission.`}
      />

      <div className="rounded-2xl border border-primary/20 bg-saffron-gradient/5 p-4 sm:p-6 shadow-soft relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-saffron-gradient opacity-10 blur-2xl" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payable Amount</p>
            <p className="mt-1 font-display text-3xl font-extrabold bg-saffron-gradient bg-clip-text text-transparent">
              {amountDisplay}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{planLabel}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> One-time, non-refundable
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">UPI ID</p>
            <p className="mt-1 break-all font-mono text-[12px] font-semibold text-foreground">{UPI_ID}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copy(UPI_ID, "upi")} className="rounded-lg">
                {copiedKey === "upi" ? <Check className="h-4 w-4 text-[oklch(0.55_0.15_150)]" /> : <Copy className="h-4 w-4" />}
                {copiedKey === "upi" ? "Copied" : "Copy UPI ID"}
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-lg bg-saffron-gradient shadow-elev hover:opacity-95"
              >
                <a href={upiDeepLink}>
                  <Smartphone className="h-4 w-4" /> Pay Now
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-2xl border border-border bg-white p-3 shadow-elev">
            <img
              src={qrUrl}
              alt="BharatOne UPI QR code"
              width={220}
              height={220}
              className="h-[220px] w-[220px] rounded-md"
              loading="lazy"
            />
            <div className="mt-2 text-center text-[10px] leading-tight text-muted-foreground">
              <p className="font-semibold text-foreground">{PAYEE}</p>
              <p>A/C: 847705000009 · IFSC: ICIC0008477</p>
            </div>
          </div>

          <div className="mt-4 w-full rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">Pay via any UPI app</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              PhonePe, Google Pay, Paytm, BHIM and other UPI apps will open automatically from Pay Now.
            </p>
          </div>
        </div>
      </div>

      <SectionCard title="Bank Account Details" icon={<Landmark className="h-5 w-5" />}>
        <Notice tone="info" title="Use these details for IMPS / NEFT / RTGS">
          You can also pay directly to our bank account. Copy any field with one tap.
        </Notice>
        <div className="grid gap-3 sm:grid-cols-2">
          <BankRow icon={<User className="h-4 w-4" />} label="Account Holder" value={PAYEE} k="payee" copiedKey={copiedKey} onCopy={copy} mono={false} />
          <BankRow icon={<Hash className="h-4 w-4" />} label="Account Number" value={BANK.account} k="acc" copiedKey={copiedKey} onCopy={copy} />
          <BankRow icon={<ShieldCheck className="h-4 w-4" />} label="IFSC Code" value={BANK.ifsc} k="ifsc" copiedKey={copiedKey} onCopy={copy} />
          <BankRow icon={<Building2 className="h-4 w-4" />} label="Bank" value={`${BANK.bank} — ${BANK.branch}`} k="bank" copiedKey={copiedKey} onCopy={copy} mono={false} />
          <BankRow icon={<CreditCard className="h-4 w-4" />} label="Account Type" value={BANK.type} k="type" copiedKey={copiedKey} onCopy={copy} mono={false} />
          <BankRow icon={<Hash className="h-4 w-4" />} label="Amount" value={amountDisplay} k="amt" copiedKey={copiedKey} onCopy={copy} mono={false} />
        </div>
      </SectionCard>

      <SectionCard title="Payment Confirmation" icon={<Receipt className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment Method" required>
            <select
              className={inputCls}
              value={value.method ?? "upi"}
              onChange={(e) => onChange({ ...value, method: e.target.value as PaymentData["method"] })}
            >
              <option value="upi">UPI</option>
              <option value="imps">IMPS</option>
              <option value="neft">NEFT</option>
              <option value="rtgs">RTGS</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </Field>
          <Field label="Payment Date" required icon={<Calendar className="h-4 w-4" />}>
            <input
              type="date"
              className={inputCls}
              value={value.paidOn ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onChange({ ...value, paidOn: e.target.value })}
            />
          </Field>
          <Field label="UTR / Transaction Reference" required icon={<Hash className="h-4 w-4" />}>
            <input
              className={`${inputCls} uppercase`}
              placeholder="12-digit UTR / Txn ID"
              value={value.utr}
              maxLength={24}
              onChange={(e) => onChange({ ...value, utr: e.target.value })}
            />
          </Field>
          <Field label="Payer Name" required icon={<User className="h-4 w-4" />}>
            <input
              className={inputCls}
              placeholder="Name as in bank account"
              value={value.payerName ?? ""}
              onChange={(e) => onChange({ ...value, payerName: e.target.value })}
            />
          </Field>
          <Field label="Payer Bank" icon={<Building2 className="h-4 w-4" />}>
            <input
              className={inputCls}
              placeholder="e.g. HDFC Bank"
              value={value.payerBank ?? ""}
              onChange={(e) => onChange({ ...value, payerBank: e.target.value })}
            />
          </Field>
          <Field label="Payer Account / UPI ID" icon={<CreditCard className="h-4 w-4" />}>
            <input
              className={inputCls}
              placeholder="Last 4 digits or UPI ID"
              value={value.payerAccount ?? ""}
              onChange={(e) => onChange({ ...value, payerAccount: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Remarks (optional)">
          <textarea
            className={`${inputCls} h-20 py-2.5`}
            placeholder="Any note for our verification team"
            value={value.remarks ?? ""}
            maxLength={250}
            onChange={(e) => onChange({ ...value, remarks: e.target.value })}
          />
        </Field>

        <Field label="Upload Payment Receipt" required hint={<><FileImage className="h-3 w-3" /> JPG, PNG or PDF · max 5 MB</>}>
          {preview || value.screenshotName ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 shadow-soft">
              {preview ? (
                <img src={preview} alt="Receipt preview" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileImage className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{value.screenshotName}</p>
                {fileSize != null && (
                  <p className="text-xs text-muted-foreground">{(fileSize / 1024).toFixed(0)} KB · Uploaded</p>
                )}
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Replace
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-xs font-semibold text-[oklch(0.55_0.2_25)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <Check className="h-5 w-5 shrink-0 text-[oklch(0.55_0.15_150)]" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-background/60 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
                <Upload className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">Click to upload receipt</span>
              <span className="text-xs text-muted-foreground">or drag and drop · JPG / PNG / PDF</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </Field>
      </SectionCard>

      <Notice tone="warn" title="Important">
        Submit your UTR and receipt only after the amount is debited. Incorrect UTR will delay verification by 24–48 hours.
      </Notice>
    </div>
  );
}

function BankRow({
  icon,
  label,
  value,
  k,
  copiedKey,
  onCopy,
  mono = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  k: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  mono?: boolean;
}) {
  const active = copiedKey === k;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`truncate text-[13px] font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value, k)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        {active ? <Check className="h-4 w-4 text-[oklch(0.55_0.15_150)]" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
