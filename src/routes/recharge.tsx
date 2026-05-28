import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Smartphone, Tv, Wifi, Zap } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { OPERATORS, DTH_OPERATORS, inr } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/recharge")({
  head: () => ({ meta: [{ title: "Recharge — BharatOne" }] }),
  component: RechargePage,
});

const PLANS = [
  { amt: 149, validity: "20 days", data: "1 GB/day", best: false },
  { amt: 239, validity: "28 days", data: "1.5 GB/day", best: true },
  { amt: 299, validity: "28 days", data: "2 GB/day", best: false },
  { amt: 666, validity: "84 days", data: "1.5 GB/day", best: false },
  { amt: 999, validity: "84 days", data: "3 GB/day", best: false },
  { amt: 2999, validity: "365 days", data: "2.5 GB/day", best: false },
];

function RechargePage() {
  const [tab, setTab] = useState<"mobile" | "dth" | "data" | "broadband">("mobile");
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Smartphone className="h-5 w-5" />}
          title="Recharge & Top-up"
          subtitle="Mobile prepaid, DTH, data card and broadband — instant activation"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today's Recharges" value="42" icon={<Smartphone className="h-5 w-5" />} tone="green" />
          <StatCard label="Volume" value={inr(12480)} icon={<Zap className="h-5 w-5" />} tone="saffron" delta={{ value: "+22%", positive: true }} />
          <StatCard label="Commission" value={inr(374.4)} icon={<Zap className="h-5 w-5" />} tone="sky" />
          <StatCard label="Failed" value="1" icon={<Smartphone className="h-5 w-5" />} tone="rose" />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex border-b border-border bg-muted/40">
            {[
              { k: "mobile", l: "Mobile Prepaid", i: <Smartphone className="h-4 w-4" /> },
              { k: "dth", l: "DTH", i: <Tv className="h-4 w-4" /> },
              { k: "data", l: "Data Card", i: <Zap className="h-4 w-4" /> },
              { k: "broadband", l: "Broadband", i: <Wifi className="h-4 w-4" /> },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={`flex-1 px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 border-b-2 transition ${
                  tab === t.k ? "border-saffron text-foreground bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.i} {t.l}
              </button>
            ))}
          </div>

          <div className="p-4 grid lg:grid-cols-5 gap-4">
            <form onSubmit={(e) => { e.preventDefault(); toast.success("Recharge initiated successfully."); }} className="lg:col-span-2 space-y-3">
              <Field label={tab === "dth" ? "Subscriber ID / VC Number" : tab === "broadband" ? "Customer ID" : "Mobile Number"}>
                <Input placeholder={tab === "mobile" ? "10-digit mobile" : "Enter ID"} />
              </Field>
              <Field label="Operator">
                <Select>
                  {(tab === "dth" ? DTH_OPERATORS : OPERATORS).map((o) => <option key={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Circle / Region">
                <Select>
                  <option>Karnataka</option><option>Tamil Nadu</option><option>Andhra Pradesh</option><option>Maharashtra</option><option>Delhi NCR</option>
                </Select>
              </Field>
              <Field label="Amount (₹)"><Input type="number" placeholder="0" /></Field>
              <PrimaryButton type="submit" className="w-full">Proceed to Recharge</PrimaryButton>
            </form>

            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Popular Plans</p>
                <span className="text-[11px] text-muted-foreground">Jio · Karnataka</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {PLANS.map((p) => (
                  <button
                    key={p.amt}
                    onClick={() => toast.info(`Selected ₹${p.amt} plan`)}
                    className={`text-left rounded-lg border p-3 hover:border-saffron hover:shadow-soft transition ${
                      p.best ? "border-saffron bg-saffron/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-display text-xl font-extrabold">₹{p.amt}</span>
                      {p.best && <span className="text-[10px] font-bold bg-saffron-gradient text-white rounded-full px-2 py-0.5">BEST</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.validity} · {p.data}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Earn ₹{(p.amt * 0.03).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}