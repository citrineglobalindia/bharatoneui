import { useEffect } from "react";
import { CheckCircle2, XCircle, Mail, Phone, Sparkles, X } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OtpSuccessChannel = "email" | "mobile" | "all";

export function OtpSuccessDialog({
  open,
  onOpenChange,
  channel,
  target,
  autoCloseMs = 2200,
  rejected = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: OtpSuccessChannel;
  target?: string;
  autoCloseMs?: number;
  rejected?: boolean;
}) {
  useEffect(() => {
    if (!open || !autoCloseMs || rejected) return;
    const t = setTimeout(() => onOpenChange(false), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onOpenChange, rejected]);

  const isEmail = channel === "email";
  const isMobile = channel === "mobile";
  const isAll = channel === "all";

  const title = rejected
    ? "Verification Failed"
    : isAll
    ? "All Verifications Successful!"
    : isEmail
      ? "Email Verified Successfully!"
      : "Mobile Verified Successfully!";
  const subtitle = rejected
    ? "We could not verify the code. Please check and try again."
    : isAll
    ? "Your email and mobile have been verified. You can continue to the next step."
    : isEmail
      ? "Your email address has been verified. One more step to go!"
      : "Your mobile number has been verified. One more step to go!";

  const Icon = isEmail ? Mail : isMobile ? Phone : Sparkles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm overflow-hidden rounded-3xl border-emerald-200/60 p-0 shadow-2xl [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Decorative top band */}
        <div className={`relative h-28 overflow-hidden ${rejected ? "bg-gradient-to-br from-rose-500 via-rose-400 to-rose-600" : "bg-gradient-to-br from-emerald-500 via-emerald-400 to-india-green"}`}>
          {/* sparkle dots */}
          <Sparkle className="left-6 top-4 animate-pulse" delay="0s" />
          <Sparkle className="right-8 top-6 animate-pulse" delay="0.3s" />
          <Sparkle className="left-1/3 bottom-3 animate-pulse" delay="0.6s" />
          <Sparkle className="right-1/4 bottom-6 animate-pulse" delay="0.9s" />

          {/* Ripple rings + check */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <span className={`absolute inset-0 -m-3 rounded-full animate-ping ${rejected ? "bg-rose-300/40" : "bg-emerald-300/40"}`} />
            <span className={`absolute inset-0 -m-1 rounded-full ${rejected ? "bg-rose-200/60" : "bg-emerald-200/60"}`} />
            <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-elev ring-4 ring-white">
              <span className={`inline-flex h-16 w-16 items-center justify-center rounded-full shadow-inner ${rejected ? "bg-gradient-to-br from-rose-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-india-green"}`}>
                {rejected ? <XCircle className="h-9 w-9 text-white animate-in zoom-in-50 duration-500" strokeWidth={2.5} /> : <CheckCircle2 className="h-9 w-9 text-white animate-in zoom-in-50 duration-500" strokeWidth={2.5} />}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-14 text-center">
          <div className="mb-3 flex justify-center"><BharatOneLogo size="md" /></div>
          <div className={`mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${rejected ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
            {rejected ? <XCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
            {rejected ? "Failed" : isAll ? "Complete" : isEmail ? "Email OTP" : "Mobile OTP"}
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {subtitle}
          </DialogDescription>

          {target && !isAll && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-[12px] font-semibold text-emerald-800">
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono">{target}</span>
            </div>
          )}

          <Button
            onClick={() => onOpenChange(false)}
            className={cn(
              "mt-5 h-10 w-full rounded-xl text-sm font-semibold shadow-elev",
              rejected
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : isAll
                ? "bg-saffron-gradient text-white hover:opacity-95"
                : "bg-india-green text-white hover:bg-india-green/90",
            )}
          >
            {rejected ? "Try Again" : isAll ? "Continue" : "Got it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Sparkle({ className, delay }: { className?: string; delay?: string }) {
  return (
    <span
      className={cn("absolute h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]", className)}
      style={{ animationDelay: delay }}
    />
  );
}