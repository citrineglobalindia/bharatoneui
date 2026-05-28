import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Receipt, Zap, Flame, Droplet, Wifi, ShieldCheck, GraduationCap, Heart, Search } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { BILLERS } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/bbps")({
  head: () => ({ meta: [{ title: "BBPS Bills — BharatOne" }] }),
  component: BbpsPage,
});

const CATEGORIES = [
  { key: "Electricity", icon: <Zap className="h-5 w-5" />, tone: "bg-amber-500" },
  { key: "Gas", icon: <Flame className="h-5 w-5" />, tone: "bg-orange-500" },
  { key: "Water", icon: <Droplet className="h-5 w-5" />, tone: "bg-sky-500" },
  { key: "Broadband", icon: <Wifi className="h-5 w-5" />, tone: "bg-violet-500" },
  { key: "Insurance", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-emerald-600" },
  { key: "Fastag", icon: <Receipt className="h-5 w-5" />, tone: "bg-rose-500" },
  { key: "Education", icon: <GraduationCap className="h-5 w-5" />, tone: "bg-indigo-500" },
  { key: "Donation", icon: <Heart className="h-5 w-5" />, tone: "bg-pink-500" },
];

function BbpsPage() {
  const [cat, setCat] = useState("Electricity");
  const billers = BILLERS.find((b) => b.category === cat)?.names ?? [];
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Receipt className="h-5 w-5" />}
          title="BBPS Bill Payments"
          subtitle="Pay any bill through Bharat Bill Payment System — 200+ billers across India"
        />

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-xl border p-3 flex flex-col items-center gap-2 transition ${
                  cat === c.key ? "border-saffron bg-saffron/5 shadow-elev" : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className={`h-9 w-9 rounded-lg ${c.tone} text-white flex items-center justify-center`}>{c.icon}</div>
                <span className="text-[11px] font-semibold">{c.key}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <SectionCard title={`${cat} Bill Payment`} description="Fetch and pay your bill instantly">
              <form onSubmit={(e) => { e.preventDefault(); toast.success("Bill payment successful."); }} className="grid sm:grid-cols-2 gap-3">
                <Field label="Biller">
                  <Select>{billers.map((b) => <option key={b}>{b}</option>)}</Select>
                </Field>
                <Field label="State">
                  <Select><option>Karnataka</option><option>Tamil Nadu</option><option>Maharashtra</option><option>Delhi</option></Select>
                </Field>
                <Field label="Consumer Number / Account ID" hint="As printed on your bill">
                  <Input placeholder="Consumer number" />
                </Field>
                <Field label="Customer Mobile"><Input placeholder="10-digit mobile" maxLength={10} /></Field>
                <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Search className="h-4 w-4" /> Fetch bill to see due amount
                  </p>
                  <button type="button" className="text-xs font-bold text-india-green hover:underline">Fetch Bill</button>
                </div>
                <Field label="Amount (₹)" hint="Auto-filled after fetching"><Input type="number" placeholder="0" /></Field>
                <Field label="Convenience Fee"><Input value="₹0.00" disabled /></Field>
                <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border">
                  <PrimaryButton type="submit"><Receipt className="h-4 w-4" /> Pay Bill</PrimaryButton>
                </div>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-2">
            <SectionCard title="Why pay via BBPS?">
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> RBI-regulated single window</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Instant confirmation & receipt</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Commission on every bill paid</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Coverage across all states</li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}