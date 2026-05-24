import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary";

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
    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5 shadow-soft">
      <h3 className="font-display flex items-center gap-2 text-base font-bold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
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
  const cls =
    tone === "warn"
      ? "border-[oklch(0.85_0.12_75)] bg-[oklch(0.97_0.05_75)] text-[oklch(0.4_0.1_60)]"
      : "border-accent bg-accent/40 text-foreground";
  return (
    <div className={`rounded-lg border ${cls} px-4 py-3 text-sm`}>
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function StepHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div>
      <h2 className="font-display flex items-center gap-2.5 text-xl sm:text-2xl font-bold text-foreground">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev">
          {icon}
        </span>
        {title}
      </h2>
      <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground">{description}</p>
    </div>
  );
}