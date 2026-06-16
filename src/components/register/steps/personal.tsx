import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Field, inputCls, StepHeader } from "../field";
import { ConfirmPasswordField, PasswordField, isPasswordValid } from "../password-field";
import { useRegistration } from "../registration-context";

// letters and spaces only (no numbers / special chars)
const onlyLetters = (v: string) => v.replace(/[^A-Za-z ]/g, "");

export function PersonalStep() {
  const { data, set } = useRegistration();
  const [confirm, setConfirm] = useState("");

  const firstOk = data.firstName.trim().length > 0;
  const surnameOk = data.surname.trim().length > 0;
  const pwdOk = isPasswordValid(data.password);
  const matchOk = confirm.length > 0 && confirm === data.password;
  const valid = firstOk && surnameOk && pwdOk && matchOk;

  useEffect(() => {
    set({ personalValid: valid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid]);

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
            inputMode="text"
            onChange={(e) => set({ firstName: onlyLetters(e.target.value) })}
          />
        </Field>
        <Field label="Middle Name">
          <input
            className={inputCls}
            placeholder="Middle name (optional)"
            value={data.middleName}
            onChange={(e) => set({ middleName: onlyLetters(e.target.value) })}
          />
        </Field>
        <Field label="Surname" required>
          <input
            className={inputCls}
            placeholder="Surname"
            value={data.surname}
            inputMode="text"
            onChange={(e) => set({ surname: onlyLetters(e.target.value) })}
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
      <p className="text-[12px] text-muted-foreground">
        First name and surname are required (letters only). Password must include uppercase,
        lowercase, a number and a special character, and both passwords must match.
      </p>
    </div>
  );
}
