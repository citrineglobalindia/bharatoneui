import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard } from "@/components/retailer/section-card";

export const Route = createFileRoute("/gst")({
  head: () => ({ meta: [{ title: "GST Services — BharatOne" }] }),
  component: GstPage,
});

const OFFERINGS = [
  { t: "GST Registration", d: "Apply for new GSTIN — proprietorship, partnership, company", price: "₹1,499" },
  { t: "GSTR-1 Filing", d: "Monthly outward supplies return", price: "₹499" },
  { t: "GSTR-3B Filing", d: "Monthly summary return", price: "₹499" },
  { t: "GST Annual Return", d: "GSTR-9 / GSTR-9C audit", price: "₹4,999" },
  { t: "GSTIN Cancellation", d: "Surrender or cancel registration", price: "₹999" },
  { t: "GST LUT Filing", d: "Letter of undertaking for exports", price: "₹1,999" },
];

function GstPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="GST Services"
          subtitle="Registration, returns and compliance for your customers"
          actions={<Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev"><Plus className="h-4 w-4" /> New GST Request</Link>}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {OFFERINGS.map((o) => (
            <SectionCard key={o.t} title={o.t} description={o.d}>
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-extrabold">{o.price}</span>
                <Link to="/new-service-request" className="text-xs font-bold text-india-green hover:underline">Start →</Link>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </RetailerShell>
  );
}