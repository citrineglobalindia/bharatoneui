import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LifeBuoy, Plus, Phone, Mail, MessageSquare } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";
import { DataTable, type Column } from "@/components/retailer/data-table";
import { SectionCard, Field, Input, Select, PrimaryButton } from "@/components/retailer/section-card";
import { MOCK_TICKETS, type Ticket } from "@/components/retailer/mock-data";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — BharatOne" }] }),
  component: SupportPage,
});

const cols: Column<Ticket>[] = [
  { key: "id", header: "Ticket", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: "subject", header: "Subject", cell: (r) => <span className="font-medium">{r.subject}</span> },
  { key: "category", header: "Category", cell: (r) => r.category },
  { key: "created", header: "Created", cell: (r) => <span className="text-xs text-muted-foreground">{r.created}</span> },
  { key: "priority", header: "Priority", cell: (r) => <StatusBadge status={r.priority} /> },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function SupportPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader icon={<LifeBuoy className="h-5 w-5" />} title="Support Tickets" subtitle="Get help from our retailer success team" />

        <div className="grid sm:grid-cols-3 gap-3">
          <a href="tel:18001234567" className="rounded-xl border border-border bg-card p-4 hover:shadow-elev transition flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Phone className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold">Call us</p><p className="text-xs text-muted-foreground">1800 123 4567 · 8am–10pm</p></div>
          </a>
          <a href="mailto:help@bharatone.in" className="rounded-xl border border-border bg-card p-4 hover:shadow-elev transition flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center"><Mail className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold">Email</p><p className="text-xs text-muted-foreground">help@bharatone.in</p></div>
          </a>
          <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500 text-white flex items-center justify-center"><MessageSquare className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold">Live Chat</p><p className="text-xs text-muted-foreground">Avg response 2 min</p></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <SectionCard title="Raise a Ticket" action={<Plus className="h-4 w-4 text-muted-foreground" />}>
              <form onSubmit={(e) => { e.preventDefault(); toast.success("Ticket created — TKT-9830"); }} className="space-y-3">
                <Field label="Category">
                  <Select><option>Financial</option><option>Wallet</option><option>Business</option><option>Account</option><option>Technical</option></Select>
                </Field>
                <Field label="Priority">
                  <Select><option>Low</option><option>Medium</option><option>High</option></Select>
                </Field>
                <Field label="Subject"><Input placeholder="Brief summary" /></Field>
                <Field label="Describe the issue">
                  <textarea rows={4} className="w-full rounded-lg border border-input bg-background p-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green" placeholder="Provide details, txn IDs, screenshots…" />
                </Field>
                <PrimaryButton type="submit" className="w-full">Submit Ticket</PrimaryButton>
              </form>
            </SectionCard>
          </div>
          <div className="lg:col-span-2">
            <SectionCard title="Your Tickets">
              <DataTable columns={cols} rows={MOCK_TICKETS} />
            </SectionCard>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}