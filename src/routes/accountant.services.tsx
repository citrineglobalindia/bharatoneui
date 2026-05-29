import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Switch } from "@/components/ui/switch";
import { SERVICES, inr, type ServiceRow } from "@/components/accountant/mock-data";

export const Route = createFileRoute("/accountant/services")({
  head: () => ({ meta: [{ title: "Services & Commission — BharatOne Accountant" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>(SERVICES);
  const toggle = (id: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    const svc = rows.find((r) => r.id === id);
    if (svc) toast.success(`${svc.name} ${svc.active ? "disabled" : "enabled"}`);
  };

  return (
    <AccountantShell>
      <div className="space-y-5">
        <PageHeader icon={<Wrench className="h-5 w-5" />} title="Services Cost & Commission" subtitle="Retailer cost, customer price and per-service commission split for retailers and distributors." />
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Service</th>
                  <th className="text-right px-4 py-3 font-bold">Retailer Cost</th>
                  <th className="text-right px-4 py-3 font-bold">Customer Price</th>
                  <th className="text-right px-4 py-3 font-bold">Retailer Comm.</th>
                  <th className="text-right px-4 py-3 font-bold">Distributor Comm.</th>
                  <th className="text-right px-4 py-3 font-bold">Company Margin</th>
                  <th className="text-center px-4 py-3 font-bold">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3"><p className="font-semibold">{r.name}</p><p className="text-[11px] text-muted-foreground">{r.category}</p></td>
                    <td className="px-4 py-3 text-right">{r.retailerCost ? inr(r.retailerCost) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-right">{r.customerPrice ? inr(r.customerPrice) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{inr(r.retailerCommission)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-violet-700">{inr(r.distributorCommission)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{inr(r.companyMargin)}</td>
                    <td className="px-4 py-3 text-center"><div className="flex justify-center"><Switch checked={r.active} onCheckedChange={() => toggle(r.id)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Commissions shown are per successful transaction. AEPS/Recharge/BBPS commissions are slab-based; values represent the standard slab.</p>
      </div>
    </AccountantShell>
  );
}
