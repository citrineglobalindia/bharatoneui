import type { ReactNode } from "react";

export function PageHeader({
  icon,
  title,
  subtitle,
  badge,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="h-11 w-11 rounded-xl bg-saffron-gradient text-white flex items-center justify-center shadow-elev shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-extrabold truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    "In Review": "bg-amber-100 text-amber-800 border-amber-200",
    "In Progress": "bg-amber-100 text-amber-800 border-amber-200",
    "Documents Pending": "bg-sky-100 text-sky-700 border-sky-200",
    Open: "bg-sky-100 text-sky-700 border-sky-200",
    failed: "bg-rose-100 text-rose-700 border-rose-200",
    Rejected: "bg-rose-100 text-rose-700 border-rose-200",
    High: "bg-rose-100 text-rose-700 border-rose-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    Low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const cls = map[status] ?? "bg-muted text-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}