import { useState } from "react";
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
} from "lucide-react";
import { Field } from "./field";
import { Button } from "@/components/ui/button";
import { PasswordField, ConfirmPasswordField } from "./password-field";

export function DistributorSinglePage({ onSubmit }: { onSubmit: () => void }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [selectedState, setSelectedState] = useState("");

  const stateDistricts: Record<string, string[]> = {
    Karnataka: [
      "Bagalkot", "Ballari (Bellary)", "Belagavi (Belgaum)", "Bengaluru Rural",
      "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur",
      "Chikkamagaluru (Chikmagalur)", "Chitradurga", "Dakshina Kannada",
      "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi (Gulbarga)",
      "Kodagu (Coorg)", "Kolar", "Koppal", "Mandya", "Mysuru (Mysore)",
      "Raichur", "Ramanagara", "Shivamogga (Shimoga)", "Tumakuru (Tumkur)",
      "Udupi", "Uttara Kannada (Karwar)", "Vijayapura (Bijapur)", "Yadgir", "Vijayanagara"
    ],
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* LEFT — Form card */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-elev">
        <h2 className="font-display text-base sm:text-lg font-bold text-foreground">Add Distributor</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Distributor Name" required className="sm:col-span-2" icon={<User className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Name" />
          </Field>

          <Field label="Individual / Proprietor Name" required icon={<User className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Proprietor Name" />
          </Field>
          <Field label="Company / Firm Name" required icon={<Building2 className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Company / Firm Name" />
          </Field>

          <Field label="GST Number" icon={<Hash className="h-4 w-4" />}>
            <input className={`${compactInput} uppercase`} placeholder="Enter GST Number" maxLength={15} />
          </Field>
          <Field label="Date of Birth" required>
            <input type="date" className={compactInput} placeholder="Pick a date" />
          </Field>
          <Field label="Gender" required>
            <select className={compactInput} defaultValue="">
              <option value="" disabled>Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Mobile Number" maxLength={10} inputMode="numeric" />
          </Field>
          <Field label="Alternate Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Alternate Mobile Number" maxLength={10} inputMode="numeric" />
          </Field>

          <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
            <input type="email" className={compactInput} placeholder="Enter Email" />
          </Field>
          <Field label="PAN No." required icon={<IdCard className="h-4 w-4" />}>
            <input className={`${compactInput} uppercase`} placeholder="Enter Pan Number" maxLength={10} />
          </Field>

          <Field label="IFSC Code" required icon={<Landmark className="h-4 w-4" />}>
            <input className={`${compactInput} uppercase`} placeholder="Enter IFSC Code" maxLength={11} />
          </Field>
          <Field label="Bank Name" required icon={<Building2 className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Bank Name" />
          </Field>

          <Field label="Bank AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Account Number" inputMode="numeric" />
          </Field>
          <Field label="Confirm AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input className={compactInput} placeholder="Enter Account Number" inputMode="numeric" />
          </Field>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">Address:-</h3>
          <div className="mt-2 grid gap-3">
            <Field label="Address Line" required icon={<MapPin className="h-4 w-4" />}>
              <input className={compactInput} placeholder="Enter Address Line" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="State Name" required>
                <select
                  className={compactInput}
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  <option value="" disabled>Select State</option>
                  <option>Karnataka</option>
                  <option>Maharashtra</option>
                  <option>Tamil Nadu</option>
                  <option>Delhi</option>
                </select>
              </Field>
              <Field label="District Name" required>
                <select className={compactInput} defaultValue="">
                  <option value="" disabled>Select District</option>
                  {(stateDistricts[selectedState] || []).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Group Name">
            <input className={compactInput} placeholder="Enter Group Name" />
          </Field>

          <Field
            label="Form PDF"
            required
            icon={<FileText className="h-4 w-4" />}
            hint={<span className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> Upload the filled & signed distributor onboarding form.</span>}
          >
            <div className="flex items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-soft hover:bg-muted">
                Choose file
                <input type="file" accept="application/pdf" className="sr-only" />
              </label>
              <span className="text-xs text-muted-foreground">No file chosen</span>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Password" required>
              <PasswordField value={pwd} onChange={setPwd} />
            </Field>
            <Field label="Confirm Password" required>
              <ConfirmPasswordField value={confirm} onChange={setConfirm} original={pwd} />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            onClick={onSubmit}
            className="h-10 rounded-lg bg-saffron-gradient px-5 text-sm font-semibold shadow-elev hover:opacity-95"
          >
            Submit
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
            Please download the distributor onboarding form using the button above and fill it out accurately.
            Ensure all details match your government ID.
          </p>

          <ul className="mt-3 space-y-2.5">
            <InstructionItem title="Distributor Name">
              Ensure spelling matches your govt. ID — cannot be changed later.
            </InstructionItem>
            <InstructionItem title="Mobile No.">
              Enter a valid agent mobile number.
            </InstructionItem>
            <InstructionItem title="Email">
              Valid email for future notifications.
            </InstructionItem>
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