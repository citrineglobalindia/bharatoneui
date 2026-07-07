import { useMemo, useState } from "react";
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
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 font-inherit uppercase tracking-inherit hover:text-foreground transition-colors">
        {children ?? label}
        {active
          ? (sort!.dir === "asc" ? <ArrowUp className="h-3 w-3 text-india-green" /> : <ArrowDown className="h-3 w-3 text-india-green" />)
          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}
