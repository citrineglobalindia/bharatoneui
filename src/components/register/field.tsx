import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Info, AlertTriangle } from "lucide-react";

export function Field({
  label,
  required,
  hint,
  icon,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground flex items-center gap-1.5">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[15px] sm:text-sm placeholder:text-muted-foreground shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary";

export function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3.5 sm:p-5 shadow-soft">
      <h3 className="font-display flex items-center gap-2 text-[15px] sm:text-base font-bold text-foreground leading-tight">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 break-words">{title}</span>
      </h3>
      <div className="mt-3.5 space-y-3.5 sm:space-y-4">{children}</div>
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const isWarn = tone === "warn";
  const cls = isWarn
    ? "border-[oklch(0.85_0.12_75)] bg-[oklch(0.97_0.05_75)]"
    : "border-primary/20 bg-primary/5";
  const Icon = isWarn ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${cls} px-3.5 py-3 text-sm`}>
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          isWarn ? "bg-[oklch(0.92_0.1_75)] text-[oklch(0.45_0.15_60)]" : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
        <div className="text-[13px] leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export function StepHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="-mt-1">
      <h2 className="font-display flex items-start gap-2.5 text-lg sm:text-2xl font-bold text-foreground leading-tight">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
          {icon}
        </span>
        <span className="pt-1 sm:pt-0.5">{title}</span>
      </h2>
      <p className="mt-2 text-[13px] sm:text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}