import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { key: string; label: string; icon: LucideIcon };

export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <div className="space-y-3">
      {/* Mobile: compact "Step x of n" */}
      <div className="flex items-center justify-between sm:hidden">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step {current + 1} of {steps.length}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-saffron-gradient px-3 py-1 text-xs font-semibold text-white">
          {(() => {
            const Icon = steps[current].icon;
            return <Icon className="h-3.5 w-3.5" />;
          })()}
          {steps[current].label}
        </div>
      </div>

      {/* Desktop: full pill row */}
      <div className="-mx-2 hidden overflow-x-auto px-2 sm:block">
        <div className="flex min-w-max items-center gap-2">
          {steps.map((s, i) => {
            const isDone = i < current;
            const isActive = i === current;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-all",
                    isActive && "bg-saffron-gradient text-white shadow-elev",
                    isDone && "bg-secondary text-india-green",
                    !isActive && !isDone && "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-6 transition-colors",
                      isDone ? "bg-india-green" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar (always visible) */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-saffron-gradient transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}