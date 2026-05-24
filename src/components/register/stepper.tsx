import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { key: string; label: string; icon: LucideIcon };

export function Stepper({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2 px-1">
        {steps.map((s, i) => {
          const isDone = i < current;
          const isActive = i === current;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  isActive && "bg-primary text-primary-foreground shadow-sm",
                  isDone && "bg-[oklch(0.95_0.04_150)] text-[oklch(0.45_0.12_150)]",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6",
                    isDone ? "bg-[oklch(0.7_0.12_150)]" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}