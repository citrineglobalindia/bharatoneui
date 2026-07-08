import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Network, Search } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { DistributorReviewTable } from "@/components/registrations/distributor-review-table";

export const Route = createFileRoute("/accountant/distributor-applications")({
  head: () => ({ meta: [{ title: "Distributor Applications — BharatOne Accountant" }] }),
  component: DistributorApplicationsPage,
});

const TABS: [string, string][] = [
  ["accountant_review", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

function DistributorApplicationsPage() {
  const [tab, setTab] = useState("accountant_review");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  return (
    <AccountantShell>
      <div className="space-y-4">
        <PageHeader
          icon={<Network className="h-5 w-5" />}
          title="Distributor Applications"
          subtitle="Self-registered distributors awaiting verification. Admin performs the final approval."
        />

        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 h-9 text-sm font-semibold transition ${tab === k ? "bg-india-green text-white" : "bg-muted text-foreground hover:bg-muted/70"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 h-9">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, name, company, mobile, email…" className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 h-9 text-xs">
            <span className="font-semibold text-muted-foreground">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent outline-none" />
            <span className="font-semibold text-muted-foreground">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent outline-none" />
            {(fromDate || toDate) && <button onClick={() => { setFromDate(""); setToDate(""); }} className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Clear</button>}
          </div>
        </div>

        <DistributorReviewTable tab={tab} query={query} fromDate={fromDate} toDate={toDate} />
      </div>
    </AccountantShell>
  );
}
