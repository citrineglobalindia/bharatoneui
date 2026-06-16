import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wrench, Banknote, ArrowLeftRight, Smartphone, Receipt, FileText, IdCard, Building2, ExternalLink } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "My Services — BharatOne" }] }),
  component: ServicesPage,
});

const CORE = [
  { label: "AEPS", to: "/aeps", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500", active: true },
  { label: "Money Transfer", to: "/money-transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "Recharge", to: "/recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600", active: true },
  { label: "BBPS", to: "/bbps", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500", active: true },
  { label: "GST", to: "/gst", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600", active: true },
  { label: "PAN", to: "/pan", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500", active: true },
  { label: "Business Reg.", to: "/business-reg", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500", active: false },
];

type Service = { id: string; name: string; logo_url: string | null; redirect_url: string; category: string | null };

function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase.from("services").select("id,name,logo_url,redirect_url,category")
        .eq("is_active", true).order("sort_order").order("name");
      if (on) setServices((data as Service[]) ?? []);
    })();
    return () => { on = false; };
  }, []);

  return (
    <RetailerShell>
      <div className="space-y-6">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title="My Services" subtitle="Services activated on your retailer account" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CORE.map((s) => (
            <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 hover:shadow-elev hover:-translate-y-0.5 transition flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm">{s.label}</p>
                <p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>{s.active ? "● Active" : "○ Inactive"}</p>
              </div>
            </Link>
          ))}
        </div>

        {services.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-foreground">Partner Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {services.map((s) => (
                <a key={s.id} href={s.redirect_url} target="_blank" rel="noreferrer"
                  className="group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition hover:shadow-elev hover:-translate-y-0.5">
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="h-12 w-12 object-contain" />
                    : <div className="grid h-12 w-12 place-items-center rounded-lg bg-india-green/10 text-india-green font-bold">{s.name[0]}</div>}
                  <p className="text-xs font-semibold leading-tight">{s.name}</p>
                  <ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </RetailerShell>
  );
}
