import { ShieldAlert, Phone, Mail, X } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

/**
 * Shown when someone with the correct password is nonetheless not allowed in.
 *
 * The restriction is enforced by the auth server (auth.users.banned_until), so
 * by the time this appears no session exists and nothing was handed over. This
 * screen only explains what happened.
 *
 * Deliberately says "restricted", not "suspended", "banned" or "blocked". The
 * common case is an administrator pausing an account while something is sorted
 * out — a device gone missing, a query on a wallet, someone between roles — and
 * the wording somebody reads at their counter, in front of a customer, should
 * not sound like an accusation.
 *
 * It also does not say WHY. The reason an administrator typed is for the audit
 * trail, not for a login screen that anybody holding the password can reach.
 */
export function isRestrictedError(err: unknown): boolean {
  const m = (err as { message?: string } | null)?.message ?? String(err ?? "");
  const code = (err as { code?: string } | null)?.code ?? "";
  return /user is banned|user_banned|banned/i.test(m) || /user_banned/i.test(code);
}

export function AccessRestrictedDialog({
  onClose,
  supportPhone = "+91 9071100311",
  supportEmail = "help@mybharatone.com",
}: {
  onClose: () => void;
  supportPhone?: string;
  supportEmail?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-label="Access restricted"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-elev animate-in fade-in zoom-in-95 duration-300">
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />

        <div className="relative bg-gradient-to-br from-rose-50 via-white to-orange-50 px-6 pb-5 pt-5 text-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex justify-center">
            <BharatOneLogo size="md" />
          </div>
          <div className="mt-4 flex justify-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldAlert className="h-7 w-7" />
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 text-center">
          <h2 className="font-display text-lg font-extrabold text-foreground">
            Your access is restricted
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your username and password are correct, but this account has been
            put on hold by an administrator.
          </p>
          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] font-semibold text-foreground">
            Please contact the IT department to have it restored.
          </p>

          <div className="mt-4 space-y-2 text-left">
            <a
              href={`tel:${supportPhone.replace(/\s/g, "")}`}
              className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm transition hover:border-india-green hover:bg-india-green/5"
            >
              <Phone className="h-4 w-4 text-india-green" />
              <span className="font-semibold">{supportPhone}</span>
            </a>
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm transition hover:border-india-green hover:bg-india-green/5"
            >
              <Mail className="h-4 w-4 text-india-green" />
              <span className="font-semibold">{supportEmail}</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="mt-5 h-11 w-full rounded-xl bg-india-green text-sm font-semibold text-white transition hover:bg-india-green/90"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
