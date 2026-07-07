import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, FolderKanban, Link2, Copy, ArrowLeft, CheckCircle2, XCircle, Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Project = { id: string; name: string; client_name: string | null; client_email: string | null; approval_token: string; status: string; created_at: string };
type Task = { id: string; project_id: string; title: string; description: string | null; status: string; client_comment: string | null; decided_at: string | null; sort_order: number };

const statusPill = (s: string) =>
  s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
const statusIcon = (s: string) =>
  s === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />;

export function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Project | null>(null);

  const [pName, setPName] = useState("");
  const [pClient, setPClient] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadProjects() {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data as Project[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { loadProjects(); }, []);

  const addProject = async () => {
    if (!pName.trim()) { toast.error("Enter a project name"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("projects").insert({ name: pName.trim(), client_name: pClient.trim() || null, client_email: pEmail.trim() || null });
      if (error) { toast.error("Failed", { description: error.message }); return; }
      toast.success("Project created");
      setPName(""); setPClient(""); setPEmail("");
      loadProjects();
    } finally { setBusy(false); }
  };
  const removeProject = async (p: Project) => {
    if (!confirm(`Delete project "${p.name}" and all its tasks?`)) return;
    await supabase.from("projects").delete().eq("id", p.id);
    toast.success("Deleted");
    loadProjects();
  };

  if (open) return <ProjectDetail project={open} onBack={() => { setOpen(null); loadProjects(); }} />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><FolderKanban className="h-4 w-4 text-india-green" /> New project</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Create a project, add tasks inside it, then share the client link — the client approves or rejects each task.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Project name *" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={pClient} onChange={(e) => setPClient(e.target.value)} placeholder="Client name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="Client email" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <button onClick={addProject} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create project
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Projects ({projects.length})</p>
        {loading ? (
          <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
        ) : projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.client_name || "—"}{p.client_email ? ` · ${p.client_email}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-india-green/10 px-2 py-0.5 text-[10px] font-bold capitalize text-india-green">{p.status}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setOpen(p)} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white hover:bg-india-green/90"><ListChecks className="h-3.5 w-3.5" /> Open tasks</button>
                  <button onClick={() => removeProject(p)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 h-9 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/project-approval/${project.approval_token}`;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("project_tasks").select("*").eq("project_id", project.id).order("sort_order").order("created_at");
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [project.id]);

  const addTask = async () => {
    if (!title.trim()) { toast.error("Enter a task title"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("project_tasks").insert({ project_id: project.id, title: title.trim(), description: desc.trim() || null, sort_order: tasks.length });
      if (error) { toast.error("Failed", { description: error.message }); return; }
      toast.success("Task added");
      setTitle(""); setDesc("");
      load();
    } finally { setBusy(false); }
  };
  const removeTask = async (t: Task) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("project_tasks").delete().eq("id", t.id);
    load();
  };
  const copyLink = () => { navigator.clipboard?.writeText(link); toast.success("Client link copied"); };

  const counts = {
    approved: tasks.filter((t) => t.status === "approved").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
    pending: tasks.filter((t) => t.status === "pending").length,
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to projects</button>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><FolderKanban className="h-5 w-5 text-india-green" /> {project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.client_name || "—"}{project.client_email ? ` · ${project.client_email}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">{counts.approved} approved</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">{counts.rejected} rejected</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{counts.pending} pending</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-xs font-semibold hover:bg-muted"><Link2 className="h-3.5 w-3.5" /> Open client link</a>
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-3 h-9 text-xs font-semibold text-white hover:bg-india-green/90"><Copy className="h-3.5 w-3.5" /> Copy link</button>
          </div>
        </div>
        <p className="mt-2 break-all rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">{link}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-india-green" /> Add task</p>
        <div className="mt-2 grid gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Description (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div><button onClick={addTask} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-10 text-sm font-semibold text-white hover:bg-india-green/90 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add task</button></div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Tasks ({tasks.length})</p>
        {loading ? (
          <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet. Add tasks above, then share the client link for approval.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                    {t.client_comment && <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"><b>Client note:</b> {t.client_comment}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusPill(t.status)}`}>{statusIcon(t.status)} {t.status}</span>
                    <button onClick={() => removeTask(t)} className="rounded-md border border-rose-200 px-1.5 py-1 text-rose-600 hover:bg-rose-50" aria-label="Delete task"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
