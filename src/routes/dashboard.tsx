import { createFileRoute } from "@tanstack/react-router";
import {
  Video,
  Banknote,
  ArrowLeftRight,
  Smartphone,
  Receipt,
  FileText,
  Building2,
  ClipboardList,
  Wallet,
  Zap,
  IdCard,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Retailer Dashboard — BharatOne" },
      { name: "description", content: "BharatOne retailer services dashboard." },
    ],
  }),
  component: DashboardPage,
});

type Service = { label: string; icon: React.ReactNode; tone: string; active?: boolean };

const SERVICE_STATUS: Service[] = [
  { label: "AEPS", icon: <Banknote className="h-4 w-4" />, tone: "bg-sky-500", active: true },
  { label: "Money Transfer", icon: <ArrowLeftRight className="h-4 w-4" />, tone: "bg-orange-500", active: true },
  { label: "Recharge", icon: <Smartphone className="h-4 w-4" />, tone: "bg-emerald-600", active: true },
  { label: "Bill Payments", icon: <Receipt className="h-4 w-4" />, tone: "bg-orange-500", active: true },
  { label: "GST Services", icon: <FileText className="h-4 w-4" />, tone: "bg-emerald-600", active: true },
  { label: "PAN Services", icon: <IdCard className="h-4 w-4" />, tone: "bg-rose-500", active: true },
  { label: "Business Reg.", icon: <Building2 className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "MSME / Udyam", icon: <Landmark className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "ITR Filing", icon: <FileSpreadsheet className="h-4 w-4" />, tone: "bg-slate-400", active: false },
  { label: "Digital Sign.", icon: <ShieldCheck className="h-4 w-4" />, tone: "bg-slate-400", active: false },
];

const ALL_SERVICES: Service[] = [
  { label: "AEPS", icon: <Banknote className="h-5 w-5" />, tone: "bg-sky-500" },
  { label: "Money Transfer", icon: <ArrowLeftRight className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "Mobile Recharge", icon: <Smartphone className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "DTH Recharge", icon: <Zap className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "Bill Payments", icon: <Receipt className="h-5 w-5" />, tone: "bg-orange-500" },
  { label: "GST Services", icon: <FileText className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "PAN Services", icon: <IdCard className="h-5 w-5" />, tone: "bg-rose-500" },
  { label: "Business Reg.", icon: <Building2 className="h-5 w-5" />, tone: "bg-violet-500" },
  { label: "MSME / Udyam", icon: <Landmark className="h-5 w-5" />, tone: "bg-teal-600" },
  { label: "ITR Filing", icon: <FileSpreadsheet className="h-5 w-5" />, tone: "bg-indigo-500" },
  { label: "FSSAI License", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-emerald-600" },
  { label: "Digital Sign.", icon: <ShieldCheck className="h-5 w-5" />, tone: "bg-slate-700" },
];

function DashboardPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
          {/* Greeting */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-extrabold">Hello, Demo Retailer</h1>
              <p className="text-sm text-muted-foreground">Your services dashboard</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-saffron-gradient text-white px-4 py-2 text-sm font-semibold shadow-elev hover:scale-[1.02] transition">
              <Wallet className="h-4 w-4" /> My Wallet
            </button>
          </div>

          {/* Wallet banner */}
          <div className="rounded-2xl bg-saffron-gradient text-white p-5 shadow-elev">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Wallet Balance</p>
            <p className="font-display text-3xl font-extrabold mt-1">₹0.00</p>
            <p className="text-xs opacity-90">Available for services</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              {["View Ledger", "Transactions", "Applications"].map((l) => (
                <button key={l} className="rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 py-2 text-sm font-semibold transition">
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* KYC alert */}
          <a href="/video-kyc" className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100/70 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-200/70 text-amber-700 flex items-center justify-center">
                <Video className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-900">Complete Video KYC</p>
                <p className="text-xs text-amber-800/80">Required for account activation</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-amber-700" />
          </a>

          {/* Service status */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Service Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {SERVICE_STATUS.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border bg-card px-3 py-2.5 flex items-center gap-2.5 ${
                    s.active ? "border-emerald-200" : "border-border opacity-70"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg ${s.tone} text-white flex items-center justify-center`}>{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{s.label}</p>
                    <p className={`text-[11px] font-semibold ${s.active ? "text-india-green" : "text-muted-foreground"}`}>
                      {s.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* All services */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">All Services</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {ALL_SERVICES.map((s) => (
                <button
                  key={s.label}
                  className="rounded-xl border border-border bg-card px-3 py-4 flex flex-col items-center gap-2 hover:shadow-elev hover:-translate-y-0.5 transition"
                >
                  <div className={`h-10 w-10 rounded-xl ${s.tone} text-white flex items-center justify-center shadow-soft`}>{s.icon}</div>
                  <span className="text-xs font-semibold text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent transactions */}
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold">Recent Transactions</p>
              <button className="text-xs font-semibold text-india-green hover:underline inline-flex items-center gap-1">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="py-10 text-center text-sm text-muted-foreground">No transactions yet</div>
          </section>

          {/* My applications */}
          <button className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-saffron/10 text-saffron flex items-center justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">My Applications</p>
                <p className="text-xs text-muted-foreground">GST, PAN, Business registration status</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </button>
      </div>
    </RetailerShell>
  );
}