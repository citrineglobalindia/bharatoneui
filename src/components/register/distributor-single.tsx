import { useMemo, useState } from "react";
import {
  User,
  Phone,
  Mail,
  IdCard,
  Landmark,
  Hash,
  MapPin,
  FileText,
  Download,
  CheckCircle2,
  Info,
  Building2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Field } from "./field";
import { Button } from "@/components/ui/button";
import { PasswordField, ConfirmPasswordField, isPasswordValid } from "./password-field";

export type DistributorFormData = {
  distributorName: string;
  proprietorName: string;
  companyName: string;
  gstNumber: string;
  dob: string;
  gender: string;
  mobile: string;
  altMobile: string;
  email: string;
  panNumber: string;
  ifsc: string;
  bankName: string;
  accountNumber: string;
  addressLine: string;
  state: string;
  district: string;
  groupName: string;
  password: string;
};

const emptyForm: DistributorFormData = {
  distributorName: "",
  proprietorName: "",
  companyName: "",
  gstNumber: "",
  dob: "",
  gender: "",
  mobile: "",
  altMobile: "",
  email: "",
  panNumber: "",
  ifsc: "",
  bankName: "",
  accountNumber: "",
  addressLine: "",
  state: "Karnataka",
  district: "",
  groupName: "",
  password: "",
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

export function DistributorSinglePage({
  onSubmit,
  submitting = false,
  error = null,
}: {
  onSubmit: (data: DistributorFormData, formFile: File) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState<DistributorFormData>(emptyForm);
  const [confirmPwd, setConfirmPwd] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [attempted, setAttempted] = useState(false);

  const set = <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stateDistricts: Record<string, string[]> = {
    Karnataka: [
      "Bagalkot",
      "Ballari (Bellary)",
      "Belagavi (Belgaum)",
      "Bengaluru Rural",
      "Bengaluru Urban",
      "Bidar",
      "Chamarajanagar",
      "Chikkaballapur",
      "Chikkamagaluru (Chikmagalur)",
      "Chitradurga",
      "Dakshina Kannada",
      "Davanagere",
      "Dharwad",
      "Gadag",
      "Hassan",
      "Haveri",
      "Kalaburagi (Gulbarga)",
      "Kodagu (Coorg)",
      "Kolar",
      "Koppal",
      "Mandya",
      "Mysuru (Mysore)",
      "Raichur",
      "Ramanagara",
      "Shivamogga (Shimoga)",
      "Tumakuru (Tumkur)",
      "Udupi",
      "Uttara Kannada (Karwar)",
      "Vijayapura (Bijapur)",
      "Yadgir",
      "Vijayanagara",
    ],
  };

  const errors = useMemo(() => {
    const e: Partial<
      Record<keyof DistributorFormData | "confirmAccount" | "confirmPwd" | "formFile", string>
    > = {};
    if (!form.distributorName.trim()) e.distributorName = "Distributor name is required.";
    if (!form.proprietorName.trim()) e.proprietorName = "Proprietor name is required.";
    if (!form.companyName.trim()) e.companyName = "Company / firm name is required.";
    if (form.gstNumber && form.gstNumber.length !== 15)
      e.gstNumber = "GST number must be 15 characters.";
    if (!form.dob) e.dob = "Date of birth is required.";
    if (!form.gender) e.gender = "Select a gender.";
    if (!MOBILE_RE.test(form.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
    if (!MOBILE_RE.test(form.altMobile)) e.altMobile = "Enter a valid 10-digit alternate number.";
    if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address.";
    if (!PAN_RE.test(form.panNumber)) e.panNumber = "Enter a valid PAN (e.g. ABCDE1234F).";
    if (!IFSC_RE.test(form.ifsc)) e.ifsc = "Enter a valid IFSC code.";
    if (!form.bankName.trim()) e.bankName = "Bank name is required.";
    if (!form.accountNumber.trim()) e.accountNumber = "Account number is required.";
    if (confirmAccount !== form.accountNumber) e.confirmAccount = "Account numbers do not match.";
    if (!form.addressLine.trim()) e.addressLine = "Address line is required.";
    if (!form.state) e.state = "Select a state.";
    if (!form.district) e.district = "Select a district.";
    if (!formFile) e.formFile = "Upload the filled & signed onboarding form (PDF).";
    if (!isPasswordValid(form.password)) e.password = "Password does not meet the requirements.";
    if (confirmPwd !== form.password) e.confirmPwd = "Passwords do not match.";
    return e;
  }, [form, confirmAccount, confirmPwd, formFile]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid || !formFile || submitting) return;
    onSubmit(form, formFile);
  };

  const err = (key: keyof typeof errors) =>
    attempted && errors[key] ? (
      <span className="animate-in fade-in slide-in-from-top-0.5 mt-1 block text-[11px] font-medium text-red-600 duration-200">
        {errors[key]}
      </span>
    ) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* LEFT — Form card */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-elev">
        <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
          Add Distributor
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Distributor Name"
            required
            className="sm:col-span-2"
            icon={<User className="h-4 w-4" />}
          >
            <input
              className={compactInput}
              placeholder="Enter Name"
              value={form.distributorName}
              onChange={(e) => set("distributorName", e.target.value)}
            />
            {err("distributorName")}
          </Field>

          <Field label="Individual / Proprietor Name" required icon={<User className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Proprietor Name"
              value={form.proprietorName}
              onChange={(e) => set("proprietorName", e.target.value)}
            />
            {err("proprietorName")}
          </Field>
          <Field label="Company / Firm Name" required icon={<Building2 className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Company / Firm Name"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
            />
            {err("companyName")}
          </Field>

          <Field label="GST Number" icon={<Hash className="h-4 w-4" />}>
            <input
              className={`${compactInput} uppercase`}
              placeholder="Enter GST Number"
              maxLength={15}
              value={form.gstNumber}
              onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
            />
            {err("gstNumber")}
          </Field>
          <Field label="Date of Birth" required>
            <input
              type="date"
              className={compactInput}
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
            {err("dob")}
          </Field>
          <Field label="Gender" required>
            <select
              className={compactInput}
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="" disabled>
                Select Gender
              </option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            {err("gender")}
          </Field>

          <Field label="Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Mobile Number"
              maxLength={10}
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
            />
            {err("mobile")}
          </Field>
          <Field label="Alternate Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Alternate Mobile Number"
              maxLength={10}
              inputMode="numeric"
              value={form.altMobile}
              onChange={(e) => set("altMobile", e.target.value.replace(/\D/g, ""))}
            />
            {err("altMobile")}
          </Field>

          <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              className={compactInput}
              placeholder="Enter Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {err("email")}
          </Field>
          <Field label="PAN No." required icon={<IdCard className="h-4 w-4" />}>
            <input
              className={`${compactInput} uppercase`}
              placeholder="Enter Pan Number"
              maxLength={10}
              value={form.panNumber}
              onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
            />
            {err("panNumber")}
          </Field>

          <Field label="IFSC Code" required icon={<Landmark className="h-4 w-4" />}>
            <input
              className={`${compactInput} uppercase`}
              placeholder="Enter IFSC Code"
              maxLength={11}
              value={form.ifsc}
              onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
            />
            {err("ifsc")}
          </Field>
          <Field label="Bank Name" required icon={<Building2 className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Bank Name"
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
            />
            {err("bankName")}
          </Field>

          <Field label="Bank AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Account Number"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))}
            />
            {err("accountNumber")}
          </Field>
          <Field label="Confirm AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Account Number"
              inputMode="numeric"
              value={confirmAccount}
              onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ""))}
            />
            {err("confirmAccount")}
          </Field>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">Address:-</h3>
          <div className="mt-2 grid gap-3">
            <Field label="Address Line" required icon={<MapPin className="h-4 w-4" />}>
              <input
                className={compactInput}
                placeholder="Enter Address Line"
                value={form.addressLine}
                onChange={(e) => set("addressLine", e.target.value)}
              />
              {err("addressLine")}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="State Name" required>
                <select
                  className={compactInput}
                  value={form.state}
                  onChange={(e) => {
                    set("state", e.target.value);
                    set("district", "");
                  }}
                >
                  <option>Karnataka</option>
                </select>
                {err("state")}
              </Field>
              <Field label="District Name" required>
                <select
                  className={compactInput}
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                >
                  <option value="" disabled>
                    Select District
                  </option>
                  {(stateDistricts[form.state] || []).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                {err("district")}
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Group Name">
            <input
              className={compactInput}
              placeholder="Enter Group Name"
              value={form.groupName}
              onChange={(e) => set("groupName", e.target.value)}
            />
          </Field>

          <Field
            label="Form PDF"
            required
            icon={<FileText className="h-4 w-4" />}
            hint={
              <span className="inline-flex items-center gap-1">
                <Info className="h-3 w-3" /> Upload the filled & signed distributor onboarding form.
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-soft hover:bg-muted">
                Choose file
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                {formFile ? formFile.name : "No file chosen"}
              </span>
            </div>
            {err("formFile")}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Password" required>
              <PasswordField value={form.password} onChange={(v) => set("password", v)} />
              {err("password")}
            </Field>
            <Field label="Confirm Password" required>
              <ConfirmPasswordField
                value={confirmPwd}
                onChange={setConfirmPwd}
                original={form.password}
              />
            </Field>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {attempted && !isValid && !error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Please correct the highlighted fields before submitting.</span>
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 rounded-lg bg-saffron-gradient px-5 text-sm font-semibold shadow-elev hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit <CheckCircle2 className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT — Instructions */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-elev">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-foreground">Instructions</h3>
            <Button
              asChild
              type="button"
              size="sm"
              className="h-7 gap-1 rounded-md bg-saffron-gradient text-xs font-semibold px-2.5"
            >
              <a href="/distributor-onboarding-form.pdf" download>
                Form <Download className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Please download the distributor onboarding form using the button above and fill it out
            accurately. Ensure all details match your government ID.
          </p>

          <ul className="mt-3 space-y-2.5">
            <InstructionItem title="Distributor Name">
              Ensure spelling matches your govt. ID — cannot be changed later.
            </InstructionItem>
            <InstructionItem title="Mobile No.">Enter a valid agent mobile number.</InstructionItem>
            <InstructionItem title="Email">Valid email for future notifications.</InstructionItem>
            <InstructionItem title="Address">
              Enter the District and State of Agent.
            </InstructionItem>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function InstructionItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-foreground">{title}</div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

const compactInput =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary";
