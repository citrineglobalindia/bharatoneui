import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenCheck,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession, withTimeout } from "@/integrations/supabase/ensure-session";
import { useSort, SortTh } from "@/components/ui/sortable";
import {
  REGISTRATION_PAYMENTS,
  WALLET_REQUESTS,
  WITHDRAWALS,
  MAIN_ACCOUNT_RECHARGES,
  inr,
} from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/ledger")({
  head: () => ({ meta: [{ title: "Ledger — BharatOne Accountant" }] }),
  component: LedgerPage,
});

type Direction = "credit" | "debit";
type Category = "Registration" | "Wallet Recharge" | "Withdrawal" | "Main Recharge";

interface LedgerEntry {
  id: string;
  date: string;
  category: Category;
  direction: Direction;
  party: string;
  role: string;
  method: string;
  reference: string;
  amount: number;
  status: string;
}

function buildLedger(): LedgerEntry[] {
  const rows: LedgerEntry[] = [];
  REGISTRATION_PAYMENTS.forEach((r) =>
    rows.push({
      id: r.id,
      date: r.submittedAt,
      category: "Registration",
      direction: "credit",
      party: r.name,
      role: r.role,
      method: r.method,
      reference: r.utr,
      amount: r.amount + r.gst,
      status: r.status,
    }),
  );
  WALLET_REQUESTS.forEach((r) =>
    rows.push({
      id: r.id,
      date: r.requestedAt,
      category: "Wallet Recharge",
      direction: "credit",
      party: r.name,
      role: r.role,
      method: r.method,
      reference: r.utr,
      amount: r.amount,
      status: r.status,
    }),
  );
  WITHDRAWALS.forEach((r) =>
    rows.push({
      id: r.id,
      date: r.requestedAt,
      category: "Withdrawal",
      direction: "debit",
      party: r.name,
      role: r.role,
      method: "Bank Transfer",
      reference: r.accountNo,
      amount: r.amount,
      status: r.status,
    }),
  );
  MAIN_ACCOUNT_RECHARGES.forEach((r) =>
    rows.push({
      id: r.id,
      date: r.date,
      category: "Main Recharge",
      direction: "credit",
      party: r.source,
      role: "Company",
      method: r.method,
      reference: r.reference,
      amount: r.amount,
      status: r.status,
    }),
  );
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

const ALL_ENTRIES = buildLedger();
const CATEGORIES: (Category | "All")[] = ["All", "Registration", "Wallet Recharge", "Withdrawal", "Main Recharge"];
const DIRECTIONS: (Direction | "all")[] = ["all", "credit", "debit"];
const STATUSES = ["All", "Pending", "Approved", "Rejected", "Credited", "Received"];

function LedgerPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [direction, setDirection] = useState<Direction | "all">("all");
  const [status, setStatus] = useState("All");
  const [realRows, setRealRows] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      await ensureStaffSession();
      const db = supabase as any;
      const [led, rzp, rech, users] = await Promise.all([
        db.from("ledger_entries").select("*").order("created_at", { ascending: false }),
        db.from("razorpay_payments").select("id,user_id,amount,status,payment_id,wallet_recharge_id,created_at").in("status", ["paid", "credited"]).order("created_at", { ascending: false }),
        db.from("wallet_recharges").select("id,user_id,amount,method,wallet_recharge_id,created_at").order("created_at", { ascending: false }),
        db.rpc("admin_list_users"),
      ]);
      if (!on) return;

      const names: Record<string, string> = {};
      for (const u of (users.data as any[]) ?? []) names[u.id] = u.display_name || u.email || "Retailer";
      const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

      const collected: (LedgerEntry & { _ts: number })[] = [];

      for (const e of (led.data as any[]) ?? []) {
        collected.push({
          id: e.application_id || e.id, _ts: new Date(e.created_at).getTime(), date: fmt(e.created_at),
          category: "Registration", direction: (e.direction || "credit") as Direction,
          party: e.retailer_name || "—", role: "Retailer", method: e.payment_method || "—",
          reference: e.utr || "—", amount: e.amount || 0, status: "Credited",
        });
      }
      // Razorpay wallet recharges — reflect the amount once a payment is completed.
      for (const p of (rzp.data as any[]) ?? []) {
        collected.push({
          id: p.wallet_recharge_id || p.payment_id || p.id, _ts: new Date(p.created_at).getTime(), date: fmt(p.created_at),
          category: "Wallet Recharge", direction: "credit",
          party: p.user_id ? (names[p.user_id] ?? "Retailer") : "—", role: "Retailer", method: "Razorpay",
          reference: p.payment_id || p.wallet_recharge_id || "—", amount: Number(p.amount) || 0,
          status: p.status === "credited" ? "Credited" : "Received",
        });
      }
      // Manual accountant wallet recharges.
      for (const r of (rech.data as any[]) ?? []) {
        collected.push({
          id: r.wallet_recharge_id || r.id, _ts: new Date(r.created_at).getTime(), date: fmt(r.created_at),
          category: "Wallet Recharge", direction: "credit",
          party: r.user_id ? (names[r.user_id] ?? "Retailer") : "—", role: "Retailer", method: r.method || "Manual",
          reference: r.wallet_recharge_id || "—", amount: Number(r.amount) || 0, status: "Credited",
        });
      }

      collected.sort((a, b) => b._ts - a._ts);
      setRealRows(collected.map(({ _ts, ...rest }) => rest));
    })();
    return () => { on = false; };
  }, []);

  const entries = useMemo(() => realRows, [realRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (direction !== "all" && e.direction !== direction) return false;
      if (status !== "All" && e.status !== status) return false;
      if (q && ![e.id, e.party, e.reference, e.method, e.role].some((v) => v.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [entries, query, category, direction, status]);

  const { sorted, sort, toggle } = useSort(filtered, (e: LedgerEntry, key) => {
    switch (key) {
      case "entry": return e.id;
      case "category": return e.category;
      case "party": return e.party;
      case "methodref": return `${e.method} ${e.reference}`;
      case "amount": return Number(e.amount || 0);
      case "status": return e.status;
      default: return "";
    }
  });

  const totals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    filtered.forEach((e) => {
      if (e.direction === "credit") credit += e.amount;
      else debit += e.amount;
    });
    return { credit, debit, net: credit - debit, count: filtered.length };
  }, [filtered]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("No rows to export");
      return;
    }
    const header = ["ID", "Date", "Category", "Direction", "Party", "Role", "Method", "Reference", "Amount", "Status"];
    const lines = filtered.map((e) =>
      [e.id, e.date, e.category, e.direction, e.party, e.role, e.method, e.reference, e.amount, e.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bharatone-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ledger exported", { description: `${filtered.length} entries downloaded` });
  };

  // Full wallet-statement export with the requested column layout. Columns we
  // don't track yet are exported blank so the file format stays consistent.
  const exportStatement = async () => {
    try {
      await ensureStaffSession();
      const db2 = supabase as any;
      const [tx, users] = await Promise.all([
        db2.from("wallet_transactions").select("user_id, direction, amount, balance_after, reason, ref_type, ref_id, created_at").order("created_at", { ascending: false }).limit(10000),
        db2.rpc("admin_list_users"),
      ]);
      const names: Record<string, string> = {};
      for (const u of (users.data as any[]) ?? []) names[u.id] = u.display_name || u.email || "";
      const rows = (tx.data as any[]) ?? [];
      if (!rows.length) { toast.error("No wallet transactions to export"); return; }

      const HEADERS = [
        "Sl.no", "User Name", "Old JSKO Id", "New JSKO ID", "Full Name", "Pan", "District", "Taluka", "Hobli", "Gram Panchayat",
        "Opening Wallet", "CR amount", "DR Amount", "Closing Wallet", "Type", "Service Amount", "SP Amount", "Deduction Amount",
        "GST", "TDS", "Reference Table", "Reference Id", "Order Id", "Tracking id", "Service Department", "Service", "Remarks", "Date & Time",
      ];
      const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = rows.map((t, i) => {
        const isCr = String(t.direction).toLowerCase().startsWith("c");
        const amt = Number(t.amount) || 0;
        const closing = Number(t.balance_after) || 0;
        const opening = isCr ? closing - amt : closing + amt;
        return [
          i + 1, names[t.user_id] || "", "", "", "", "", "", "", "", "",
          opening.toFixed(2), isCr ? amt.toFixed(2) : "", isCr ? "" : amt.toFixed(2), closing.toFixed(2),
          isCr ? "Credit" : "Debit", "", "", "", "", "",
          t.ref_type || "", t.ref_id || "", "", "", "", "", t.reason || "", fmt(t.created_at),
        ].map(esc).join(",");
      });
      const csv = [HEADERS.map(esc).join(","), ...lines].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bharatone-wallet-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Wallet statement exported", { description: `${rows.length} transactions` });
    } catch (e) {
      toast.error("Export failed", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const reset = () => {
    setQuery("");
    setCategory("All");
    setDirection("all");
    setStatus("All");
  };

  return (
    <AccountantShell>
      <div className="space-y-6">
        <PageHeader
          icon={<BookOpenCheck className="h-5 w-5" />}
          title="Financial Ledger"
          subtitle="Unified record of registrations, wallet recharges, withdrawals and main account funding"
          badge={<StatusBadge status="Live" />}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportStatement} className="gap-2">
                <Download className="h-4 w-4" /> Export Statement
              </Button>
              <Button onClick={exportCsv} className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Credit" value={inr(totals.credit)} tone="green" />
          <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Total Debit" value={inr(totals.debit)} tone="rose" />
          <StatCard icon={<Scale className="h-5 w-5" />} label="Net Position" value={inr(totals.net)} tone="violet" />
          <StatCard icon={<BookOpenCheck className="h-5 w-5" />} label="Entries" value={String(totals.count)} tone="sky" />
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-soft space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:bg-white px-3 h-10 transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, party, reference, method…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroup label="Category" options={CATEGORIES} value={category} onChange={(v) => setCategory(v as Category | "All")} />
            <FilterGroup label="Flow" options={DIRECTIONS} value={direction} onChange={(v) => setDirection(v as Direction | "all")} />
            <FilterGroup label="Status" options={STATUSES} value={status} onChange={setStatus} />
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto text-muted-foreground">
              Reset filters
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <SortTh className="px-4 py-3" label="Entry" sortKey="entry" sort={sort} onSort={toggle} />
                  <SortTh className="px-4 py-3" label="Category" sortKey="category" sort={sort} onSort={toggle} />
                  <SortTh className="px-4 py-3" label="Party" sortKey="party" sort={sort} onSort={toggle} />
                  <SortTh className="px-4 py-3" label="Method · Reference" sortKey="methodref" sort={sort} onSort={toggle} />
                  <SortTh className="px-4 py-3 text-right" label="Amount" sortKey="amount" sort={sort} onSort={toggle} />
                  <SortTh className="px-4 py-3" label="Status" sortKey="status" sort={sort} onSort={toggle} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((e) => (
                  <tr key={`${e.category}-${e.id}`} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-slate-900">{e.id}</p>
                      <p className="text-[11px] text-muted-foreground">{e.date}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-border bg-slate-50 px-2 py-0.5 text-[11px] font-semibold">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{e.party}</p>
                      <p className="text-[11px] text-muted-foreground">{e.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700">{e.method}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{e.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                          e.direction === "credit" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {e.direction === "credit" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {e.direction === "credit" ? "+" : "−"}
                        {inr(e.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No ledger entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AccountantShell>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
              value === opt ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}