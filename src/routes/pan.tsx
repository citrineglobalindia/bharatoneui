import { createFileRoute, Link } from "@tanstack/react-router";
import { IdCard, Plus } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard } from "@/components/retailer/section-card";

export const Route = createFileRoute("/pan")({
  head: () => ({ meta: [{ title: "PAN Services — BharatOne" }] }),
  component: PanPage,
});

const OFFERINGS = [
  { t: "New PAN — Individual", d: "Form 49A · Aadhaar e-KYC", price: "₹199" },
  { t: "New PAN — Business", d: "Form 49A · for firms/companies", price: "₹399" },
  { t: "PAN Correction", d: "Update name, DOB, address", price: "₹249" },
  { t: "Duplicate / Reprint", d: "Lost or damaged PAN card", price: "₹199" },
  { t: "Instant e-PAN", d: "Aadhaar-based · 10 minutes", price: "₹99" },
  { t: "Link PAN-Aadhaar", d: "Mandatory linkage", price: "Free" },
];

function PanPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<IdCard className="h-5 w-5" />}
          title="PAN Services"
          subtitle="New PAN, corrections, reprints and Aadhaar linking"
          actions={<Link to="/new-service-request" className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 h-10 text-sm font-semibold shadow-elev"><Plus className="h-4 w-4" /> New PAN Application</Link>}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {OFFERINGS.map((o) => (
            <SectionCard key={o.t} title={o.t} description={o.d}>
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-extrabold">{o.price}</span>
                <Link to="/new-service-request" className="text-xs font-bold text-india-green hover:underline">Apply →</Link>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </RetailerShell>
  );
}