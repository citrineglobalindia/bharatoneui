import { useMemo, useState } from "react";
import {
  ArrowUpFromLine, CheckCircle2, Download, Landmark, ReceiptText,
  Search, Wallet, XCircle, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "Pending" | "Approved" | "Rejected";
type Row = { id: string; party: string; type: string; amount: string; method: string; status: Status; date: string };

const KPI: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[] = [
  { label: "Wallet recharge today", value: "₹18.4L", detail: "42 requests", icon: Wallet, tone: "bg-admin-soft text-admin" },
  { label: "Withdrawals pending", value: "₹6.2L", detail: "17 awaiting payout", icon: ArrowUpFromLine, tone: "bg-admin-warning-soft text-admin-warning" },
  { label: "Settled today", value: "₹41.8L", detail: "Karnataka + TN batches", icon: Landmark, tone: "bg-admin-success-soft text-admin-success" },
  { label: "Ledger variance", value: "₹12,480", detail: "1 batch flagged", icon: ReceiptText, tone: "bg-admin-danger-soft text-admin-danger" },
];

const SEED: Row[] = [
  { id: "WR-5521", party: "Shree Balaji Store", type: "Wallet recharge", amount: "₹50,000", method: "NEFT", status: "Pending", date: "Today 11:20" },
  { id: "WD-3390", party: "Kaveri Digital", type: "Withdrawal", amount: "₹24,000", method: "IMPS", status: "Pending", date: "Today 10:48" },
  { id: "WR-5519", party: "Vijaya Services", type: "Wallet recharge", amount: "₹1,20,000", method: "RTGS", status: "Approved", date: "Today 09:35" },
  { id: "ST-0041", party: "Karnataka batch", type: "Settlement", amount: "₹12,40,000", method: "Auto", status: "Pending", date: "Today 08:10" },
  { id: "WD-3388", party: "Namma One Center", type: "Withdrawal", amount: "₹8,500", method: "UPI", status: "Rejected", date: "Yesterday 18:02" },
  { id: "WR-5512", party: "Hubballi Mart", type: "Wallet recharge", amount: "₹35,000", method: "NEFT", status: "Approved", date: "Yesterday 16:44" },
];

const STATUS_TONE: Record<Status, string> = {
  Pending: "bg-admin-warning-soft text-admin-warning",
  Approved: "bg-admin-success-soft text-admin-success",
  Rejected: "bg-admin-danger-soft text-admin-danger",
};

export function AccountantOperations() {
  const [rows, setRows] = useState<Row[]>(SEED);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchTab = tab === "All" || r.type.includes(tab);
      const matchQ = !t || `${r.id} ${r.party} ${r.type}`.toLowerCase().includes(t);
      return matchTab && matchQ;
    });
  }, [rows, tab, query]);

  const setStatus = (id: string, status: Status) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success(`${id} ${status.toLowerCase()}`);
  };

  const exportRows = () => {
    downloadCsv("accountant-operations.csv", ["ID", "Party", "Type", "Amount", "Method", "Status", "Date"],
      rows.map((r) => [r.id, r.party, r.type, r.amount, r.method, r.status, r.date]));
    toast.success("Finance ledger exported");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((k) => { const Icon = k.icon; return (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", k.tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{k.value}</p><p className="mt-1 text-[10px] font-semibold text-muted-foreground">{k.detail}</p>
          </div>
        ); })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="All">All</TabsTrigger><TabsTrigger value="recharge">Recharges</TabsTrigger><TabsTrigger value="Withdrawal">Withdrawals</TabsTrigger><TabsTrigger value="Settlement">Settlements</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportRows}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left">
          <thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Reference", "Party", "Type", "Amount", "Method", "Status", "Action"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="text-[11px] transition hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-semibold">{r.id}</td>
                <td className="px-4 py-3"><p className="font-bold">{r.party}</p><p className="text-[9px] text-muted-foreground">{r.date}</p></td>
                <td className="px-4 py-3 font-semibold">{r.type}</td>
                <td className="px-4 py-3 font-extrabold">{r.amount}</td>
                <td className="px-4 py-3">{r.method}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", STATUS_TONE[r.status])}>{r.status}</span></td>
                <td className="px-4 py-3">{r.status === "Pending" ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-success" onClick={() => setStatus(r.id, "Approved")}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-danger" onClick={() => setStatus(r.id, "Rejected")}><XCircle className="h-3 w-3" /> Reject</Button>
                  </div>
                ) : <span className="text-[10px] text-muted-foreground">Closed</span>}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="px-4 py-16 text-center text-xs text-muted-foreground">No finance records match.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}