import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Fingerprint, ShieldCheck, ArrowRight } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { BANKS, MOCK_TXNS, inr, type Txn } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/aeps")({
  head: () => ({ meta: [{ title: "AEPS — BharatOne" }, { name: "description", content: "Aadhaar Enabled Payment System." }] }),
  component: AepsPage,
});

const TX_TYPES = ["Cash Withdrawal", "Balance Enquiry", "Mini Statement", "Aadhaar Pay"];

const cols: Column<Txn>[] = [
  { key: "id", header: "Txn ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "customer", header: "Customer", cell: (r) => r.customer },
  { key: "amount", header: "Amount", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span>, className: "text-right" },
  { key: "commission", header: "Commission", cell: (r) => <span className="text-emerald-700 font-semibold">+{inr(r.commission)}</span>, className: "text-right" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function AepsPage() {
  const [type, setType] = useState(TX_TYPES[0]);
  const aepsTxns = MOCK_TXNS.filter((t) => t.service.startsWith("AEPS"));

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Banknote className="h-5 w-5" />}
          title="AEPS — Aadhaar Enabled Payment"
          subtitle="Cash withdrawal, balance enquiry & Aadhaar Pay using biometric authentication"
          badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold"><ShieldCheck className="h-3 w-3" /> Active</span>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today's Withdrawals" value={inr(48200)} icon={<Banknote className="h-5 w-5" />} tone="sky" delta={{ value: "+8.2%", positive: true }} />
          <StatCard label="Today's Commission" value={inr(124.5)} icon={<Banknote className="h-5 w-5" />} tone="green" />
          <StatCard label="Successful Txns" value="38" icon={<ShieldCheck className="h-5 w-5" />} tone="violet" />
          <StatCard label="Failed" value="2" icon={<Banknote className="h-5 w-5" />} tone="rose" />
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <SectionCard title="New AEPS Transaction" description="Connect Morpho / Mantra / Startek device and capture customer fingerprint">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("AEPS request initiated — capture fingerprint on device.");
                }}
                className="grid sm:grid-cols-2 gap-3"
              >
                <Field label="Transaction Type">
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    {TX_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Customer Bank">
                  <Select>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label="Aadhaar Number" hint="12 digits · masked in receipts">
                  <Input placeholder="XXXX XXXX XXXX" maxLength={14} />
                </Field>
                <Field label="Customer Mobile">
                  <Input placeholder="10-digit mobile" maxLength={10} />
                </Field>
                {type === "Cash Withdrawal" && (
                  <Field label="Amount (₹)" hint="Min ₹100 · Max ₹10,000 per txn">
                    <Input type="number" placeholder="0" />
                  </Field>
                )}
                <Field label="Biometric Device">
                  <Select>
                    <option>Morpho MSO 1300 E3</option>
                    <option>Mantra MFS100</option>
                    <option>Startek FM220U</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2 flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> RBI-licensed · NPCI certified
                  </p>
                  <PrimaryButton type="submit">
                    <Fingerprint className="h-4 w-4" /> Capture & Proceed <ArrowRight className="h-4 w-4" />
                  </PrimaryButton>
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <SectionCard title="Daily Limits">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-muted-foreground">Withdrawal limit</span><span className="font-semibold">{inr(50000)}</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Used today</span><span className="font-semibold text-saffron">{inr(48200)}</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Per transaction</span><span className="font-semibold">{inr(10000)}</span></li>
                <li className="pt-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-saffron-gradient" style={{ width: "96%" }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">96% of daily limit used</p>
                </li>
              </ul>
            </SectionCard>
            <SectionCard title="Commission Slabs">
              <ul className="space-y-1.5 text-sm">
                <li className="flex justify-between"><span className="text-muted-foreground">₹100 – ₹1,000</span><span className="font-semibold">₹2.50</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">₹1,001 – ₹3,000</span><span className="font-semibold">₹5.00</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">₹3,001 – ₹10,000</span><span className="font-semibold">₹12.50</span></li>
              </ul>
            </SectionCard>
          </div>
        </div>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent AEPS Transactions</p>
          <DataTable columns={cols} rows={aepsTxns} empty="No AEPS transactions yet." />
        </section>
      </div>
    </RetailerShell>
  );
}