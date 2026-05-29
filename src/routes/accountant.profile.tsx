import { createFileRoute } from "@tanstack/react-router";
import { UserCircle2, Mail, Phone, MapPin, Shield, Calendar, Award, Activity } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/accountant/profile")({
  head: () => ({ meta: [{ title: "My Profile — BharatOne Accountant" }] }),
  component: ProfilePage,
});

function Stat({ label, value, tone = "emerald" }: { label: string; value: string; tone?: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600",
    sky: "from-sky-500 to-blue-600",
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-purple-600",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[tone]} text-white p-4 shadow-soft`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

function ProfilePage() {
  return (
    <AccountantShell>
      <div className="space-y-5 max-w-4xl">
        <PageHeader
          icon={<UserCircle2 className="h-5 w-5" />}
          title="My Profile"
          subtitle="Your accountant identity, performance and access level."
        />

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl font-extrabold">M</div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl font-extrabold">Mahesh</p>
            <p className="text-xs text-muted-foreground">8879789067 · BharatOne Finance & Accounts</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Senior Accountant</span>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full uppercase tracking-wider">On Duty</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">2FA Enabled</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Approved today" value="32" tone="emerald" />
          <Stat label="Settlement rate" value="98.6%" tone="sky" />
          <Stat label="Avg TAT" value="3m 12s" tone="amber" />
          <Stat label="Payouts cleared" value="₹4.2L" tone="violet" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Shield className="h-4 w-4 text-emerald-600" /> Contact & Identity</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> +91 88797 89067</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> mahesh.accounts@bharatone.in</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Mumbai, Maharashtra</li>
              <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Joined Jan 2024</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Award className="h-4 w-4 text-emerald-600" /> Authorizations</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span>Registration Payment Approval</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ENABLED</span></li>
              <li className="flex items-center justify-between"><span>Wallet Recharge Approval</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ENABLED</span></li>
              <li className="flex items-center justify-between"><span>Withdrawal / Payout Approval</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ENABLED</span></li>
              <li className="flex items-center justify-between"><span>Main Account Recharge</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ENABLED</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Activity className="h-4 w-4 text-emerald-600" /> Recent Activity</h3>
          <ol className="relative border-l-2 border-emerald-200 pl-4 space-y-3 text-sm">
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /><p className="font-semibold">Approved registration BO-REG-7838</p><p className="text-[11px] text-muted-foreground">5 minutes ago</p></li>
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-sky-100" /><p className="font-semibold">Approved wallet recharge ₹80,000 · Sunita Rao</p><p className="text-[11px] text-muted-foreground">22 minutes ago</p></li>
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-100" /><p className="font-semibold">Rejected withdrawal BO-WDL-3308 · Insufficient balance</p><p className="text-[11px] text-muted-foreground">48 minutes ago</p></li>
          </ol>
        </div>
      </div>
    </AccountantShell>
  );
}
