import { useState } from "react";
import { User } from "lucide-react";
import { Field, inputCls, StepHeader } from "../field";
import { ConfirmPasswordField, PasswordField } from "../password-field";

export function PersonalStep() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<User className="h-5 w-5" />}
        title="Personal Details"
        description="Enter your name and set a strong password for your BharatOne account."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First Name" required>
          <input className={inputCls} placeholder="First name" />
        </Field>
        <Field label="Middle Name">
          <input className={inputCls} placeholder="Middle name (optional)" />
        </Field>
        <Field label="Surname" required>
          <input className={inputCls} placeholder="Surname" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" required>
          <PasswordField value={pwd} onChange={setPwd} />
        </Field>
        <Field label="Confirm Password" required>
          <ConfirmPasswordField value={confirm} onChange={setConfirm} original={pwd} />
        </Field>
      </div>
    </div>
  );
}