import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard } from "@/components/retailer/section-card";

export const Route = createFileRoute("/business-reg")({
  head: () => ({ meta: [{ title: "Business Registration — BharatOne" }] }),
  component: BizRegPage,
});

const OFFERINGS = [
  { t: "Private Limited Company", d: "MCA registration · 2 directors", price: "₹6,999" },
  { t: "LLP Registration", d: "Limited liability partnership", price: "₹5,499" },
  { t: "One Person Company", d: "Single founder · MCA", price: "₹5,999" },
  { t: "Partnership Firm", d: "Registered partnership deed", price: "₹2,499" },
  { t: "Proprietorship", d: "Sole proprietor setup", price: "₹1,499" },
  { t: "Section 8 / NGO", d: "Non-profit company", price: "₹9,999" },
];

function BizRegPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Building2 className="h-5 w-5" />}
          title="Business Registration"
          subtitle="Start a company, LLP, partnership or proprietorship in minutes"
          actions={<Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev"><Plus className="h-4 w-4" /> Start Registration</Link>}
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