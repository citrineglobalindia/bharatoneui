import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, BellRing, CalendarClock, Download, Mail, MapPin, MessageCircle, Phone, Save, Settings2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type TelecallerLead = {
  id: string; name: string; phone: string; source: string; service: string; owner: string;
  status: string; nextAction: string; priority: "High" | "Medium" | "Low";
};

const SERVICES = ["All services", "B2B Center", "Banking Services", "Insurance", "PAN Card", "Aadhaar Services", "Government Schemes", "B2C Services"];

export function ServiceFollowups({ leads, onCall }: { leads: TelecallerLead[]; onCall: (lead: TelecallerLead) => void }) {
  const [service, setService] = useState("All services");
  const actionable = useMemo(() => leads.filter((lead) =>
    ["Interested", "Follow-up Required", "Documents Pending", "Application Submitted"].includes(lead.status) &&
    (service === "All services" || lead.service === service)), [leads, service]);

  return <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
    <section className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-saffron">Service-based queue</p><h2 className="font-display text-lg font-extrabold">Follow-ups by service</h2><p className="text-xs text-muted-foreground">Prioritize callbacks based on the customer’s selected BharatOne service.</p></div>
        <Select value={service} onValueChange={setService}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{SERVICES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="divide-y divide-border">{actionable.map((lead) => <div key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron/10 text-saffron"><CalendarClock className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{lead.name}</p><Badge variant="outline">{lead.service}</Badge><Badge variant="outline" className={lead.priority === "High" ? "border-destructive/20 bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>{lead.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{lead.phone} · {lead.status} · {lead.nextAction}</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => toast.success("Reminder queued", { description: `${lead.service} follow-up sent to ${lead.name}.` })}><MessageCircle /> Remind</Button><Button size="sm" onClick={() => onCall(lead)}><Phone /> Call</Button></div>
      </div>)}{actionable.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No pending follow-ups for this service.</div>}</div>
    </section>
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Queue coverage</p><h2 className="font-display text-lg font-extrabold">By service</h2><div className="mt-5 space-y-4">{SERVICES.slice(1).map((item) => { const count = leads.filter((lead) => lead.service === item && !["Activated", "Closed", "Rejected"].includes(lead.status)).length; return <button key={item} type="button" onClick={() => setService(item)} className="block w-full text-left"><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{item}</span><span className="text-muted-foreground">{count}</span></div><Progress value={Math.min(100, count * 35)} className="h-1.5 [&>div]:bg-hr" /></button>; })}</div></aside>
  </div>;
}

export function ServiceReports({ leads }: { leads: TelecallerLead[] }) {
  const report = SERVICES.slice(1).map((service) => { const rows = leads.filter((lead) => lead.service === service); const activated = rows.filter((lead) => lead.status === "Activated").length; return { service, leads: rows.length, followups: rows.filter((lead) => ["Follow-up Required", "Interested", "Documents Pending"].includes(lead.status)).length, activated, conversion: rows.length ? Math.round((activated / rows.length) * 100) : 0 }; });
  const exportCsv = () => { const csv = ["Service,Leads,Follow-ups,Activated,Conversion", ...report.map((row) => `${row.service},${row.leads},${row.followups},${row.activated},${row.conversion}%`)].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "telecaller-service-report.csv"; link.click(); URL.revokeObjectURL(url); toast.success("Service report downloaded"); };
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"><div className="flex items-center justify-between border-b border-border p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Live local report</p><h2 className="font-display text-lg font-extrabold">Service performance</h2><p className="text-xs text-muted-foreground">Lead outcomes and conversion by service category.</p></div><Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-muted/50"><tr>{["Service", "Total leads", "Follow-ups", "Activated", "Conversion"].map((item) => <th key={item} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{report.map((row) => <tr key={row.service}><td className="px-5 py-4 font-bold">{row.service}</td><td className="px-5 py-4">{row.leads}</td><td className="px-5 py-4">{row.followups}</td><td className="px-5 py-4">{row.activated}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><Progress value={row.conversion} className="h-2 w-24 [&>div]:bg-india-green" /><span className="font-semibold">{row.conversion}%</span></div></td></tr>)}</tbody></table></div></section>;
}

export function ProfileSettings({ mode }: { mode: "profile" | "settings" }) {
  const [profile, setProfile] = useState({ name: "Arjun Kumar", email: "arjun.kumar@bharatone.in", phone: "+91 98765 43210", city: "Bengaluru", employeeId: "TC-1042" });
  const [preferences, setPreferences] = useState({ callLogging: true, whatsapp: true, sms: false, reminders: true });
  const saveProfile = () => { localStorage.setItem("bharatone:telecaller-profile", JSON.stringify(profile)); toast.success("Profile updated"); };
  const saveSettings = () => { localStorage.setItem("bharatone:telecaller-settings", JSON.stringify(preferences)); toast.success("Settings saved"); };
  if (mode === "profile") return <section className="grid gap-4 xl:grid-cols-[280px_1fr]"><aside className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-hr text-2xl font-extrabold text-hr-foreground">AK</span><h2 className="mt-4 font-display text-xl font-extrabold">{profile.name}</h2><p className="text-sm text-muted-foreground">Telecaller Executive</p><Badge className="mt-3 bg-india-green text-primary-foreground">Active</Badge><div className="mt-6 space-y-3 border-t border-border pt-5 text-left text-xs text-muted-foreground"><p className="flex gap-2"><UserRound className="h-4 w-4 text-hr" /> {profile.employeeId}</p><p className="flex gap-2"><Mail className="h-4 w-4 text-hr" /> {profile.email}</p><p className="flex gap-2"><MapPin className="h-4 w-4 text-hr" /> {profile.city}</p></div></aside><div className="rounded-2xl border border-border bg-card p-6 shadow-soft"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Personal information</p><h2 className="font-display text-xl font-extrabold">My profile</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{Object.entries(profile).map(([key, value]) => <div key={key}><Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label><Input id={key} value={value} disabled={key === "employeeId"} className="mt-2" onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} /></div>)}</div><Button className="mt-6" onClick={saveProfile}><Save /> Save profile</Button></div></section>;
  const options = [{ key: "callLogging", title: "Automatic call logging", text: "Create a local activity entry when a call starts.", icon: Phone }, { key: "whatsapp", title: "WhatsApp reminders", text: "Queue service-specific customer reminders.", icon: MessageCircle }, { key: "sms", title: "SMS notifications", text: "Receive SMS alerts for urgent callbacks.", icon: BellRing }, { key: "reminders", title: "Follow-up notifications", text: "Show alerts before scheduled follow-ups.", icon: CalendarClock }] as const;
  return <section className="rounded-2xl border border-border bg-card p-6 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-hr-soft text-hr"><Settings2 /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Workspace preferences</p><h2 className="font-display text-xl font-extrabold">Telecaller settings</h2></div></div><div className="mt-6 max-w-3xl divide-y divide-border">{options.map(({ key, title, text, icon: Icon }) => <div key={key} className="flex items-center gap-4 py-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></span><div className="flex-1"><Label htmlFor={key} className="font-bold">{title}</Label><p className="text-xs text-muted-foreground">{text}</p></div><Switch id={key} checked={preferences[key]} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, [key]: checked }))} /></div>)}</div><Button className="mt-5" onClick={saveSettings}><Save /> Save settings</Button></section>;
}