import { ShieldCheck } from "lucide-react";
import { TwoFactorCard } from "@/components/account/two-factor-card";

/**
 * The admin's own two-factor settings.
 *
 * This screen used to carry its own copy of the enrolment flow. That copy
 * called supabase.auth.mfa.enroll() without an issuer, so it produced entries
 * labelled with the project's Site URL — "localhost:3000" — while the login
 * gate produced entries labelled "BharatOne". Two code paths meant one of them
 * kept the bug after the other was fixed. It also offered a Remove button to
 * accounts whose role requires a second factor, which the login gate would
 * immediately undo.
 *
 * Both problems disappear by having one component. TwoFactorCard reads the
 * requirement from the database, so it knows when removal must be refused.
 */
export function StaffSecurity() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <ShieldCheck className="h-5 w-5 text-india-green" /> Security &amp; two-factor authentication
        </h2>
        <p className="text-sm text-muted-foreground">
          An authenticator app on your phone, in addition to your password. To reset
          somebody else&apos;s, use User Management.
        </p>
      </div>
      <TwoFactorCard />
    </div>
  );
}
