import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock, ArrowRight, Award, BarChart3, CalendarClock, CheckCircle2,
  CircleDollarSign, Clock3, FileCheck2, Headphones, MessageCircle, Phone,
  PhoneCall, Search, Send, Target, UserCheck, UserPlus, UsersRound,
} from "lucide-react";
import { TelecallerShell } from "@/components/telecaller/telecaller-shell";
import { ProfileSettings, ServiceFollowups, ServiceReports } from "@/components/telecaller/telecaller-extras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUSES = [
  "New Lead", "Contacted", "Interested", "Follow-up Required", "Documents Pending",
  "Application Submitted", "Activated", "Rejected", "Closed",
] as const;
type LeadStatus = (typeof STATUSES)[number];

type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  service: string;
  owner: string;
  status: LeadStatus;
  nextAction: string;
  priority: "High" | "Medium" | "Low";
};

const INITIAL_LEADS: Lead[] = [
  { id: "LD-2841", name: "Rakesh Kumar", phone: "+91 98451 27420", source: "Website", service: "B2B Center", owner: "Priya S.", status: "Interested", nextAction: "Today, 11:30 AM", priority: "High" },
  { id: "LD-2840", name: "Sana Traders", phone: "+91 99008 11874", source: "Campaign", service: "Banking Services", owner: "Arjun K.", status: "Follow-up Required", nextAction: "Today, 12:15 PM", priority: "High" },
  { id: "LD-2839", name: "Meena Devi", phone: "+91 80732 64019", source: "Referral", service: "Government Schemes", owner: "Priya S.", status: "Documents Pending", nextAction: "Today, 2:00 PM", priority: "Medium" },
  { id: "LD-2838", name: "Sri Balaji Stores", phone: "+91 77609 55118", source: "Social Media", service: "B2C Services", owner: "Nikhil R.", status: "New Lead", nextAction: "Unassigned", priority: "Medium" },
  { id: "LD-2837", name: "Akash Verma", phone: "+91 90192 33740", source: "Website", service: "PAN Card", owner: "Arjun K.", status: "Application Submitted", nextAction: "Tomorrow, 10:00 AM", priority: "Low" },
  { id: "LD-2836", name: "Noor Insurance Point", phone: "+91 99807 22140", source: "Campaign", service: "Insurance", owner: "Priya S.", status: "Activated", nextAction: "Completed", priority: "Low" },
];

const statusTone: Record<LeadStatus, string> = {
  "New Lead": "bg-hr-soft text-hr border-hr/20",
  Contacted: "bg-muted text-foreground border-border",
  Interested: "bg-india-green/10 text-india-green border-india-green/20",
  "Follow-up Required": "bg-saffron/10 text-saffron border-saffron/20",
  "Documents Pending": "bg-chart-5/10 text-chart-5 border-chart-5/20",
  "Application Submitted": "bg-hr-soft text-hr border-hr/20",
  Activated: "bg-india-green/10 text-india-green border-india-green/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Closed: "bg-muted text-muted-foreground border-border",
};

const KPI = [
  { label: "Calls made", value: 118, target: 150, note: "32 to daily target", icon: PhoneCall },
  { label: "Connected", value: 67, target: 50, note: "134% of target", icon: Headphones },
  { label: "Interested", value: 18, target: 20, note: "2 to daily target", icon: UserCheck },
  { label: "Applications", value: 8, target: 10, note: "2 to daily target", icon: FileCheck2 },
  { label: "Activations", value: 4, target: 5, note: "1 to daily target", icon: CheckCircle2 },
];

const FUNNEL = [
  ["Total Leads", 250], ["Calls Made", 180], ["Connected", 110], ["Interested", 35],
  ["Follow-up", 40], ["Documents Received", 15], ["Applications Submitted", 10], ["Activated", 5],
] as const;

const AGENTS = [
  { name: "Priya Sharma", calls: 126, connected: 72, interested: 21, activated: 5, score: 94 },
  { name: "Arjun Kumar", calls: 118, connected: 67, interested: 18, activated: 4, score: 88 },
  { name: "Nikhil Rao", calls: 104, connected: 58, interested: 16, activated: 3, score: 81 },
  { name: "Farah Khan", calls: 96, connected: 52, interested: 14, activated: 3, score: 78 },
];

function MetricCard({ item }: { item: (typeof KPI)[number] }) {
  const Icon = item.icon;
  const percent = Math.min(100, Math.round((item.value / item.target) * 100));
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p><div className="mt-1 flex items-baseline gap-1"><span className="font-display text-2xl font-extrabold">{item.value}</span><span className="text-xs text-muted-foreground">/ {item.target}</span></div></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-hr-soft text-hr"><Icon className="h-5 w-5" /></span></div>
    <Progress value={percent} className="mt-3 [&>div]:bg-hr" />
    <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{item.note}</p>
  </div>;
}

export function TelecallerModule() {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [activeSection, setActiveSection] = useState("command");
  const filtered = useMemo(() => leads.filter((lead) => {
    const matchesQuery = `${lead.name} ${lead.phone} ${lead.service} ${lead.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "All statuses" || lead.status === statusFilter);
  }), [leads, query, statusFilter]);

  const updateStatus = (id: string, status: LeadStatus) => {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status } : lead));
    toast.success("Lead status updated", { description: `${id} moved to ${status}.` });
  };

  const callLead = (lead: Lead) => {
    if (lead.status === "New Lead") updateStatus(lead.id, "Contacted");
    toast.success(`Calling ${lead.name}`, { description: `${lead.phone} · call logging started.` });
  };

  if (activeSection === "profile" || activeSection === "settings") return <TelecallerShell activeSection={activeSection} onSectionChange={setActiveSection}><div className="mx-auto max-w-[1600px]"><ProfileSettings mode={activeSection} /></div></TelecallerShell>;

  const activeTab = activeSection === "command" || activeSection === "calls" ? "leads" : activeSection === "reports" ? "reporting" : activeSection;

  return <TelecallerShell activeSection={activeSection} onSectionChange={setActiveSection}><div className="mx-auto max-w-[1600px] space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-hr-foreground shadow-elev lg:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-hr/40 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-hr-foreground/10 bg-hr-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"><span className="h-2 w-2 rounded-full bg-india-green" /> Live sales floor · 8 agents online</span><h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Telecaller Command Center</h1><p className="mt-2 max-w-2xl text-sm text-hr-foreground/65">Assign verified leads, log every conversation, schedule next actions, and move prospects toward BharatOne activation.</p><div className="mt-5 flex flex-wrap gap-2"><Button className="bg-hr text-hr-foreground hover:bg-hr/90" onClick={() => toast.success("Lead form opened", { description: "Demo mode: lead entry is ready for integration later." })}><UserPlus /> Add lead</Button><Button variant="outline" className="border-hr-foreground/20 bg-hr-foreground/5 text-hr-foreground hover:bg-hr-foreground/10 hover:text-hr-foreground" onClick={() => toast.success("Assignment complete", { description: "12 new leads distributed using round-robin assignment." })}><UsersRound /> Auto-assign 12 leads</Button></div></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[560px]">{[["Unassigned","12",UserPlus],["Due now","9",AlarmClock],["Callbacks","24",Phone],["Activations","5",CheckCircle2]].map(([label,value,Icon]) => <div key={label as string} className="rounded-2xl border border-hr-foreground/10 bg-hr-foreground/10 p-4 backdrop-blur"><Icon className="h-4 w-4 text-hr"/><p className="mt-3 text-2xl font-extrabold">{value as string}</p><p className="text-[10px] uppercase tracking-wider text-hr-foreground/55">{label as string}</p></div>)}</div>
      </div>
    </section>

    <section><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Daily operating pulse</p><h2 className="font-display text-xl font-extrabold">Your KPI progress</h2></div><Badge variant="outline" className="hidden gap-1 sm:flex"><Clock3 className="h-3 w-3"/> Updated 10:30 AM</Badge></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{KPI.map((item) => <MetricCard key={item.label} item={item}/>)}</div></section>

    <Tabs value={activeTab} onValueChange={setActiveSection} className="space-y-4">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft"><TabsTrigger value="leads">Lead workspace</TabsTrigger><TabsTrigger value="followups">Follow-ups</TabsTrigger><TabsTrigger value="reporting">Daily report</TabsTrigger><TabsTrigger value="performance">Agent performance</TabsTrigger><TabsTrigger value="script">Call script</TabsTrigger></TabsList>

      <TabsContent value="leads" className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"><div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-lg font-extrabold">Lead assignment & outcomes</h2><p className="text-xs text-muted-foreground">{filtered.length} visible · {leads.length} active sample leads</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 sm:w-72"><Search className="h-4 w-4 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lead, phone or service" className="w-full bg-transparent text-sm outline-none"/></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All statuses">All statuses</SelectItem>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-muted/50"><tr>{["Lead","Source / Service","Owner","Status","Next action","Priority","Action"].map((header) => <th key={header} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{header}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map((lead) => <tr key={lead.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-bold">{lead.name}</p><p className="text-[11px] text-muted-foreground">{lead.id} · {lead.phone}</p></td><td className="px-4 py-3"><p className="font-semibold">{lead.service}</p><p className="text-[11px] text-muted-foreground">{lead.source}</p></td><td className="px-4 py-3 font-medium">{lead.owner}</td><td className="px-4 py-3"><Select value={lead.status} onValueChange={(value) => updateStatus(lead.id, value as LeadStatus)}><SelectTrigger className={`h-8 w-48 border ${statusTone[lead.status]}`}><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><CalendarClock className="h-3.5 w-3.5 text-hr"/>{lead.nextAction}</span></td><td className="px-4 py-3"><Badge variant="outline" className={lead.priority === "High" ? "border-destructive/20 bg-destructive/10 text-destructive" : lead.priority === "Medium" ? "border-saffron/20 bg-saffron/10 text-saffron" : "bg-muted text-muted-foreground"}>{lead.priority}</Badge></td><td className="px-4 py-3"><Button size="sm" onClick={() => callLead(lead)}><PhoneCall/> Call now</Button></td></tr>)}</tbody></table></div>
        </section>
      </TabsContent>

      <TabsContent value="followups"><ServiceFollowups leads={leads} onCall={callLead} /></TabsContent>

      <TabsContent value="reporting" className="space-y-4"><div className="grid gap-4 xl:grid-cols-5"><section className="rounded-2xl border border-border bg-card p-5 shadow-soft xl:col-span-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">14 June 2026</p><h2 className="font-display text-lg font-extrabold">Daily reporting dashboard</h2></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{FUNNEL.map(([label,count], index) => <div key={label} className="relative rounded-xl border border-border bg-background p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold">{count}</p>{index < FUNNEL.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-card text-muted-foreground sm:block"/>}</div>)}</div></section><aside className="rounded-2xl border border-border bg-card p-5 shadow-soft xl:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-india-green">Conversion intelligence</p><h2 className="font-display text-lg font-extrabold">Pipeline quality</h2><div className="mt-5 space-y-4">{[["Connection rate","61%",61],["Interest rate","32%",32],["Application rate","29%",29],["Activation rate","50%",50]].map(([label,value,percent]) => <div key={label as string}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold">{label as string}</span><span className="font-bold text-india-green">{value as string}</span></div><Progress value={percent as number} className="[&>div]:bg-india-green"/></div>)}</div></aside></div><ServiceReports leads={leads} /></TabsContent>

      <TabsContent value="performance"><div className="grid gap-4 xl:grid-cols-5"><section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft xl:col-span-3"><div className="border-b border-border p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Team leaderboard</p><h2 className="font-display text-lg font-extrabold">Agent performance</h2></div><div className="divide-y divide-border">{AGENTS.map((agent,index) => <div key={agent.name} className="grid grid-cols-[auto_1fr] gap-3 p-4 sm:grid-cols-[auto_1fr_repeat(4,70px)] sm:items-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-hr-soft font-extrabold text-hr">{index + 1}</span><div><p className="font-bold">{agent.name}</p><Progress value={agent.score} className="mt-1 h-1.5 max-w-52 [&>div]:bg-hr"/></div>{[["Calls",agent.calls],["Connected",agent.connected],["Interested",agent.interested],["Activated",agent.activated]].map(([label,value]) => <div key={label as string} className="hidden text-center sm:block"><p className="font-extrabold">{value as number}</p><p className="text-[9px] uppercase text-muted-foreground">{label as string}</p></div>)}</div>)}</div></section><aside className="space-y-4 xl:col-span-2"><div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-saffron/10 text-saffron"><Award className="h-6 w-6"/></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-saffron">Best telecaller</p><h2 className="font-display text-lg font-extrabold">Priya Sharma</h2></div></div><p className="mt-4 text-xs text-muted-foreground">5 activations · 94 performance score · 72 connected calls today.</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-soft"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-india-green">Incentive estimator</p><div className="mt-3 flex items-end justify-between"><div><p className="text-xs text-muted-foreground">Activation incentive</p><p className="text-2xl font-extrabold">₹1,000</p></div><CircleDollarSign className="h-8 w-8 text-india-green"/></div><p className="mt-2 text-[11px] text-muted-foreground">4 activations × ₹250 · monthly target bonus tracked separately.</p></div></aside></div></TabsContent>

      <TabsContent value="script"><div className="grid gap-4 xl:grid-cols-5"><section className="rounded-2xl border border-border bg-card p-6 shadow-soft xl:col-span-3"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hr-soft text-hr"><PhoneCall className="h-6 w-6"/></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Approved opening</p><h2 className="font-display text-xl font-extrabold">Telecaller script</h2></div></div><blockquote className="mt-6 border-l-4 border-hr bg-hr-soft p-5 text-base font-semibold leading-7 text-foreground">“Good morning, I am calling from BharatOne Services. We provide Government, Banking, Insurance and Digital Services through our authorized centers. May I explain how our services can benefit you?”</blockquote><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => { navigator.clipboard?.writeText("Good morning, I am calling from BharatOne Services. We provide Government, Banking, Insurance and Digital Services through our authorized centers. May I explain how our services can benefit you?"); toast.success("Script copied"); }}><Send/> Copy script</Button><Button variant="outline" onClick={() => toast.info("Coaching mode started")}><Headphones/> Practice call</Button></div></section><aside className="rounded-2xl border border-border bg-card p-5 shadow-soft xl:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Service talking points</p><h2 className="font-display text-lg font-extrabold">Interest categories</h2><div className="mt-4 grid grid-cols-2 gap-2">{["All B2B Center","Banking Services","Insurance","PAN Card","Aadhaar Services","Government Schemes","B2C Services"].map((service) => <div key={service} className="rounded-xl border border-border bg-background p-3 text-xs font-semibold"><Target className="mb-2 h-4 w-4 text-hr"/>{service}</div>)}</div></aside></div></TabsContent>
    </Tabs>
  </div></TelecallerShell>;
}