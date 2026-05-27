import { useMemo, useState } from "react";
import {
  Landmark,
  User,
  Hash,
  ShieldCheck,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { Field, inputCls, SectionCard } from "./field";
import { cn } from "@/lib/utils";

/* -------------------------- Validators (RBI-spec) -------------------------- */

// Letters and single spaces only, optional dot. 3+ chars after trim.
const NAME_RE = /^[A-Za-z][A-Za-z .]{1,}[A-Za-z.]$/;
// 9–18 numeric digits, not all zeros.
const ACC_RE = /^[1-9]\d{8,17}$|^\d*[1-9]\d*$/;
// RBI IFSC: 4 letters + '0' + 6 alphanumerics.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export type BankDetailsValue = {
  holderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  accountType: "" | "savings" | "current";
};

export const emptyBankDetails: BankDetailsValue = {
  holderName: "",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  accountType: "",
};

export type BankErrors = Partial<Record<keyof BankDetailsValue, string>>;

export function validateBankDetails(v: BankDetailsValue): BankErrors {
  const errors: BankErrors = {};
  const name = v.holderName.trim().replace(/\s+/g, " ");

  if (!name) errors.holderName = "Account holder name is required";
  else if (name.length < 3) errors.holderName = "Name must be at least 3 characters";
  else if (!/^[A-Za-z .]+$/.test(name))
    errors.holderName = "Name should contain only alphabets";
  else if (!NAME_RE.test(name))
    errors.holderName = "Name should contain only alphabets";

  const bank = v.bankName.trim().replace(/\s+/g, " ");
  if (!bank) errors.bankName = "Bank name is required";
  else if (/\d/.test(bank)) errors.bankName = "Bank name should not contain numbers";

  const acc = v.accountNumber.trim();
  if (!acc) errors.accountNumber = "Please enter a valid account number";
  else if (!/^\d+$/.test(acc))
    errors.accountNumber = "Please enter a valid account number";
  else if (acc.length < 9 || acc.length > 18)
    errors.accountNumber = "Account number must be 9–18 digits";
  else if (/^0+$/.test(acc))
    errors.accountNumber = "Please enter a valid account number";

  if (!v.confirmAccountNumber.trim())
    errors.confirmAccountNumber = "Please re-enter the account number";
  else if (v.confirmAccountNumber !== v.accountNumber)
    errors.confirmAccountNumber = "Account numbers do not match";

  const ifsc = v.ifsc.trim().toUpperCase();
  if (!ifsc) errors.ifsc = "Invalid IFSC code";
  else if (!IFSC_RE.test(ifsc)) errors.ifsc = "Invalid IFSC code";

  if (!v.accountType) errors.accountType = "Please select account type";

  return errors;
}

function maskAccount(acc: string) {
  const digits = acc.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${"•".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

/* --------------------------------- UI ------------------------------------- */

export function BankDetailsSection({
  value,
  onChange,
  errors,
  required = true,
}: {
  value: BankDetailsValue;
  onChange: (v: BankDetailsValue) => void;
  errors?: BankErrors;
  required?: boolean;
}) {
  const [showAcc, setShowAcc] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof BankDetailsValue, boolean>>>({});

  const computed = useMemo(() => validateBankDetails(value), [value]);
  const eff: BankErrors = errors ?? computed;

  const set = <K extends keyof BankDetailsValue>(k: K, v: BankDetailsValue[K]) =>
    onChange({ ...value, [k]: v });

  const showErr = (k: keyof BankDetailsValue) => touched[k] && eff[k];

  const accMatch =
    value.accountNumber.length > 0 &&
    value.confirmAccountNumber.length > 0 &&
    value.accountNumber === value.confirmAccountNumber;

  return (
    <SectionCard title="Bank Details" icon={<Landmark className="h-4 w-4" />}>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Holder Name */}
        <Field
          label="Account Holder Name"
          required={required}
          icon={<User className="h-4 w-4" />}
          hint={showErr("holderName") ? <ErrorHint msg={eff.holderName!} /> : "As printed on the passbook / cheque."}
        >
          <input
            className={cn(inputCls, showErr("holderName") && "border-red-400 focus-visible:ring-red-500/15")}
            placeholder="e.g. Ramesh Kumar"
            value={value.holderName}
            maxLength={100}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^A-Za-z .]/g, "").replace(/\s{2,}/g, " ");
              set("holderName", cleaned);
            }}
            onBlur={() => {
              setTouched((t) => ({ ...t, holderName: true }));
              set("holderName", value.holderName.trim().replace(/\s+/g, " "));
            }}
          />
        </Field>

        {/* Bank Name */}
        <Field
          label="Bank Name"
          required={required}
          icon={<Building2 className="h-4 w-4" />}
          hint={showErr("bankName") ? <ErrorHint msg={eff.bankName!} /> : undefined}
        >
          <input
            className={cn(inputCls, showErr("bankName") && "border-red-400 focus-visible:ring-red-500/15")}
            placeholder="e.g. State Bank of India"
            value={value.bankName}
            maxLength={80}
            onChange={(e) => set("bankName", e.target.value.replace(/\d/g, ""))}
            onBlur={() => {
              setTouched((t) => ({ ...t, bankName: true }));
              set("bankName", value.bankName.trim().replace(/\s+/g, " "));
            }}
          />
        </Field>

        {/* Account Number */}
        <Field
          label="Account Number"
          required={required}
          icon={<Hash className="h-4 w-4" />}
          hint={
            showErr("accountNumber")
              ? <ErrorHint msg={eff.accountNumber!} />
              : <span>9–18 digits, numbers only.</span>
          }
        >
          <div className="relative">
            <input
              className={cn(
                inputCls,
                "pr-10 font-mono tracking-wider",
                showErr("accountNumber") && "border-red-400 focus-visible:ring-red-500/15",
              )}
              type={showAcc ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123456789012"
              maxLength={18}
              value={value.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 18))}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 18);
                set("accountNumber", text);
              }}
              onBlur={() => setTouched((t) => ({ ...t, accountNumber: true }))}
            />
            <button
              type="button"
              onClick={() => setShowAcc((s) => !s)}
              aria-label={showAcc ? "Hide account number" : "Show account number"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              {showAcc ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {/* Confirm Account Number */}
        <Field
          label="Re-enter Account Number"
          required={required}
          icon={<Hash className="h-4 w-4" />}
          hint={
            showErr("confirmAccountNumber") ? (
              <ErrorHint msg={eff.confirmAccountNumber!} />
            ) : accMatch ? (
              <SuccessHint msg="Account numbers match" />
            ) : (
              <span>Paste is disabled — please type to confirm.</span>
            )
          }
        >
          <div className="relative">
            <input
              className={cn(
                inputCls,
                "pr-10 font-mono tracking-wider",
                showErr("confirmAccountNumber") && "border-red-400 focus-visible:ring-red-500/15",
                accMatch && "border-emerald-400 focus-visible:ring-emerald-500/15",
              )}
              type={showConfirm ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Re-enter account number"
              maxLength={18}
              value={value.confirmAccountNumber}
              onPaste={(e) => e.preventDefault()}
              onChange={(e) =>
                set("confirmAccountNumber", e.target.value.replace(/\D/g, "").slice(0, 18))
              }
              onBlur={() => setTouched((t) => ({ ...t, confirmAccountNumber: true }))}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide" : "Show"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {/* IFSC */}
        <Field
          label="IFSC Code"
          required={required}
          icon={<ShieldCheck className="h-4 w-4" />}
          hint={
            showErr("ifsc") ? (
              <ErrorHint msg={eff.ifsc!} />
            ) : (
              <span>Format: <b>HDFC0001234</b> (4 letters + 0 + 6 alphanumerics).</span>
            )
          }
        >
          <input
            className={cn(
              inputCls,
              "uppercase font-mono tracking-wider",
              showErr("ifsc") && "border-red-400 focus-visible:ring-red-500/15",
            )}
            placeholder="HDFC0001234"
            maxLength={11}
            value={value.ifsc}
            onChange={(e) =>
              set(
                "ifsc",
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 11),
              )
            }
            onBlur={() => setTouched((t) => ({ ...t, ifsc: true }))}
          />
        </Field>

        {/* Account Type */}
        <Field
          label="Account Type"
          required={required}
          icon={<CreditCard className="h-4 w-4" />}
          hint={showErr("accountType") ? <ErrorHint msg={eff.accountType!} /> : undefined}
        >
          <select
            className={cn(
              inputCls,
              showErr("accountType") && "border-red-400 focus-visible:ring-red-500/15",
            )}
            value={value.accountType}
            onChange={(e) => set("accountType", e.target.value as BankDetailsValue["accountType"])}
            onBlur={() => setTouched((t) => ({ ...t, accountType: true }))}
          >
            <option value="">Select account type</option>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
          </select>
        </Field>
      </div>

      {/* Live preview / mask */}
      {value.accountNumber && !eff.accountNumber && (
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12px] text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>
            On save, your account number will be masked as{" "}
            <span className="font-mono font-semibold">{maskAccount(value.accountNumber)}</span> for security.
          </span>
        </div>
      )}
    </SectionCard>
  );
}

function ErrorHint({ msg }: { msg: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
      <XCircle className="h-3.5 w-3.5" /> {msg}
    </span>
  );
}

function SuccessHint({ msg }: { msg: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5" /> {msg}
    </span>
  );
}