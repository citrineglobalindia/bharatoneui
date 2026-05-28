import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, UserPlus, Send, Zap, Building2, Trash2 } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard, Field, Input, Select, PrimaryButton, GhostButton } from "@/components/retailer/section-card";
import { BANKS, inr } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/money-transfer")({
  head: () => ({ meta: [{ title: "Money Transfer — BharatOne" }] }),
  component: DmtPage,
});

const BENES = [
  { name: "Suresh Kumar", bank: "HDFC Bank", account: "XXXXXX4521", ifsc: "HDFC0001234" },
  { name: "Anitha R.", bank: "State Bank of India", account: "XXXXXX9912", ifsc: "SBIN0008812" },
  { name: "Mohan Lal", bank: "Punjab National Bank", account: "XXXXXX3380", ifsc: "PUNB0220100" },
];

function DmtPage() {
  const [mode, setMode] = useState<"IMPS" | "NEFT" | "RTGS">("IMPS");
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Domestic Money Transfer"
          subtitle="Send money instantly via IMPS, NEFT or RTGS to any Indian bank account"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today's Transfers" value={inr(20700)} icon={<Send className="h-5 w-5" />} tone="saffron" delta={{ value: "+15%", positive: true }} />
          <StatCard label="Commission Earned" value={inr(57)} icon={<Zap className="h-5 w-5" />} tone="green" />
          <StatCard label="Active Customers" value="12" icon={<UserPlus className="h-5 w-5" />} tone="sky" />
          <StatCard label="Monthly Limit Used" value="62%" icon={<Building2 className="h-5 w-5" />} tone="violet" />
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <SectionCard title="Send Money" description="Transfer to bank account in seconds">
              <div className="flex gap-2 mb-3">
                {(["IMPS", "NEFT", "RTGS"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                      mode === m ? "bg-saffron-gradient text-white border-transparent shadow-elev" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {m} {m === "IMPS" && <span className="text-[10px] opacity-80">· Instant</span>}
                  </button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); toast.success(`${mode} transfer initiated`); }} className="grid sm:grid-cols-2 gap-3">
                <Field label="Customer Mobile"><Input placeholder="Sender mobile" maxLength={10} /></Field>
                <Field label="Sender Name"><Input placeholder="As per Aadhaar" /></Field>
                <Field label="Beneficiary Name"><Input placeholder="Account holder name" /></Field>
                <Field label="Bank">
                  <Select>{BANKS.map((b) => <option key={b}>{b}</option>)}</Select>
                </Field>
                <Field label="Account Number"><Input placeholder="Account number" /></Field>
                <Field label="IFSC Code"><Input placeholder="HDFC0001234" maxLength={11} className="uppercase" /></Field>
                <Field label="Amount (₹)" hint={mode === "RTGS" ? "Min ₹2,00,000" : "Min ₹1 · Max ₹2,00,000"}>
                  <Input type="number" placeholder="0" />
                </Field>
                <Field label="Remarks (optional)"><Input placeholder="Purpose / note" /></Field>
                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Service charge: <span className="font-semibold text-foreground">₹{mode === "IMPS" ? 6 : mode === "NEFT" ? 4 : 25}</span></p>
                  <PrimaryButton type="submit"><Send className="h-4 w-4" /> Send via {mode}</PrimaryButton>
                </div>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-2">
            <SectionCard
              title="Saved Beneficiaries"
              action={<GhostButton><UserPlus className="h-3.5 w-3.5" /> Add</GhostButton>}
            >
              <ul className="space-y-2">
                {BENES.map((b) => (
                  <li key={b.account} className="rounded-lg border border-border p-3 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.bank} · {b.account}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{b.ifsc}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button className="mt-2 w-full text-xs font-semibold text-india-green hover:underline text-left">Send money →</button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}