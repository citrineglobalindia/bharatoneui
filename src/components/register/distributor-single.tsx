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
import { Field, inputCls } from "./field";
import { Button } from "@/components/ui/button";
import { PasswordField, ConfirmPasswordField } from "./password-field";

export function DistributorSinglePage({ onSubmit }: { onSubmit: () => void }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* LEFT — Form card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-elev">
        <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Add Captain</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Captain Name" required className="sm:col-span-2" icon={<User className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Name" />
          </Field>

          <Field label="Date of Birth" required>
            <input type="date" className={inputCls} placeholder="Pick a date" />
          </Field>
          <Field label="Gender" required>
            <select className={inputCls} defaultValue="">
              <option value="" disabled>Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Mobile Number" maxLength={10} inputMode="numeric" />
          </Field>
          <Field label="Alternate Mobile No." required icon={<Phone className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Alternate Mobile Number" maxLength={10} inputMode="numeric" />
          </Field>

          <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
            <input type="email" className={inputCls} placeholder="Enter Email" />
          </Field>
          <Field label="PAN No." required icon={<IdCard className="h-4 w-4" />}>
            <input className={`${inputCls} uppercase`} placeholder="Enter Pan Number" maxLength={10} />
          </Field>

          <Field label="IFSC Code" required icon={<Landmark className="h-4 w-4" />}>
            <input className={`${inputCls} uppercase`} placeholder="Enter IFSC Code" maxLength={11} />
          </Field>
          <Field label="Bank Name" required icon={<Building2 className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Bank Name" />
          </Field>

          <Field label="Bank AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Account Number" inputMode="numeric" />
          </Field>
          <Field label="Confirm AC Number" required icon={<Hash className="h-4 w-4" />}>
            <input className={inputCls} placeholder="Enter Account Number" inputMode="numeric" />
          </Field>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">Address:-</h3>
          <div className="mt-3 grid gap-4">
            <Field label="Address Line" required icon={<MapPin className="h-4 w-4" />}>
              <input className={inputCls} placeholder="Enter Address Line" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State Name" required>
                <select className={inputCls} defaultValue="">
                  <option value="" disabled>Select State</option>
                  <option>Karnataka</option>
                  <option>Maharashtra</option>
                  <option>Tamil Nadu</option>
                  <option>Delhi</option>
                </select>
              </Field>
              <Field label="District Name" required>
                <select className={inputCls} defaultValue="">
                  <option value="" disabled>Select District</option>
                  <option>Bengaluru Urban</option>
                  <option>Mysuru</option>
                  <option>Mumbai</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Group Name">
            <input className={inputCls} placeholder="Enter Group Name" />
          </Field>

          <Field
            label="Form PDF"
            required
            icon={<FileText className="h-4 w-4" />}
            hint={<span className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> Upload the filled & signed captain onboarding form.</span>}
          >
            <div className="flex items-center gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-soft hover:bg-muted">
                Choose file
                <input type="file" accept="application/pdf" className="sr-only" />
              </label>
              <span className="text-sm text-muted-foreground">No file chosen</span>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" required>
              <PasswordField value={pwd} onChange={setPwd} />
            </Field>
            <Field label="Confirm Password" required>
              <ConfirmPasswordField value={confirm} onChange={setConfirm} original={pwd} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-5">
          <Button
            onClick={onSubmit}
            className="h-11 rounded-xl bg-saffron-gradient px-6 text-sm font-semibold shadow-elev hover:opacity-95"
          >
            Submit
          </Button>
        </div>
      </div>

      {/* RIGHT — Instructions */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-elev">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-foreground">Instructions</h3>
            <Button
              asChild
              type="button"
              size="sm"
              className="h-8 gap-1 rounded-lg bg-saffron-gradient text-xs font-semibold"
            >
              <a href="/distributor-onboarding-form.pdf" download>
                Form <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Please download the captain onboarding form using the button above and fill it out accurately.
            Ensure that all details provided match with your government ID. Once completed, submit the form along
            with the required documents as per the instructions provided in the form.
          </p>

          <ul className="mt-4 space-y-3">
            <InstructionItem title="Captain Name">
              Please ensure that the spelling of your name and other details match with your govt. ID, as these
              cannot be changed later. Incorrect details might lead to cancellation penalties.
            </InstructionItem>
            <InstructionItem title="Mobile No.">
              Please enter a valid mobile number of agent.
            </InstructionItem>
            <InstructionItem title="Email">
              Please enter a valid email of agent for future notifications.
            </InstructionItem>
            <InstructionItem title="Address">
              Please enter the District and State of Agent.
            </InstructionItem>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function InstructionItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}