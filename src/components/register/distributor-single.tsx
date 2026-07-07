import { useEffect, useMemo, useState } from "react";
import { sanitizeMobile } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
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
  UploadCloud,
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

// Attractive drag-and-drop style upload card with image preview + selected state.
function UploadDrop({ file, onFile, accept, invalid = false }: { file: File | null; onFile: (f: File | null) => void; accept: string; invalid?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const u = URL.createObjectURL(file);
      setPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreview(null);
  }, [file]);
  const isPdf = !!file && file.type === "application/pdf";
  return (
    <label
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-2.5 transition ${
        file
          ? "border-india-green/40 bg-india-green/[0.04]"
          : invalid
            ? "border-red-300 bg-red-50/40 hover:border-red-400"
            : "border-input bg-muted/20 hover:border-saffron/60 hover:bg-muted/40"
      }`}
    >
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {preview ? (
        <img src={preview} alt="preview" className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-soft" />
      ) : (
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${file ? "bg-india-green/10 text-india-green" : "bg-saffron/10 text-saffron"}`}>
          {isPdf ? <FileText className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${file ? "text-foreground" : "text-muted-foreground"}`}>
          {file ? file.name : "Click to upload"}
        </p>
        <p className="text-[10px] text-muted-foreground">{file ? "Tap to change file" : "Image or PDF"}</p>
      </div>
      {file && <CheckCircle2 className="h-5 w-5 shrink-0 text-india-green" />}
    </label>
  );
}

export function DistributorSinglePage({
  onSubmit,
  submitting = false,
  error = null,
}: {
  onSubmit: (data: DistributorFormData, files: { form: File; bankCopy: File; aadhaar: File; pan: File }) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState<DistributorFormData>(emptyForm);
  const [confirmPwd, setConfirmPwd] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [bankCopyFile, setBankCopyFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [attempted, setAttempted] = useState(false);

  // Admin-managed downloadable forms (blank form + sample). Fall back to the
  // bundled static PDF when the admin hasn't uploaded one.
  const [forms, setForms] = useState<{ form?: string; sample?: string }>({});
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("distributor_forms")
        .select("form_path, form_name, sample_path, sample_name")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!on || !data) return;
      const d = data as { form_path: string | null; form_name: string | null; sample_path: string | null; sample_name: string | null };
      const url = (p: string, n?: string | null) => supabase.storage.from("gallery").getPublicUrl(p, { download: n || true }).data.publicUrl;
      setForms({
        form: d.form_path ? url(d.form_path, d.form_name) : undefined,
        sample: d.sample_path ? url(d.sample_path, d.sample_name) : undefined,
      });
    })();
    return () => { on = false; };
  }, []);
  const formHref = forms.form || "/distributor-onboarding-form.pdf";
  const sampleHref = forms.sample || "/distributor-onboarding-sample.pdf";

  const set = <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stateDistricts: Record<string, string[]> = {
    Karnataka: [
      "Bagalkot",
      "Ballari",
      "Belagavi",
      "Bengaluru Rural",
      "Bengaluru Urban",
      "Bidar",
      "Chamarajanagar",
      "Chikkaballapur",
      "Chikkamagaluru",
      "Chitradurga",
      "Dakshina Kannada",
      "Davanagere",
      "Dharwad",
      "Gadag",
      "Hassan",
      "Haveri",
      "Kalaburagi",
      "Kodagu",
      "Kolar",
      "Koppal",
      "Mandya",
      "Mysuru",
      "Raichur",
      "Ramanagara",
      "Shivamogga",
      "Tumakuru",
      "Udupi",
      "Uttara Kannada",
      "Vijayapura",
      "Yadgir",
      "Vijayanagara",
    ],
  };

  const errors = useMemo(() => {
    const e: Partial<
      Record<keyof DistributorFormData | "confirmAccount" | "confirmPwd" | "formFile" | "bankCopyFile" | "aadhaarFile" | "panFile", string>
    > = {};
    if (!form.distributorName.trim()) e.distributorName = "Distributor name is required.";
    if (!form.proprietorName.trim()) e.proprietorName = "Proprietor name is required.";
    if (!form.companyName.trim()) e.companyName = "Company / firm name is required.";
    if (form.gstNumber && form.gstNumber.length !== 15)
      e.gstNumber = "GST number must be 15 characters.";
    if (!form.dob) e.dob = "Date of birth is required.";
    if (!form.gender) e.gender = "Select a gender.";
    if (!MOBILE_RE.test(form.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
    if (form.altMobile && !MOBILE_RE.test(form.altMobile)) e.altMobile = "Enter a valid 10-digit alternate number.";
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
    if (!bankCopyFile) e.bankCopyFile = "Upload the bank passbook / cheque copy.";
    if (!aadhaarFile) e.aadhaarFile = "Upload the Aadhaar card.";
    if (!panFile) e.panFile = "Upload the PAN card.";
    if (!isPasswordValid(form.password)) e.password = "Password does not meet the requirements.";
    if (confirmPwd !== form.password) e.confirmPwd = "Passwords do not match.";
    return e;
  }, [form, confirmAccount, confirmPwd, formFile, bankCopyFile, aadhaarFile, panFile]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid || !formFile || !bankCopyFile || !aadhaarFile || !panFile || submitting) return;
    onSubmit(form, { form: formFile, bankCopy: bankCopyFile, aadhaar: aadhaarFile, pan: panFile });
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
              onChange={(e) => set("mobile", sanitizeMobile(e.target.value))}
            />
            {err("mobile")}
          </Field>
          <Field label="Alternate Mobile No. (optional)" icon={<Phone className="h-4 w-4" />}>
            <input
              className={compactInput}
              placeholder="Enter Alternate Mobile Number (optional)"
              maxLength={10}
              inputMode="numeric"
              value={form.altMobile}
              onChange={(e) => set("altMobile", sanitizeMobile(e.target.value))}
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
              onChange={(e) => set("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              maxLength={10}
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

        <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-saffron" /> Documents
            <span className="text-red-500">*</span>
          </p>
          <p className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="h-3 w-3" /> All documents are required. Upload clear scans or photos.
          </p>

          <Field label="Onboarding Form (filled & signed)" required icon={<FileText className="h-4 w-4" />}>
            <UploadDrop file={formFile} onFile={setFormFile} accept="application/pdf" invalid={attempted && !formFile} />
            {err("formFile")}
          </Field>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([
              ["Bank Passbook / Cheque Copy", bankCopyFile, setBankCopyFile, "bankCopyFile", <Landmark className="h-4 w-4" />],
              ["Aadhaar Card", aadhaarFile, setAadhaarFile, "aadhaarFile", <IdCard className="h-4 w-4" />],
              ["PAN Card", panFile, setPanFile, "panFile", <IdCard className="h-4 w-4" />],
            ] as [string, File | null, (f: File | null) => void, "bankCopyFile" | "aadhaarFile" | "panFile", JSX.Element][]).map(
              ([label, file, setter, key, icon]) => (
                <Field key={key} label={label} required icon={icon}>
                  <UploadDrop file={file} onFile={setter} accept="image/*,application/pdf" invalid={attempted && !file} />
                  {err(key)}
                </Field>
              ),
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
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
            <div className="flex items-center gap-1.5">
              <Button
                asChild
                type="button"
                size="sm"
                className="h-7 gap-1 rounded-md bg-saffron-gradient text-xs font-semibold px-2.5"
              >
                <a href={formHref} download target="_blank" rel="noopener noreferrer">
                  Form <Download className="h-3 w-3" />
                </a>
              </Button>
              <Button
                asChild
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-md text-xs font-semibold px-2.5"
              >
                <a href={sampleHref} download target="_blank" rel="noopener noreferrer">
                  Sample <Download className="h-3 w-3" />
                </a>
              </Button>
            </div>
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
