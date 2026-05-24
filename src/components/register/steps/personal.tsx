import { useState } from "react";
import { User, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { Field, inputCls, StepHeader } from "../field";

export function PersonalStep() {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<User className="h-5 w-5" />}
        title="Personal Details"
        description="Enter your name and set a password for your BharatOne account."
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
          <div className="relative">
            <input
              type={show1 ? "text" : "password"}
              className={`${inputCls} pr-10`}
              placeholder="Min 6 characters"
            />
            <button
              type="button"
              onClick={() => setShow1((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password" required>
          <div className="relative">
            <input
              type={show2 ? "text" : "password"}
              className={`${inputCls} pr-10`}
              placeholder="Re-enter password"
            />
            <button
              type="button"
              onClick={() => setShow2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
      </div>
      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email: <span className="text-foreground font-medium">sada@gmail.com</span></div>
        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Mobile: <span className="text-foreground font-medium">+91 8652468799</span></div>
      </div>
    </div>
  );
}