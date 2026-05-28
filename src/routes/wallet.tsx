import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, Plus, ArrowDownToLine, ArrowUpFromLine, X, Download } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { SectionCard, Field, Input, Select, PrimaryButton, GhostButton } from "@/components/retailer/section-card";
import { MOCK_TXNS, inr, type Txn } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — BharatOne" }] }),
  component: WalletPage,
});

type LedgerRow = Txn & { kind: "credit" | "debit"; running: number };

function buildLedger(opening: number): LedgerRow[] {
  let bal = opening;
  return MOCK_TXNS.slice(0, 8).map((t, i) => {
    const kind: "credit" | "debit" = i % 3 === 0 ? "credit" : "debit";
    const delta = kind === "credit" ? t.commission : -t.amount;
    bal = bal + delta;
    return { ...t, kind, running: bal };
  });
}

const cols: Column<LedgerRow>[] = [
  { key: "date", header: "Date", cell: (r) => <span className="text-xs">{r.date}</span> },
  { key: "service", header: "Description", cell: (r) => r.service },
  {
    key: "amount",
    header: "Debit / Credit",
    cell: (r) =>
      r.kind === "credit" ? (
        <span className="font-semibold text-emerald-700">+ {inr(r.commission)}</span>
      ) : (
        <span className="font-semibold text-rose-700">- {inr(r.amount)}</span>
      ),
    className: "text-right",
  },
  { key: "balance", header: "Balance", cell: (r) => <span className="font-mono text-sm">{inr(r.running)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function WalletPage() {
  const [balance, setBalance] = useState(12480);
  const [pending, setPending] = useState(264.07);
  const [settledToday, setSettledToday] = useState(0);
  const [modal, setModal] = useState<null | "load" | "settle" | "transfer">(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const ledger = buildLedger(balance);

  function reset() {
    setAmount("");
    setModal(null);
  }

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v < 500) return toast.error("Minimum top-up is ₹500");
    setBalance((b) => b + v);
    toast.success(`₹${v.toLocaleString("en-IN")} loaded via ${method}`);
    reset();
  }

  function handleSettle(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v <= 0) return toast.error("Enter a valid amount");
    if (v > pending) return toast.error("Amount exceeds pending settlement");
    setPending((p) => p - v);
    setSettledToday((s) => s + v);
    setBalance((b) => b + v);
    toast.success(`Settlement of ₹${v.toLocaleString("en-IN")} initiated to your bank`);
    reset();
  }

  function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v <= 0) return toast.error("Enter a valid amount");
    if (v > balance) return toast.error("Insufficient wallet balance");
    setBalance((b) => b - v);
    toast.success(`₹${v.toLocaleString("en-IN")} transferred successfully`);
    reset();
  }

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Wallet className="h-5 w-5" />}
          title="My Wallet"
          subtitle="Manage your retailer wallet, load funds and view ledger"
          actions={
            <button
              onClick={() => toast.success("Statement (PDF) downloaded")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Statement
            </button>
          }
        />

        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Available Balance</p>
            <p className="font-display text-4xl font-extrabold mt-1">{inr(balance)}</p>
            <p className="text-xs opacity-90">Updated just now</p>
            <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
              <button onClick={() => setModal("load")} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><Plus className="h-3.5 w-3.5" /> Load</button>
              <button onClick={() => setModal("settle")} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><ArrowDownToLine className="h-3.5 w-3.5" /> Settle</button>
              <button onClick={() => setModal("transfer")} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1"><ArrowUpFromLine className="h-3.5 w-3.5" /> Transfer</button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <StatCard label="Settled Today" value={inr(settledToday)} icon={<ArrowDownToLine className="h-5 w-5" />} tone="green" />
            <StatCard label="Pending Settlement" value={inr(pending)} icon={<Wallet className="h-5 w-5" />} tone="violet" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <SectionCard title="Load Wallet" description="Add funds via UPI / Net Banking / Card">
            <form onSubmit={handleLoad} className="space-y-3">
              <Field label="Amount (₹)" hint="Min ₹500">
                <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <div className="flex gap-2 flex-wrap">
                {[500, 1000, 2000, 5000].map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className="px-2.5 py-1 rounded-full bg-muted text-xs font-semibold hover:bg-muted/70"
                  >
                    ₹{q.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
              <Field label="Method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>UPI</option>
                  <option>Net Banking</option>
                  <option>Debit Card</option>
                </Select>
              </Field>
              <PrimaryButton type="submit" className="w-full">Continue to Pay</PrimaryButton>
            </form>
          </SectionCard>
          <div className="lg:col-span-2">
            <SectionCard
              title="Recent Ledger"
              description="Latest credits and debits"
              action={
                <GhostButton onClick={() => toast.success("Ledger refreshed")}>
                  Refresh
                </GhostButton>
              }
            >
              <DataTable columns={cols} rows={ledger} />
            </SectionCard>
          </div>
        </div>

        {modal && (
          <ActionModal
            title={modal === "load" ? "Load Wallet" : modal === "settle" ? "Settle to Bank" : "Transfer Funds"}
            subtitle={
              modal === "load"
                ? "Add money to your BharatOne wallet"
                : modal === "settle"
                ? `Pending settlement: ${inr(pending)}`
                : `Available balance: ${inr(balance)}`
            }
            onClose={reset}
          >
            <form
              onSubmit={modal === "load" ? handleLoad : modal === "settle" ? handleSettle : handleTransfer}
              className="space-y-3"
            >
              <Field label="Amount (₹)">
                <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </Field>
              {modal === "load" && (
                <Field label="Method">
                  <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option>UPI</option>
                    <option>Net Banking</option>
                    <option>Debit Card</option>
                  </Select>
                </Field>
              )}
              {modal === "settle" && (
                <Field label="Bank Account">
                  <Select>
                    <option>HDFC Bank ••4421</option>
                    <option>SBI ••8801</option>
                  </Select>
                </Field>
              )}
              {modal === "transfer" && (
                <>
                  <Field label="Beneficiary">
                    <Input placeholder="Mobile / VPA / Account number" />
                  </Field>
                  <Field label="Mode">
                    <Select>
                      <option>UPI</option>
                      <option>IMPS</option>
                      <option>Wallet-to-Wallet</option>
                    </Select>
                  </Field>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <GhostButton type="button" onClick={reset}>Cancel</GhostButton>
                <PrimaryButton type="submit">Confirm</PrimaryButton>
              </div>
            </form>
          </ActionModal>
        )}
      </div>
    </RetailerShell>
  );
}

function ActionModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}