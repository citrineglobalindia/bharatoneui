import { useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// Shared client-side sorting used across every portal table.
// - useSort(rows, accessor): returns { sorted, sort, toggle }. Click a header to
//   sort ascending, again for descending, a third time to clear.
// - SortTh: a <th> with a clickable label + up/down arrow indicator.
// Values are compared smartly: numbers (₹, %, commas stripped), then dates,
// then natural string order.

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;

const numRe = /^-?[₹$]?\s?-?[\d,]+(\.\d+)?%?$/;
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").trim();
  if (!s || !numRe.test(s)) return null;
  const n = parseFloat(s.replace(/[₹$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function toTime(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  const s = String(v ?? "").trim();
  if (!s || /^\d+$/.test(s) || s.length < 6) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
export function compareValues(a: unknown, b: unknown): number {
  const an = toNum(a), bn = toNum(b);
  if (an != null && bn != null) return an - bn;
  const at = toTime(a), bt = toTime(b);
  if (at != null && bt != null) return at - bt;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

export function useSort<T>(rows: T[], accessor: (row: T, key: string) => unknown, initial: SortState = null) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (key: string) =>
    setSort((s) => (s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(accessor(a, sort.key), accessor(b, sort.key)) * dir);
  }, [rows, sort, accessor]);
  return { sorted, sort, toggle };
}

// Per-column filtering: keeps a { columnKey: value } map and filters rows where
// each active column's value equals the chosen dropdown value. `apply` also
// captures the rows+accessor so <FilterTh/> can offer that column's distinct
// values as a dropdown (call cf.optionsFor(key)).
export function useColumnFilters<T>() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const dataRef = useRef<{ rows: T[]; acc: (r: T, k: string) => unknown }>({ rows: [], acc: () => "" });
  const setFilter = (key: string, v: string) => setFilters((f) => ({ ...f, [key]: v }));
  const clear = () => setFilters({});
  const anyActive = Object.values(filters).some((v) => v.trim());
  const apply = (rows: T[], accessor: (row: T, key: string) => unknown) => {
    dataRef.current = { rows, acc: accessor };
    const active = Object.entries(filters).filter(([, v]) => v.trim());
    if (!active.length) return rows;
    return rows.filter((r) => active.every(([k, v]) => String(accessor(r, k) ?? "").trim().toLowerCase() === v.trim().toLowerCase()));
  };
  const optionsFor = (key: string): string[] => {
    const set = new Set<string>();
    for (const r of dataRef.current.rows) { const val = String(dataRef.current.acc(r, key) ?? "").trim(); if (val) set.add(val); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  };
  return { filters, setFilter, clear, anyActive, apply, optionsFor };
}

export function FilterTh({
  filterKey, filters, setFilter, optionsFor, className = "",
}: {
  filterKey?: string;
  filters: Record<string, string>;
  setFilter: (key: string, v: string) => void;
  optionsFor?: (key: string) => string[];
  className?: string;
}) {
  if (!filterKey) return <th className={className} />;
  const opts = optionsFor ? optionsFor(filterKey) : [];
  const cls = "h-7 w-full min-w-[80px] rounded border border-border bg-background px-1.5 text-xs font-normal normal-case tracking-normal text-foreground outline-none focus:ring-1 focus:ring-india-green/40";
  // With options → dropdown; without (not yet wired) → text box fallback.
  if (opts.length === 0 && !optionsFor) {
    return <th className={className}><input value={filters[filterKey] ?? ""} onChange={(e) => setFilter(filterKey, e.target.value)} placeholder="Filter…" className={cls} /></th>;
  }
  return (
    <th className={className}>
      <select value={filters[filterKey] ?? ""} onChange={(e) => setFilter(filterKey, e.target.value)} className={cls}>
        <option value="">All</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </th>
  );
}

export function SortTh({
  label, sortKey, sort, onSort, className = "", children,
}: {
  label?: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const active = sort?.key === sortKey;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title="Click to sort"
        className={`group inline-flex items-center gap-1 whitespace-nowrap rounded px-1 -mx-1 font-[inherit] tracking-[inherit] transition-colors hover:text-foreground ${active ? "text-india-green" : ""}`}
      >
        <span>{children ?? label}</span>
        {active
          ? (sort!.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-india-green" /> : <ArrowDown className="h-3.5 w-3.5 text-india-green" />)
          : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-foreground" />}
      </button>
    </th>
  );
}
