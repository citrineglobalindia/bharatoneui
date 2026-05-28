import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, User, Lock, Bell, Building2, Banknote } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BharatOne" }] }),
  component: SettingsPage,
});

const TABS = [
  { k: "profile", l: "Profile", i: <User className="h-4 w-4" /> },
  { k: "business", l: "Business", i: <Building2 className="h-4 w-4" /> },
  { k: "bank", l: "Bank & Settlement", i: <Banknote className="h-4 w-4" /> },
  { k: "security", l: "Security", i: <Lock className="h-4 w-4" /> },
  { k: "notifications", l: "Notifications", i: <Bell className="h-4 w-4" /> },
];

function SettingsPage() {
  const [tab, setTab] = useState("profile");
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Manage your profile, security and preferences" />

        <div className="grid lg:grid-cols-[220px_1fr] gap-4">
          <nav className="rounded-xl border border-border bg-card p-2 h-fit">
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.k ? "bg-saffron-gradient text-white shadow-elev" : "hover:bg-muted text-foreground/80"
              }`}>
                <span className={tab === t.k ? "text-white" : "text-muted-foreground"}>{t.i}</span>
                {t.l}
              </button>
            ))}
          </nav>

          <div className="space-y-4">
            {tab === "profile" && (
              <SectionCard title="Profile Information">
                <form onSubmit={(e) => { e.preventDefault(); toast.success("Profile updated"); }} className="grid sm:grid-cols-2 gap-3">
                  <Field label="Full Name"><Input defaultValue="Harshitha" /></Field>
                  <Field label="Mobile"><Input defaultValue="9876789876" /></Field>
                  <Field label="Email"><Input defaultValue="Harshitha@bharatone.in" /></Field>
                  <Field label="Date of Birth"><Input type="date" defaultValue="2001-02-28" /></Field>
                  <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border"><PrimaryButton type="submit">Save Changes</PrimaryButton></div>
                </form>
              </SectionCard>
            )}
            {tab === "business" && (
              <SectionCard title="Business Details">
                <form onSubmit={(e) => { e.preventDefault(); toast.success("Saved"); }} className="grid sm:grid-cols-2 gap-3">
                  <Field label="Shop / Firm Name"><Input placeholder="Your shop name" /></Field>
                  <Field label="GSTIN (optional)"><Input placeholder="29ABCDE1234F1Z5" /></Field>
                  <Field label="State"><Select><option>Karnataka</option></Select></Field>
                  <Field label="Pincode"><Input maxLength={6} /></Field>
                  <div className="sm:col-span-2"><Field label="Address"><Input placeholder="Shop address" /></Field></div>
                  <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border"><PrimaryButton type="submit">Save</PrimaryButton></div>
                </form>
              </SectionCard>
            )}
            {tab === "bank" && (
              <SectionCard title="Bank Account for Settlement">
                <form onSubmit={(e) => { e.preventDefault(); toast.success("Bank details updated"); }} className="grid sm:grid-cols-2 gap-3">
                  <Field label="Account Holder"><Input placeholder="Name on account" /></Field>
                  <Field label="Account Number"><Input /></Field>
                  <Field label="IFSC"><Input className="uppercase" /></Field>
                  <Field label="Bank"><Input placeholder="Bank name" /></Field>
                  <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border"><PrimaryButton type="submit">Update</PrimaryButton></div>
                </form>
              </SectionCard>
            )}
            {tab === "security" && (
              <SectionCard title="Security">
                <form onSubmit={(e) => { e.preventDefault(); toast.success("Password changed"); }} className="grid sm:grid-cols-2 gap-3">
                  <Field label="Current Password"><Input type="password" /></Field>
                  <Field label="New Password"><Input type="password" /></Field>
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                    <div><p className="text-sm font-semibold">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Add extra security via OTP on login</p></div>
                    <button type="button" className="rounded-lg bg-india-green text-white px-3 py-1.5 text-xs font-bold">Enable</button>
                  </div>
                  <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border"><PrimaryButton type="submit">Update Password</PrimaryButton></div>
                </form>
              </SectionCard>
            )}
            {tab === "notifications" && (
              <SectionCard title="Notification Preferences">
                <ul className="space-y-3">
                  {[
                    "Transaction confirmations (SMS)",
                    "Daily settlement summary (Email)",
                    "New service announcements",
                    "Marketing & offers",
                  ].map((n, i) => (
                    <li key={n} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm">{n}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                        <span className="w-10 h-5 bg-muted peer-checked:bg-india-green rounded-full relative after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
                      </label>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}