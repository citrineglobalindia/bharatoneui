import { useMemo, useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { compareValues } from "@/components/ui/sortable";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Explicitly enable/disable sorting on this column. Defaults to on for
   *  columns with a non-empty text header when the table sorts itself. */
  sortable?: boolean;
  /** Value used for sorting this column. Defaults to (row as any)[key]. */
  sortAccessor?: (row: T) => unknown;
};

export function DataTable<T>({
  columns,
  rows,
  empty = "No records found.",
  sort,
  onSort,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  // Controlled sorting (parent owns state). When omitted, the table sorts itself.
  sort?: { key: string; dir: "asc" | "desc" };
  onSort?: (key: string) => void;
}) {
  const controlled = !!onSort;
  const [iSort, setISort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const activeSort = controlled ? sort ?? null : iSort;
  const handleSort = (key: string) => {
    if (controlled) { onSort!(key); return; }
    setISort((s) => (s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  };
  const isSortable = (c: Column<T>) =>
    c.sortable === true ||
    (c.sortable !== false && !controlled && typeof c.header === "string" && (c.header as string).trim() !== "");
  const accessorFor = (c: Column<T>) => (r: T) => (c.sortAccessor ? c.sortAccessor(r) : (r as any)[c.key]);

  const view = useMemo(() => {
    if (controlled || !iSort) return rows;
    const c = columns.find((x) => x.key === iSort.key);
    if (!c) return rows;
    const acc = accessorFor(c);
    const dir = iSort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(acc(a), acc(b)) * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, iSort, controlled, columns]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${c.className ?? ""}`}>
                  {isSortable(c) ? (
                    <button type="button" onClick={() => handleSort(c.key)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground transition-colors">
                      {c.header}
                      {activeSort?.key === c.key
                        ? (activeSort.dir === "asc" ? <ArrowUp className="h-3 w-3 text-india-green" /> : <ArrowDown className="h-3 w-3 text-india-green" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              view.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
