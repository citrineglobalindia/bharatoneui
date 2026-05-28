import type { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "saffron",
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon: ReactNode;
  tone?: "saffron" | "green" | "sky" | "violet" | "rose";
}) {
  const tones: Record<string, string> = {
    saffron: "bg-orange-500",
    green: "bg-emerald-600",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-extrabold mt-1.5">{value}</p>
          {delta && (
            <div className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${delta.positive ? "text-emerald-600" : "text-rose-600"}`}>
              {delta.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {delta.value}
            </div>
          )}
        </div>
        <div className={`h-10 w-10 rounded-xl ${tones[tone]} text-white flex items-center justify-center shadow-soft`}>
          {icon}
        </div>
      </div>
    </div>
  );
}