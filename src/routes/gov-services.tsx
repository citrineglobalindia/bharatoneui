import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Plus, Landmark, FileSpreadsheet, ShieldCheck, FileText, GraduationCap, Heart } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/gov-services")({
  head: () => ({ meta: [{ title: "Government Services — BharatOne" }] }),
  component: GovPage,
});

const CARDS = [
  { t: "MSME / Udyam", d: "Micro, small & medium enterprise registration", icon: <Landmark className="h-5 w-5" />, tone: "bg-teal-600" },
  { t: "ITR Filing", d: "Income tax return filing for individuals & business", icon: <FileSpreadsheet className="h-5 w-5" />, tone: "bg-indigo-500" },
  { t: "FSSAI License", d: "Food safety license — Basic / State / Central", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-emerald-600" },
  { t: "Digital Signature", d: "Class 3 DSC for tenders & filings", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-slate-700" },
  { t: "Trade License", d: "Local municipal trade license", icon: <FileText className="h-5 w-5" />, tone: "bg-amber-500" },
  { t: "Shop & Establishment", d: "Shop Act registration", icon: <FileText className="h-5 w-5" />, tone: "bg-rose-500" },
  { t: "Education Schemes", d: "Apply for scholarships & schemes", icon: <GraduationCap className="h-5 w-5" />, tone: "bg-violet-500" },
  { t: "Health Schemes", d: "Ayushman Bharat & state schemes", icon: <Heart className="h-5 w-5" />, tone: "bg-pink-500" },
];

function GovPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Globe className="h-5 w-5" />} title="Government Services" subtitle="One-stop access to central and state government schemes" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CARDS.map((c) => (
            <Link key={c.t} to="/new-service-request" className="rounded-xl border border-border bg-card p-4 hover:shadow-elev hover:-translate-y-0.5 transition flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${c.tone} text-white flex items-center justify-center shadow-soft shrink-0`}>{c.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{c.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.d}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-india-green"><Plus className="h-3 w-3" /> Apply now</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RetailerShell>
  );
}