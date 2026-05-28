import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Banknote, ArrowLeftRight, Smartphone, Receipt, FileText, IdCard, Building2 } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "My Services — BharatOne" }] }),
  component: ServicesPage,
});

const SERVICES = [
  { label: "AEPS", to: "/aeps", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500", active: true },
  { label: "Money Transfer", to: "/money-transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "Recharge", to: "/recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600", active: true },
  { label: "BBPS", to: "/bbps", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "GST", to: "/gst", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600", active: true },
  { label: "PAN", to: "/pan", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500", active: true },
  { label: "Business Reg.", to: "/business-reg", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500", active: false },
];

function ServicesPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title="My Services" subtitle="Services activated on your retailer account" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SERVICES.map((s) => (
            <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 hover:shadow-elev hover:-translate-y-0.5 transition flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm">{s.label}</p>
                <p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>{s.active ? "● Active" : "○ Inactive"}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RetailerShell>
  );
}