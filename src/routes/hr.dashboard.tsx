import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BadgeIndianRupee, BellRing, BriefcaseBusiness,
  Cake, CalendarCheck, CheckCircle2, CircleDollarSign, ClipboardCheck,
  Clock3, FileChartColumn, FileCheck2, FileClock, FileWarning, Goal,
  GraduationCap, Home, Laptop2, Mail, Medal, MinusCircle, PartyPopper,
  PieChart, ReceiptIndianRupee, Send, ShieldCheck, Star, TrendingDown,
  UserCheck, UserMinus, UserPlus, UsersRound, WalletCards, XCircle,
  type LucideIcon,
} from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/hr/dashboard")({
  head: () => ({ meta: [
    { title: "HR Dashboard — BharatOne" },
    { name: "description", content: "BharatOne workforce, attendance, leave, recruitment, payroll and performance dashboard." },
  ] }),
  component: HrDashboard,
});

type Tone = "blue" | "green" | "amber" | "rose" | "violet" | "slate";
const TONES: Record<Tone, { icon: string; soft: string; bar: string }> = {
  blue: { icon: "text-hr", soft: "bg-hr-soft", bar: "bg-hr" },
  green: { icon: "text-india-green", soft: "bg-india-green/10", bar: "bg-india-green" },
  amber: { icon: "text-saffron", soft: "bg-saffron/10", bar: "bg-saffron" },
  rose: { icon: "text-destructive", soft: "bg-destructive/10", bar: "bg-destructive" },
  violet: { icon: "text-chart-5", soft: "bg-chart-5/10", bar: "bg-chart-5" },
  slate: { icon: "text-muted-foreground", soft: "bg-muted", bar: "bg-muted-foreground" },
};

type Metric = { label: string; value: string; icon: LucideIcon; tone: Tone; detail?: string; progress?: number };

const attendance: Metric[] = [
  { label: "Present Today", value: "231", icon: UserCheck, tone: "green", detail: "92.4% attendance" },
  { label: "Absent Today", value: "8", icon: UserMinus, tone: "rose", detail: "3.2% of workforce" },
  { label: "Late Login", value: "6", icon: Clock3, tone: "amber", detail: "Requires review" },
  { label: "Work From Home", value: "11", icon: Laptop2, tone: "blue", detail: "Approved today" },
  { label: "On Leave", value: "4", icon: Home, tone: "violet", detail: "2 planned · 2 sick" },
];
const leave: Metric[] = [
  { label: "Pending Requests", value: "14", icon: FileClock, tone: "amber", detail: "5 urgent" },
  { label: "Approved Leaves", value: "37", icon: CheckCircle2, tone: "green", detail: "This month" },
  { label: "Rejected Leaves", value: "3", icon: XCircle, tone: "rose", detail: "This month" },
  { label: "Avg. Leave Balance", value: "12.5", icon: PieChart, tone: "blue", detail: "Days per employee" },
];
const recruitment: Metric[] = [
  { label: "Open Positions", value: "18", icon: BriefcaseBusiness, tone: "blue", detail: "Across 7 teams" },
  { label: "Applications", value: "426", icon: FileCheck2, tone: "violet", detail: "+38 this week" },
  { label: "Interviews", value: "24", icon: CalendarCheck, tone: "amber", detail: "Next 7 days" },
  { label: "Offers Released", value: "9", icon: Send, tone: "green", detail: "6 accepted" },
  { label: "Candidates Joined", value: "7", icon: UserPlus, tone: "green", detail: "This month" },
];
const onboarding: Metric[] = [
  { label: "Pending Documentation", value: "12", icon: FileWarning, tone: "amber", detail: "4 overdue" },
  { label: "Verified Employees", value: "238", icon: ShieldCheck, tone: "green", detail: "95.2% verified", progress: 95 },
  { label: "Training Completion", value: "88%", icon: GraduationCap, tone: "blue", detail: "22 in progress", progress: 88 },
];
const payroll: Metric[] = [
  { label: "Salary Processed", value: "₹1.42 Cr", icon: CircleDollarSign, tone: "green", detail: "226 employees" },
  { label: "Pending Salary", value: "₹8.6 L", icon: WalletCards, tone: "amber", detail: "24 employees" },
  { label: "PF / ESI Status", value: "96%", icon: BadgeIndianRupee, tone: "blue", detail: "10 items pending", progress: 96 },
  { label: "Reimbursements", value: "₹3.8 L", icon: ReceiptIndianRupee, tone: "violet", detail: "31 open claims" },
];
const performance: Metric[] = [
  { label: "Pending Appraisals", value: "32", icon: ClipboardCheck, tone: "amber", detail: "Due by 30 Jun" },
  { label: "Goal Completion", value: "78%", icon: Goal, tone: "blue", detail: "+6% vs last cycle", progress: 78 },
  { label: "Avg. Performance", value: "4.2", icon: Star, tone: "green", detail: "Out of 5.0", progress: 84 },
];

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const tone = TONES[metric.tone];
  return <div className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elev">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-1 font-display text-2xl font-extrabold text-foreground">{metric.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.soft} ${tone.icon}`}><Icon className="h-5 w-5" /></span></div>
    {metric.progress !== undefined && <Progress value={metric.progress} className={`mt-3 [&>div]:${tone.bar}`} />}
    {metric.detail && <p className="mt-2 text-[11px] font-medium text-muted-foreground">{metric.detail}</p>}
  </div>;
}

function ModuleSection({ id, eyebrow, title, metrics, columns = 4, onOpen }: { id: string; eyebrow: string; title: string; metrics: Metric[]; columns?: number; onOpen: () => void }) {
  return <section id={id} className="scroll-mt-20">
    <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">{eyebrow}</p><h2 className="font-display text-lg font-extrabold">{title}</h2></div><Button variant="ghost" size="sm" className="text-hr" onClick={onOpen}>View details <ArrowRight /></Button></div>
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns === 5 ? "xl:grid-cols-5" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>
  </section>;
}

function HrDashboard() {
  const navigate = useNavigate();
  const action = (label: string) => toast.success(`${label} started`, { description: "The HR workflow is ready for your input." });
  return <HrShell><div id="overview" className="mx-auto max-w-[1600px] space-y-7">
    <section className="relative overflow-hidden rounded-2xl bg-navy p-5 text-hr-foreground shadow-elev lg:p-6">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-hr/30 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-hr-foreground/60">Sunday, 14 June 2026</p><h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Good morning, Ananya</h1><p className="mt-1 text-sm text-hr-foreground/70">Here’s what’s happening across BharatOne’s workforce today.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{l:"Total Employees",v:"250",i:UsersRound},{l:"Active",v:"242",i:UserCheck},{l:"New Joiners",v:"12",i:UserPlus},{l:"Resigned",v:"8",i:TrendingDown}].map(x => <div key={x.l} className="min-w-28 rounded-xl border border-hr-foreground/10 bg-hr-foreground/10 p-3 backdrop-blur"><x.i className="mb-2 h-4 w-4 text-hr-foreground/70"/><p className="text-xl font-extrabold">{x.v}</p><p className="text-[10px] text-hr-foreground/60">{x.l}</p></div>)}</div></div>
    </section>

    <section aria-label="Quick actions"><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Command Center</p><h2 className="font-display text-lg font-extrabold">Quick Actions</h2></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{[
      ["Add Employee",UserPlus],["Approve Leave",ClipboardCheck],["Process Payroll",CircleDollarSign],["Generate Reports",FileChartColumn],["Send Announcement",Mail],
    ].map(([label, Icon], index) => <Button key={label as string} variant="outline" className="h-14 justify-start rounded-xl bg-card px-4 shadow-soft hover:border-hr hover:bg-hr-soft" onClick={() => navigate({ to: ["/hr/employees","/hr/leave","/hr/payroll","/hr/reports","/hr/employees"][index] })}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hr-soft text-hr"><Icon className="h-4 w-4" /></span><span className="text-xs font-bold">{label as string}</span></Button>)}</div></section>

    <ModuleSection id="attendance" eyebrow="Daily workforce" title="Attendance" metrics={attendance} columns={5} onOpen={() => navigate({ to: "/hr/attendance" })} />
    <ModuleSection id="leave" eyebrow="Time off" title="Leave Management" metrics={leave} onOpen={() => navigate({ to: "/hr/leave" })} />
    <ModuleSection id="recruitment" eyebrow="Talent pipeline" title="Recruitment" metrics={recruitment} columns={5} onOpen={() => navigate({ to: "/hr/recruitment" })} />
    <div className="grid grid-cols-1 gap-7 xl:grid-cols-2"><ModuleSection id="onboarding" eyebrow="Employee readiness" title="Onboarding" metrics={onboarding} columns={3} onOpen={() => navigate({ to: "/hr/onboarding" })} /><ModuleSection id="performance" eyebrow="Growth & outcomes" title="Performance" metrics={performance} columns={3} onOpen={() => navigate({ to: "/hr/performance" })} /></div>
    <ModuleSection id="payroll" eyebrow="Compensation" title="Payroll" metrics={payroll} onOpen={() => navigate({ to: "/hr/payroll" })} />

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <section className="rounded-xl border border-border bg-card shadow-soft xl:col-span-3"><div className="flex items-center justify-between border-b border-border p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">Attention needed</p><h2 className="font-display text-lg font-extrabold">Alerts & Notifications</h2></div><BellRing className="h-5 w-5 text-destructive" /></div><div className="divide-y divide-border">{[
        ["Expiring Documents","18 employee documents expire within 30 days",FileWarning,"Review now"],
        ["Probation Completion","7 employees complete probation this month",Medal,"Start review"],
        ["Birthdays & Anniversaries","4 birthdays and 6 work anniversaries this week",Cake,"Send wishes"],
        ["Policy Updates","Work From Home Policy v3 requires acknowledgement",AlertTriangle,"View policy"],
      ].map(([title,desc,Icon,cta]) => <div key={title as string} className="flex items-center gap-3 p-4 hover:bg-muted/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title as string}</p><p className="truncate text-xs text-muted-foreground">{desc as string}</p></div><Button variant="ghost" size="sm" className="hidden text-hr sm:inline-flex" onClick={() => action(cta as string)}>{cta as string}<ArrowRight /></Button></div>)}</div></section>
      <section id="reports" className="rounded-xl border border-border bg-card p-4 shadow-soft xl:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hr">Analytics center</p><h2 className="font-display text-lg font-extrabold">Reports</h2><p className="mt-1 text-xs text-muted-foreground">Download current workforce insights in one click.</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{[
        ["Employee Report",UsersRound],["Attendance Report",CalendarCheck],["Leave Report",FileClock],["Payroll Report",BadgeIndianRupee],["Recruitment Report",BriefcaseBusiness],["Attrition Report",MinusCircle],
      ].map(([label,Icon]) => <Button key={label as string} variant="outline" className="h-11 justify-start px-3 text-xs" onClick={() => toast.success(`${label as string} generated`)}><Icon className="text-hr" />{label as string}</Button>)}</div><div className="mt-4 rounded-xl bg-hr-soft p-4"><div className="flex items-center gap-2 text-hr"><PartyPopper className="h-4 w-4"/><p className="text-xs font-bold">Monthly HR snapshot is ready</p></div><p className="mt-1 text-[11px] text-muted-foreground">Updated today at 08:30 IST</p><Button size="sm" className="mt-3 bg-hr text-hr-foreground hover:bg-hr/90" onClick={() => action("Monthly snapshot")}>Download snapshot</Button></div></section>
    </div>
  </div></HrShell>;
}