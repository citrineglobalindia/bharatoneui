import { useRef, useState } from "react";
import { CreditCard, Copy, Check, Upload, Smartphone, Sparkles } from "lucide-react";
import { Field, StepHeader, inputCls } from "../field";
import { Button } from "@/components/ui/button";

export type PaymentData = {
  utr: string;
  screenshotName?: string;
};

const UPI_ID = "MSBHARATONESERVICESANDAFFILIATESPRIVATELIMITED.eazypay@icici";
const AMOUNT = "4999";
const PAYEE = "Bharatone Services And Affiliates Private Limited";

export function PaymentStep({
  value,
  onChange,
  planLabel = "New Retailer Registration",
}: {
  value: PaymentData;
  onChange: (v: PaymentData) => void;
  planLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${AMOUNT}&cu=INR&tn=KYC%20Verification`
  )}`;
  const upiDeepLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${AMOUNT}&cu=INR&tn=KYC%20Verification`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
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
              ₹4,999
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
              <Button type="button" variant="outline" size="sm" onClick={copy} className="rounded-lg">
                {copied ? <Check className="h-4 w-4 text-[oklch(0.55_0.15_150)]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy UPI ID"}
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

      <div className="grid gap-4">
        <Field label="Enter UTR Number" required>
          <input
            className={inputCls}
            placeholder="Enter UTR or Transaction Reference"
            value={value.utr}
            onChange={(e) => onChange({ ...value, utr: e.target.value })}
          />
        </Field>

        <Field label="Upload Payment Screenshot" required>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-14 w-full items-center gap-3 rounded-xl border-2 border-dashed border-input bg-background/60 px-4 text-left text-sm text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span className="truncate">
              {value.screenshotName ?? "Upload payment screenshot (max 5MB)"}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange({ ...value, screenshotName: f.name });
            }}
          />
        </Field>
      </div>
    </div>
  );
}
