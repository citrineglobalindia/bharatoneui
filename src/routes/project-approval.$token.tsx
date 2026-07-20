import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, FolderKanban, AlertTriangle, ShieldCheck } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/project-approval/$token")({
  head: () => ({ meta: [{ title: "Project Approval — BharatOne" }] }),
  component: ProjectApprovalPage,
});

type Task = { id: string; title: string; description: string | null; status: string; client_comment: string | null };
type Info = { name: string; client_name: string | null; status: string; tasks: Task[] };

function ProjectApprovalPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.rpc("get_project_for_approval", { _token: token });
    setInfo((data as Info) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const decide = async (taskId: string, decision: "approved" | "rejected") => {
    setBusyId(taskId);
    try {
      const { error } = await supabase.rpc("decide_project_task", { _token: token, _task_id: taskId, _decision: decision, _comment: comments[taskId] || null });
      if (error) { toast.error("Could not save", { description: error.message }); return; }
      toast.success(decision === "approved" ? "Task approved" : "Task rejected");
      setInfo((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, status: decision, client_comment: comments[taskId] || t.client_comment } : t) } : prev);
    } finally { setBusyId(null); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-tricolor"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>;

  if (!info) {
    return (
      <div className="grid min-h-screen place-items-center bg-tricolor p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elev">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 font-bold">This approval link is not valid</p>
          <p className="mt-1 text-sm text-muted-foreground">The link may be incorrect or the project has been removed. Please contact BharatOne.</p>
        </div>
      </div>
    );
  }

  const done = info.tasks.filter((t) => t.status !== "pending").length;

  return (
    <div className="min-h-screen bg-tricolor p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-center pt-4"><BharatOneLogo size="lg" /></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-india-green/5 to-transparent p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-india-green/10 text-india-green"><FolderKanban className="h-6 w-6" /></span>
            <div>
              <p className="font-display text-lg font-extrabold">{info.name}</p>
              <p className="text-xs text-muted-foreground">{info.client_name ? `${info.client_name} · ` : ""}Review and approve the tasks below · {done}/{info.tasks.length} decided</p>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {info.tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks to review yet.</p>
            ) : info.tasks.map((t) => {
              const decided = t.status !== "pending";
              return (
                <div key={t.id} className={`rounded-xl border p-4 ${t.status === "approved" ? "border-emerald-200 bg-emerald-50/40" : t.status === "rejected" ? "border-rose-200 bg-rose-50/40" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.title}</p>
                      {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${t.status === "approved" ? "bg-emerald-100 text-emerald-700" : t.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {t.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : t.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />} {t.status}
                    </span>
                  </div>

                  {decided ? (
                    t.client_comment && <p className="mt-2 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"><b>Your note:</b> {t.client_comment}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <input
                        value={comments[t.id] ?? ""}
                        onChange={(e) => setComments((c) => ({ ...c, [t.id]: e.target.value }))}
                        placeholder="Add a note (optional)"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => decide(t.id, "approved")} disabled={busyId === t.id} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-60">
                          {busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
                        </button>
                        <button onClick={() => decide(t.id, "rejected")} disabled={busyId === t.id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-4 h-9 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-india-green" /> Your approvals are recorded securely and visible to the BharatOne team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
