import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";

// Reusable advanced filter (text search + From/To date range) + filtered export
// used across portal tables. Pair useTableFilter() with <TableToolbar/> and
// exportRowsToCsv() so every list filters and exports the same way.

export function useTableFilter<T>(
  rows: T[],
  opts: { text?: (r: T) => (string | number | null | undefined)[]; date?: (r: T) => string | null | undefined },
) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = from ? new Date(from + "T00:00:00").getTime() : null;
    const t = to ? new Date(to + "T23:59:59").getTime() : null;
    return rows.filter((r) => {
      if ((f || t) && opts.date) {
        const d = opts.date(r);
        const dm = d ? new Date(d).getTime() : NaN;
        if (!Number.isNaN(dm)) {
          if (f && dm < f) return false;
          if (t && dm > t) return false;
        }
      }
      if (q && opts.text) {
        const hay = opts.text(r).filter((x) => x != null).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, from, to]);
  return { filtered, query, setQuery, from, setFrom, to, setTo };
}

export function exportRowsToCsv<T>(rows: T[], columns: { header: string; value: (r: T) => unknown }[], filename: string) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "﻿" + columns.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TableToolbar({
  query, setQuery, from, setFrom, to, setTo, onExport, showDate = true, placeholder = "Search…", right,
}: {
  query: string;
  setQuery: (v: string) => void;
  from?: string;
  setFrom?: (v: string) => void;
  to?: string;
  setTo?: (v: string) => void;
  onExport?: () => void;
  showDate?: boolean;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 h-9">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      {showDate && setFrom && setTo && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 h-9 text-xs">
          <span className="font-semibold text-muted-foreground">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" />
          <span className="font-semibold text-muted-foreground">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" />
          {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Clear</button>}
        </div>
      )}
      {right}
      {onExport && (
        <button onClick={onExport} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-sm font-semibold text-white hover:bg-india-green/90">
          <Download className="h-4 w-4" /> Export
        </button>
      )}
    </div>
  );
}
