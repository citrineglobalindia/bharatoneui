import { createFileRoute } from "@tanstack/react-router";
import { Users, ShieldCheck, Clock } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader, StatusBadge } from "@/components/retailer/page-header";

export const Route = createFileRoute("/qc/reviewers")({
  head: () => ({ meta: [{ title: "Reviewers — QC Portal" }] }),
  component: ReviewersPage,
});

const REVIEWERS = [
  { name: "Anil Kumar", id: "9845224260", level: "Level 2", status: "Online", approved: 124, rejected: 8, hold: 3, sla: "98%" },
  { name: "Priya Menon", id: "9844112233", level: "Level 2", status: "Online", approved: 98, rejected: 11, hold: 5, sla: "95%" },
  { name: "Rahul Verma", id: "9876551122", level: "Level 1", status: "Away", approved: 67, rejected: 6, hold: 2, sla: "92%" },
  { name: "Sneha Iyer", id: "9900112233", level: "Level 3", status: "Online", approved: 201, rejected: 14, hold: 4, sla: "99%" },
  { name: "Mohammed Ali", id: "9888776655", level: "Level 1", status: "Offline", approved: 42, rejected: 3, hold: 1, sla: "90%" },
];

function ReviewersPage() {
  return (
    <QcShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          title="Reviewers"
          subtitle="QC team members, workload and SLA performance."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI icon={<Users className="h-4 w-4" />} label="Total Reviewers" value="5" accent="bg-indigo-500/10 text-indigo-700" />
          <KPI icon={<ShieldCheck className="h-4 w-4" />} label="Online Now" value="3" accent="bg-emerald-500/10 text-emerald-700" />
          <KPI icon={<Clock className="h-4 w-4" />} label="Avg SLA" value="94.8%" accent="bg-amber-500/10 text-amber-700" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Reviewer</th>
                <th className="text-left px-4 py-3 font-bold">Level</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-bold">Approved</th>
                <th className="text-right px-4 py-3 font-bold">Rejected</th>
                <th className="text-right px-4 py-3 font-bold">On Hold</th>
                <th className="text-right px-4 py-3 font-bold">SLA</th>
              </tr>
            </thead>
            <tbody>
              {REVIEWERS.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                        {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-700 px-2 py-1 rounded">{r.level}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{r.approved}</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700">{r.rejected}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{r.hold}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </QcShell>
  );
}

function KPI({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div>
        <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
        <p className="text-xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}