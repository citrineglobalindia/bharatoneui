import { UserCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import { inputCls, Notice, SectionCard, StepHeader } from "../field";

export function AccountStep() {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<UserCheck className="h-5 w-5" />}
        title="Account Details"
        description="Enter your email and mobile number. You'll verify your email at the final step (so the code never expires)."
      />
      <Notice title="Auto-generated username">
        Your username will be created automatically (e.g. <b>BO10001</b>) after successful registration.
      </Notice>

      <SectionCard title="Email ID" icon={<Mail className="h-4 w-4" />}>
        <input className={inputCls} type="email" placeholder="yourname@example.com" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">📧 We'll send a verification code to this email at the final step.</p>
      </SectionCard>

      <SectionCard title="Mobile Number" icon={<Phone className="h-4 w-4" />}>
        <div className="flex gap-2">
          <div className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold text-foreground">
            +91
          </div>
          <input className={inputCls} placeholder="10 digit mobile number" maxLength={10} />
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">📱 We'll send a verification code to this mobile at the final step.</p>
      </SectionCard>
    </div>
  );
}