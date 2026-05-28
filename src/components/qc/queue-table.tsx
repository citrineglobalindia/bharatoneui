import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/retailer/page-header";
import type { KycApplicant } from "./mock-data";

export function QueueTable({ data, emptyLabel = "No applications match your filters." }: { data: KycApplicant[]; emptyLabel?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-bold">KYC ID</th>
              <th className="text-left px-4 py-3 font-bold">Applicant</th>
              <th className="text-left px-4 py-3 font-bold">Documents</th>
              <th className="text-left px-4 py-3 font-bold">Face Match</th>
              <th className="text-left px-4 py-3 font-bold">Liveness</th>
              <th className="text-left px-4 py-3 font-bold">Risk</th>
              <th className="text-left px-4 py-3 font-bold">Status</th>
              <th className="text-left px-4 py-3 font-bold">Submitted</th>
              <th className="text-right px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => {
              const verified = a.documents.filter((d) => d.verified).length;
              return (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold flex items-center gap-1.5">
                      {a.name}
                      {a.flags.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{a.phone} · {a.channel}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-bold">{verified}</span>
                    <span className="text-muted-foreground"> / {a.documents.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${a.matchScore > 90 ? "text-emerald-700" : a.matchScore > 75 ? "text-amber-700" : "text-rose-700"}`}>
                      {a.matchScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${a.livenessScore > 90 ? "text-emerald-700" : a.livenessScore > 75 ? "text-amber-700" : "text-rose-700"}`}>
                      {a.livenessScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.risk} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status === "Pending Review" ? "pending" : a.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.submittedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/qc/kyc-review/$id"
                      params={{ id: a.id }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-3 h-8 text-xs font-bold hover:bg-indigo-700"
                    >
                      Review <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}