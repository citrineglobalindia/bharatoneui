import { useMemo } from "react";
import {
  Activity, BadgeIndianRupee, Ban, Building2, CheckCircle2, Clock, FileCheck2,
  MapPin, Phone, Power, Receipt, ShieldCheck, Store, TrendingUp, User, Wallet,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type KycStatus = "Verified" | "Pending" | "Rejected";
type RState = "Active" | "Suspended";
export type RetailerDetail = {
  id: string; name: string; shop: string; phone: string; district: string; taluk: string;
  kyc: KycStatus; wallet: number; txnToday: number; revenue: number;
  tier: "Platinum" | "Gold" | "Silver"; state: RState; officer: string;
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

const KYC_TONE: Record<KycStatus, string> = {
  Verified: "bg-admin-success-soft text-admin-success",
  Pending: "bg-admin-warning-soft text-admin-warning",
  Rejected: "bg-admin-danger-soft text-admin-danger",
};
const TIER_TONE: Record<RetailerDetail["tier"], string> = {
  Platinum: "bg-admin-soft text-admin",
  Gold: "bg-admin-warning-soft text-admin-warning",
  Silver: "bg-muted text-muted-foreground",
};

// Deterministic pseudo-data derived from retailer id so each retailer looks unique
function seedFrom(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (min: number, max: number) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return min + (h % 1000) / 1000 * (max - min);
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const SERVICES = ["AEPS", "Recharge", "BBPS", "Money Transfer", "Mini ATM"];

export function RetailerDetailSheet({
  retailer, open, onOpenChange, onApproveKyc, onToggleState,
}: {
  retailer: RetailerDetail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApproveKyc: (id: string) => void;
  onToggleState: (id: string) => void;
}) {
  const data = useMemo(() => {
    if (!retailer) return null;
    const rnd = seedFrom(retailer.id);
    const revTrend = MONTHS.map((m) => ({
      m, revenue: Math.round(retailer.revenue * (0.55 + rnd(0, 0.6))),
    }));
    const services = SERVICES.map((s) => ({ s, txn: Math.round(rnd(20, 320)) }));
    const docs = [
      { label: "Aadhaar", ok: retailer.kyc === "Verified" },
      { label: "PAN card", ok: retailer.kyc === "Verified" },
      { label: "GST certificate", ok: retailer.kyc !== "Rejected" && rnd(0, 1) > 0.4 },
      { label: "Shop photo", ok: rnd(0, 1) > 0.3 },
      { label: "Bank passbook", ok: retailer.kyc === "Verified" },
    ];
    const timeline = [
      { t: "2 hours ago", e: `Processed ${Math.round(rnd(8, 40))} AEPS transactions`, icon: Activity, tone: "text-admin" },
      { t: "Yesterday", e: `Wallet topped up ${inr(Math.round(rnd(5000, 30000)))}`, icon: Wallet, tone: "text-admin-success" },
      { t: "3 days ago", e: `KYC document re-uploaded`, icon: FileCheck2, tone: "text-admin-warning" },
      { t: "1 week ago", e: `Field visit by ${retailer.officer}`, icon: User, tone: "text-muted-foreground" },
      { t: "1 month ago", e: `Onboarded into ${retailer.taluk} cluster`, icon: Store, tone: "text-muted-foreground" },
    ];
    const score = Math.round(60 + rnd(0, 38));
    const settlement = Math.round(rnd(72, 99));
    return { revTrend, services, docs, timeline, score, settlement };
  }, [retailer]);

  if (!retailer || !data) return null;
  const initials = retailer.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border bg-gradient-to-br from-admin-soft/60 to-card p-5">
          <SheetTitle className="sr-only">Retailer detail</SheetTitle>
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-admin font-display text-lg font-extrabold text-admin-foreground shadow-soft">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold tracking-tight">{retailer.name}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-extrabold", TIER_TONE[retailer.tier])}>{retailer.tier}</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">{retailer.shop} · {retailer.id}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", KYC_TONE[retailer.kyc])}>KYC {retailer.kyc}</span>
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", retailer.state === "Active" ? "bg-admin-success-soft text-admin-success" : "bg-admin-danger-soft text-admin-danger")}>{retailer.state}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {retailer.kyc !== "Verified" && (
              <Button size="sm" className="h-8 flex-1 gap-1 bg-admin-success text-[10px] text-white hover:bg-admin-success/90" onClick={() => onApproveKyc(retailer.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Verify KYC</Button>
            )}
            <Button size="sm" variant="outline" className={cn("h-8 flex-1 gap-1 text-[10px]", retailer.state === "Active" ? "text-admin-danger" : "text-admin-success")} onClick={() => onToggleState(retailer.id)}>
              {retailer.state === "Active" ? <><Ban className="h-3.5 w-3.5" /> Suspend</> : <><Power className="h-3.5 w-3.5" /> Activate</>}
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-188px)]">
          <div className="space-y-5 p-5">
            {/* Quick stats */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Wallet", v: inr(retailer.wallet), icon: Wallet, tone: "bg-admin-soft text-admin" },
                { l: "Revenue", v: inr(retailer.revenue), icon: BadgeIndianRupee, tone: "bg-admin-success-soft text-admin-success" },
                { l: "Txn today", v: String(retailer.txnToday), icon: Receipt, tone: "bg-admin-warning-soft text-admin-warning" },
                { l: "Health", v: `${data.score}/100`, icon: ShieldCheck, tone: "bg-admin-soft text-admin" },
              ].map((s) => { const Icon = s.icon; return (
                <div key={s.l} className="rounded-xl border border-border bg-card p-3 shadow-soft">
                  <span className={cn("grid h-8 w-8 place-items-center rounded-lg", s.tone)}><Icon className="h-4 w-4" /></span>
                  <p className="mt-2 font-display text-base font-extrabold tracking-tight">{s.v}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{s.l}</p>
                </div>
              ); })}
            </section>

            {/* Profile facts */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Profile</h3>
              <div className="grid grid-cols-1 gap-2.5 text-[11px] sm:grid-cols-2">
                {[
                  { icon: Phone, l: "Phone", v: retailer.phone },
                  { icon: Building2, l: "District", v: retailer.district },
                  { icon: MapPin, l: "Taluk", v: retailer.taluk },
                  { icon: User, l: "Field officer", v: retailer.officer },
                ].map((f) => { const Icon = f.icon; return (
                  <div key={f.l} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div><p className="text-[8px] font-bold uppercase text-muted-foreground">{f.l}</p><p className="font-bold">{f.v}</p></div>
                  </div>
                ); })}
              </div>
            </section>

            {/* Revenue trend */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Revenue trend</h3>
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-admin-success"><TrendingUp className="h-3 w-3" /> 6 months</span>
              </div>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revTrend} margin={{ left: -12, right: 4 }}>
                    <defs><linearGradient id="rdRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--admin)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--admin)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} formatter={(v: number) => inr(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--admin)" strokeWidth={2.5} fill="url(#rdRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Service mix */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Service mix</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.services} margin={{ left: -12, right: 4 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="s" tickLine={false} axisLine={false} fontSize={9} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="txn" fill="var(--admin)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* KYC docs + settlement */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">KYC documents</h3>
                <div className="space-y-2">
                  {data.docs.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold">{d.label}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold", d.ok ? "bg-admin-success-soft text-admin-success" : "bg-admin-danger-soft text-admin-danger")}>
                        {d.ok ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{d.ok ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Settlement reliability</h3>
                <p className="font-display text-3xl font-extrabold tracking-tight text-admin">{data.settlement}%</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-admin" style={{ width: `${data.settlement}%` }} />
                </div>
                <p className="mt-3 text-[10px] font-semibold text-muted-foreground">On-time settlements over the last 90 days. Higher is better for credit limits.</p>
              </div>
            </section>

            {/* Activity timeline */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Recent activity</h3>
              <div className="space-y-0">
                {data.timeline.map((t, i) => { const Icon = t.icon; return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted", t.tone)}><Icon className="h-4 w-4" /></span>
                      {i < data.timeline.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-4 pt-1">
                      <p className="text-[11px] font-bold">{t.e}</p>
                      <p className="text-[9px] font-semibold text-muted-foreground">{t.t}</p>
                    </div>
                  </div>
                ); })}
              </div>
            </section>
            <Separator />
            <p className="text-center text-[9px] font-semibold text-muted-foreground">BharatOne · Retailer intelligence view</p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}