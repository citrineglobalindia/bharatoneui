import { useState } from "react";
import { User } from "lucide-react";
import { Field, inputCls, StepHeader } from "../field";
import { ConfirmPasswordField, PasswordField } from "../password-field";
import { useRegistration } from "../registration-context";

export function PersonalStep() {
  const { data, set } = useRegistration();
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
          <input
            className={inputCls}
            placeholder="First name"
            value={data.firstName}
            onChange={(e) => set({ firstName: e.target.value })}
          />
        </Field>
        <Field label="Middle Name">
          <input
            className={inputCls}
            placeholder="Middle name (optional)"
            value={data.middleName}
            onChange={(e) => set({ middleName: e.target.value })}
          />
        </Field>
        <Field label="Surname" required>
          <input
            className={inputCls}
            placeholder="Surname"
            value={data.surname}
            onChange={(e) => set({ surname: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" required>
          <PasswordField value={data.password} onChange={(v) => set({ password: v })} />
        </Field>
        <Field label="Confirm Password" required>
          <ConfirmPasswordField value={confirm} onChange={setConfirm} original={data.password} />
        </Field>
      </div>
    </div>
  );
}
