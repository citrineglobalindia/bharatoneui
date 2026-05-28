import { createFileRoute } from "@tanstack/react-router";
import { UserCircle2, Mail, Phone, MapPin, Shield, Calendar, Award, Activity } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/qc/profile")({
  head: () => ({ meta: [{ title: "My Profile — QC Portal" }] }),
  component: ProfilePage,
});

function Stat({ label, value, tone = "indigo" }: { label: string; value: string; tone?: string }) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-500 to-violet-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-600",
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
    <QcShell>
      <div className="space-y-5 max-w-4xl">
        <PageHeader
          icon={<UserCircle2 className="h-5 w-5" />}
          title="My Profile"
          subtitle="Your reviewer identity, performance and access level."
        />

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-3xl font-extrabold">Q</div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl font-extrabold">QC Reviewer · Anil</p>
            <p className="text-xs text-muted-foreground">qc.admin · BharatOne Quality Control</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Level 2 Reviewer</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">On Shift</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">2FA Enabled</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Reviewed today" value="47" tone="indigo" />
          <Stat label="Approval rate" value="92.4%" tone="emerald" />
          <Stat label="Avg TAT" value="4m 38s" tone="amber" />
          <Stat label="Flagged caught" value="11" tone="rose" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Shield className="h-4 w-4 text-indigo-600" /> Contact & Identity</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> +91 98452 24260</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> anil.qc@bharatone.in</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Bengaluru, Karnataka</li>
              <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Joined Mar 2024</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Award className="h-4 w-4 text-emerald-600" /> Certifications</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span>KYC L1 Reviewer</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">VERIFIED</span></li>
              <li className="flex items-center justify-between"><span>KYC L2 Reviewer</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">VERIFIED</span></li>
              <li className="flex items-center justify-between"><span>AML Compliance</span><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">VERIFIED</span></li>
              <li className="flex items-center justify-between"><span>Video KYC Examiner</span><span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">IN REVIEW</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Activity className="h-4 w-4 text-violet-600" /> Recent Activity</h3>
          <ol className="relative border-l-2 border-indigo-200 pl-4 space-y-3 text-sm">
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /><p className="font-semibold">Approved BO-KYC-24091</p><p className="text-[11px] text-muted-foreground">2 minutes ago</p></li>
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-100" /><p className="font-semibold">Rejected BO-KYC-24088 · Address mismatch</p><p className="text-[11px] text-muted-foreground">18 minutes ago</p></li>
            <li><span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100" /><p className="font-semibold">Held BO-KYC-24084 for additional document</p><p className="text-[11px] text-muted-foreground">42 minutes ago</p></li>
          </ol>
        </div>
      </div>
    </QcShell>
  );
}