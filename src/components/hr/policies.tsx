// BharatOne HR — Policies
//
// Company policies staff can read, and that HR can require an acknowledgement for.
// The acknowledgement is the point: it is the record that someone was told.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Loader2,
  X,
  Check,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Policy = {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  body: string | null;
  version: string;
  effective_from: string;
  requires_ack: boolean;
  published: boolean;
  created_at: string;
};

const CATEGORIES = [
  "General",
  "Conduct",
  "Leave & Attendance",
  "Payroll",
  "IT & Security",
  "Health & Safety",
  "Grievance",
];

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const blank = (): Partial<Policy> => ({
  title: "",
  category: "General",
  summary: "",
  body: "",
  version: "1.0",
  effective_from: new Date().toISOString().slice(0, 10),
  requires_ack: false,
  published: false,
});

const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Same mini-markdown the public site pages use: ## heading, - bullet, blank line = new paragraph. */
function renderBody(body: string) {
  return body.split(/\n/).map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith("## "))
      return (
        <h4 key={i} className="mt-3 text-sm font-bold">
          {t.slice(3)}
        </h4>
      );
    if (t.startsWith("- "))
      return (
        <li key={i} className="ml-5 list-disc text-sm text-muted-foreground">
          {t.slice(2)}
        </li>
      );
    return (
      <p key={i} className="text-sm leading-relaxed text-muted-foreground">
        {t}
      </p>
    );
  });
}

export function HrPolicies() {
  const [rows, setRows] = useState<Policy[]>([]);
  const [acks, setAcks] = useState<Record<string, number>>({});
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<Partial<Policy> | null>(null);
  const [view, setView] = useState<Policy | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: pol }, { data: ackRows }, { data: emp }] = await Promise.all([
      db.from("hr_policies").select("*").order("effective_from", { ascending: false }),
      db.from("hr_policy_acks").select("policy_id"),
      db.rpc("hr_employees_list", { p_q: null, p_status: null }),
    ]);
    setRows((pol as Policy[]) ?? []);
    const counted: Record<string, number> = {};
    for (const a of (ackRows as any[]) ?? [])
      counted[a.policy_id] = (counted[a.policy_id] ?? 0) + 1;
    setAcks(counted);
    setStaffCount(((emp as any[]) ?? []).length);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!edit?.title?.trim()) return toast.error("Give the policy a title");
    setSaving(true);
    const payload = {
      title: edit.title.trim(),
      category: edit.category ?? "General",
      summary: edit.summary ?? null,
      body: edit.body ?? null,
      version: edit.version ?? "1.0",
      effective_from: edit.effective_from,
      requires_ack: !!edit.requires_ack,
      published: !!edit.published,
      updated_at: new Date().toISOString(),
    };
    const { error } = edit.id
      ? await db.from("hr_policies").update(payload).eq("id", edit.id)
      : await db.from("hr_policies").insert(payload);
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success(edit.id ? "Policy updated" : "Policy created");
    setEdit(null);
    load();
  };

  const togglePublish = async (p: Policy) => {
    const { error } = await db
      .from("hr_policies")
      .update({ published: !p.published, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error("Could not change", { description: error.message });
    toast.success(
      p.published ? "Unpublished — staff can no longer see it" : "Published to all staff",
    );
    load();
  };

  const remove = async (p: Policy) => {
    if (!confirm(`Delete “${p.title}”? Any acknowledgements recorded against it are deleted too.`))
      return;
    const { error } = await db.from("hr_policies").delete().eq("id", p.id);
    if (error) return toast.error("Could not delete", { description: error.message });
    toast.success("Policy deleted");
    load();
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      [r.title, r.category, r.summary].filter(Boolean).join(" ").toLowerCase().includes(n),
    );
  }, [rows, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <BookOpen className="h-5 w-5 text-india-green" /> Policies
          </h2>
          <p className="text-sm text-muted-foreground">
            Published policies are visible to all staff. Mark one as requiring acknowledgement to
            record who has read it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setEdit(blank())}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" /> New policy
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search policies…"
          className={`${inp} pl-9`}
        />
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-india-green" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? "No policies yet. Create one — leave policy, code of conduct, IT usage — and publish it to staff."
            : "No policies match that search."}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.category} · v{p.version} · effective {d(p.effective_from)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    p.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.published ? "Published" : "Draft"}
                </span>
              </div>

              {p.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
              )}

              {p.requires_ack && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  <ShieldCheck className="h-3 w-3" />
                  {acks[p.id] ?? 0} of {staffCount} acknowledged
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setView(p)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                >
                  Read
                </button>
                <button
                  onClick={() => setEdit(p)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => togglePublish(p)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                >
                  {p.published ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Publish
                    </>
                  )}
                </button>
                <button
                  onClick={() => remove(p)}
                  className="rounded-lg border border-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view && (
        <Modal title={view.title} onClose={() => setView(null)} wide>
          <p className="text-[11px] text-muted-foreground">
            {view.category} · version {view.version} · effective {d(view.effective_from)}
          </p>
          {view.summary && (
            <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">{view.summary}</p>
          )}
          <div className="mt-4 space-y-1">
            {view.body ? (
              renderBody(view.body)
            ) : (
              <p className="text-sm text-muted-foreground">
                No content has been written for this policy yet.
              </p>
            )}
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title={edit.id ? "Edit policy" : "New policy"} onClose={() => setEdit(null)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <Lbl>Title</Lbl>
              <input
                className={inp}
                value={edit.title ?? ""}
                placeholder="Leave and Attendance Policy"
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label className="block">
              <Lbl>Category</Lbl>
              <select
                className={inp}
                value={edit.category ?? "General"}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Lbl>Version</Lbl>
              <input
                className={inp}
                value={edit.version ?? "1.0"}
                onChange={(e) => setEdit({ ...edit, version: e.target.value })}
              />
            </label>
            <label className="block">
              <Lbl>Effective from</Lbl>
              <input
                type="date"
                className={inp}
                value={edit.effective_from ?? ""}
                onChange={(e) => setEdit({ ...edit, effective_from: e.target.value })}
              />
            </label>
            <div className="flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-india-green"
                  checked={!!edit.requires_ack}
                  onChange={(e) => setEdit({ ...edit, requires_ack: e.target.checked })}
                />
                Requires acknowledgement
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-india-green"
                  checked={!!edit.published}
                  onChange={(e) => setEdit({ ...edit, published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <label className="block sm:col-span-2">
              <Lbl>Summary — one or two lines shown in the list</Lbl>
              <textarea
                className={`${inp} h-16 py-2`}
                value={edit.summary ?? ""}
                onChange={(e) => setEdit({ ...edit, summary: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <Lbl>Policy text</Lbl>
              <textarea
                className={`${inp} h-56 py-2 font-mono text-xs`}
                value={edit.body ?? ""}
                placeholder={
                  "## Purpose\nWhy this policy exists.\n\n## Scope\n- Applies to all full time staff\n- Reviewed annually"
                }
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Start a line with ## for a heading and - for a bullet. Leave a blank line between
                paragraphs.
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEdit(null)}
              className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
    {children}
  </span>
);

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[88vh] w-full overflow-auto rounded-2xl bg-card p-6 shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default HrPolicies;
