import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, Bell, Shield, Sliders, Save } from "lucide-react";
import { AccountantShell } from "@/components/accountant/accountant-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/accountant/settings")({
  head: () => ({ meta: [{ title: "Portal Settings — BharatOne Accountant" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [twoFA, setTwoFA] = useState(true);
  const [autoLogout, setAutoLogout] = useState("30");
  const [approvalLimit, setApprovalLimit] = useState("100000");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <AccountantShell>
      <div className="space-y-5 max-w-3xl">
        <PageHeader
          icon={<SettingsIcon className="h-5 w-5" />}
          title="Portal Settings"
          subtitle="Preferences for approvals, notifications and security."
        />

        <Section icon={<Sliders className="h-4 w-4" />} title="Approval Workflow">
          <Toggle label="Auto-reconcile bank statements" desc="Match incoming UTRs to payments automatically." checked={autoReconcile} onChange={setAutoReconcile} />
          <Field label="Single approval limit (₹)" desc="Payouts above this require dual authorization.">
            <input type="number" min={0} value={approvalLimit} onChange={(e) => setApprovalLimit(e.target.value)} className="h-9 w-32 rounded-lg border border-border bg-card px-3 text-sm" />
          </Field>
        </Section>

        <Section icon={<Bell className="h-4 w-4" />} title="Notifications">
          <Toggle label="Email notifications" desc="New requests and SLA breaches." checked={notifyEmail} onChange={setNotifyEmail} />
          <Toggle label="WhatsApp alerts" desc="High-value approvals and payouts." checked={notifyWhatsapp} onChange={setNotifyWhatsapp} />
        </Section>

        <Section icon={<Shield className="h-4 w-4" />} title="Security">
          <Toggle label="Two-factor authentication" desc="Required for every accountant login." checked={twoFA} onChange={setTwoFA} />
          <Field label="Auto-logout (minutes)" desc="Sign out idle sessions after this duration.">
            <input type="number" min={5} max={240} value={autoLogout} onChange={(e) => setAutoLogout(e.target.value)} className="h-9 w-24 rounded-lg border border-border bg-card px-3 text-sm" />
          </Field>
        </Section>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs font-semibold text-emerald-700">Settings saved.</span>}
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-4 h-10 text-sm font-bold hover:bg-emerald-700">
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </AccountantShell>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center gap-2">
        <span className="text-emerald-600">{icon}</span>
        <p className="text-sm font-bold">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-slate-300"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Field({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
