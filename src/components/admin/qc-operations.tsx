import { useMemo, useState } from "react";
import {
  CheckCircle2, ClipboardCheck, Clock3, Download, FileSearch, Flag,
  Search, ShieldAlert, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "Pending" | "Approved" | "Flagged";
type Case = { id: string; applicant: string; docType: string; reviewer: string; risk: "Low" | "Medium" | "High"; status: Status; submitted: string };

const KPI: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[] = [
  { label: "Queue pending", value: "116", detail: "34 high priority", icon: ClipboardCheck, tone: "bg-admin-warning-soft text-admin-warning" },
  { label: "Approved today", value: "284", detail: "+12% vs avg", icon: CheckCircle2, tone: "bg-admin-success-soft text-admin-success" },
  { label: "Flagged for fraud", value: "9", detail: "2 escalated", icon: ShieldAlert, tone: "bg-admin-danger-soft text-admin-danger" },
  { label: "Avg review time", value: "3m 42s", detail: "SLA 5m", icon: Clock3, tone: "bg-admin-soft text-admin" },
];

const SEED: Case[] = [
  { id: "KYC-8841", applicant: "Ramesh Kumar", docType: "Aadhaar + PAN", reviewer: "Priya Nair", risk: "Low", status: "Pending", submitted: "Today 11:02" },
  { id: "KYC-8840", applicant: "Lakshmi Stores", docType: "GST + Bank", reviewer: "Unassigned", risk: "Medium", status: "Pending", submitted: "Today 10:31" },
  { id: "KYC-8839", applicant: "Suresh Babu", docType: "Aadhaar + Selfie", reviewer: "Arjun Rao", risk: "High", status: "Flagged", submitted: "Today 09:50" },
  { id: "KYC-8838", applicant: "Vijaya Digital", docType: "PAN + Cheque", reviewer: "Priya Nair", risk: "Low", status: "Approved", submitted: "Today 09:12" },
  { id: "KYC-8837", applicant: "Kaveri Mart", docType: "Aadhaar + PAN", reviewer: "Arjun Rao", risk: "Medium", status: "Pending", submitted: "Today 08:44" },
  { id: "KYC-8836", applicant: "Namma Center", docType: "GST + Bank", reviewer: "Unassigned", risk: "High", status: "Flagged", submitted: "Yesterday 17:20" },
];

const STATUS_TONE: Record<Status, string> = {
  Pending: "bg-admin-warning-soft text-admin-warning",
  Approved: "bg-admin-success-soft text-admin-success",
  Flagged: "bg-admin-danger-soft text-admin-danger",
};
const RISK_TONE: Record<Case["risk"], string> = {
  Low: "bg-admin-success-soft text-admin-success",
  Medium: "bg-admin-warning-soft text-admin-warning",
  High: "bg-admin-danger-soft text-admin-danger",
};

export function QcOperations() {
  const [cases, setCases] = useState<Case[]>(SEED);
  const [tab, setTab] = useState("Pending");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return cases.filter((c) => {
      const matchTab = tab === "All" || c.status === tab;
      const matchQ = !t || `${c.id} ${c.applicant} ${c.docType} ${c.reviewer}`.toLowerCase().includes(t);
      return matchTab && matchQ;
    });
  }, [cases, tab, query]);

  const setStatus = (id: string, status: Status) => {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    toast.success(`${id} ${status.toLowerCase()}`);
  };

  const exportCases = () => {
    downloadCsv("qc-operations.csv", ["ID", "Applicant", "Documents", "Reviewer", "Risk", "Status", "Submitted"],
      cases.map((c) => [c.id, c.applicant, c.docType, c.reviewer, c.risk, c.status, c.submitted]));
    toast.success("QC queue exported");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((k) => { const Icon = k.icon; return (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", k.tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">{k.value}</p><p className="mt-1 text-[10px] font-semibold text-muted-foreground">{k.detail}</p>
          </div>
        ); })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="Pending">Pending</TabsTrigger><TabsTrigger value="Flagged">Flagged</TabsTrigger><TabsTrigger value="Approved">Approved</TabsTrigger><TabsTrigger value="All">All</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-9 w-44 border-0 bg-transparent px-0 focus-visible:ring-0" /></div>
          <Button size="sm" className="bg-admin text-admin-foreground hover:bg-admin/90" onClick={exportCases}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left">
          <thead className="bg-muted/40 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><tr>{["Case", "Applicant", "Documents", "Reviewer", "Risk", "Status", "Action"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c.id} className="text-[11px] transition hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-semibold">{c.id}</td>
                <td className="px-4 py-3"><p className="font-bold">{c.applicant}</p><p className="text-[9px] text-muted-foreground">{c.submitted}</p></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 font-semibold"><FileSearch className="h-3 w-3 text-muted-foreground" />{c.docType}</span></td>
                <td className="px-4 py-3 font-semibold">{c.reviewer}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", RISK_TONE[c.risk])}>{c.risk}</span></td>
                <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", STATUS_TONE[c.status])}>{c.status}</span></td>
                <td className="px-4 py-3">{c.status !== "Approved" ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-success" onClick={() => setStatus(c.id, "Approved")}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                    {c.status !== "Flagged" && <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] text-admin-danger" onClick={() => setStatus(c.id, "Flagged")}><Flag className="h-3 w-3" /> Flag</Button>}
                  </div>
                ) : <span className="text-[10px] text-muted-foreground">Cleared</span>}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="px-4 py-16 text-center text-xs text-muted-foreground">No cases match.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}