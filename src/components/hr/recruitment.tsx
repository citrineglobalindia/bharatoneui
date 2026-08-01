// BharatOne HR — Recruitment
//
// Openings and the candidate pipeline. Moving a candidate to Hired seeds their
// onboarding checklist automatically — that hand-off is the step most often forgotten
// when it is done by hand.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BriefcaseBusiness, Plus, RefreshCw, Loader2, X, Search, Star, Users,
  ArrowRight, Mail, Phone, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type Opening = {
  id: string; title: string; department: string | null; designation: string | null;
  location: string | null; vacancies: number; status: string; opened_on: string;
  salary_from: number | null; salary_to: number | null; description: string | null;
};
type Cand = {
  id: string; full_name: string; email: string | null; phone: string | null; source: string;
  opening_id: string | null; opening_title: string | null; department: string | null;
  current_stage: string; stage_name: string; colour: string; sort_order: number; is_final: boolean;
  rating: number | null; expected_salary: number | null; offered_salary: number | null;
  applied_on: string; notes: string | null; onboarding_done: number; onboarding_total: number;
};
type Stage = { code: string; name: string; colour: string; sort_order: number; is_final: boolean };

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function Recruitment() {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [cands, setCands] = useState<Cand[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "openings">("pipeline");
  const [q, setQ] = useState("");
  const [newOpening, setNewOpening] = useState<Partial<Opening> | null>(null);
  const [newCand, setNewCand] = useState<any>(null);
  const [move, setMove] = useState<{ c: Cand; to: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: o }, { data: c }, { data: s }] = await Promise.all([
      db.from("hr_openings").select("*").order("opened_on", { ascending: false }),
      db.rpc("hr_pipeline"),
      db.from("hr_stages").select("code,name,colour,sort_order,is_final").eq("active", true).order("sort_order"),
    ]);
    setOpenings((o as Opening[]) ?? []);
    setCands((c as Cand[]) ?? []);
    setStages((s as Stage[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveOpening = async () => {
    if (!newOpening?.title?.trim()) return toast.error("Give the role a title");
    setBusy(true);
    const payload = {
      title: newOpening.title.trim(), department: newOpening.department || null,
      designation: newOpening.designation || null, location: newOpening.location || null,
      vacancies: Number(newOpening.vacancies) || 1,
      salary_from: newOpening.salary_from || null, salary_to: newOpening.salary_to || null,
      description: newOpening.description || null, status: newOpening.status || "open",
    };
    const { error } = newOpening.id
      ? await db.from("hr_openings").update(payload).eq("id", newOpening.id)
      : await db.from("hr_openings").insert(payload);
    setBusy(false);
    if (error) return toast.error("Could not save", { description: error.message });
    toast.success(newOpening.id ? "Opening updated" : "Opening created");
    setNewOpening(null); load();
  };

  const saveCandidate = async () => {
    if (!newCand?.full_name?.trim()) return toast.error("The candidate needs a name");
    setBusy(true);
    const { error } = await db.from("hr_candidates").insert({
      opening_id: newCand.opening_id || null,
      full_name: newCand.full_name.trim(),
      email: newCand.email || null, phone: newCand.phone || null,
      source: newCand.source || "direct",
      expected_salary: newCand.expected_salary || null,
      notes: newCand.notes || null,
    });
    setBusy(false);
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Candidate added");
    setNewCand(null); load();
  };

  const doMove = async () => {
    if (!move) return;
    setBusy(true);
    const { data, error } = await db.rpc("hr_move_candidate", {
      p_id: move.c.id, p_stage: move.to, p_note: note || null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not move", { description: error?.message ?? data?.message });
    }
    const seeded = Number(data.onboarding_tasks ?? 0);
    toast.success("Candidate moved", {
      description: seeded > 0 ? `Onboarding started — ${seeded} tasks created.` : undefined,
    });
    setMove(null); setNote(""); load();
  };

  const setRating = async (c: Cand, rating: number) => {
    const { error } = await db.from("hr_candidates").update({ rating }).eq("id", c.id);
    if (error) return toast.error("Could not save the rating", { description: error.message });
    load();
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return cands;
    return cands.filter((c) => [c.full_name, c.email, c.phone, c.opening_title, c.department]
      .filter(Boolean).join(" ").toLowerCase().includes(n));
  }, [cands, q]);

  const byStage = useMemo(() => {
    const m = new Map<string, Cand[]>();
    for (const s of stages) m.set(s.code, []);
    for (const c of filtered) {
      if (!m.has(c.current_stage)) m.set(c.current_stage, []);
      m.get(c.current_stage)!.push(c);
    }
    return m;
  }, [filtered, stages]);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const head = ["Candidate", "Email", "Phone", "Role", "Department", "Stage", "Rating",
      "Expected", "Offered", "Source", "Applied"];
    const cell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(",")].concat(filtered.map((c) => [
      c.full_name, c.email, c.phone, c.opening_title, c.department, c.stage_name,
      c.rating, c.expected_salary, c.offered_salary, c.source, c.applied_on,
    ].map(cell).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Exported", { description: `${filtered.length} candidates` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <BriefcaseBusiness className="h-5 w-5 text-india-green" /> Recruitment
          </h2>
          <p className="text-sm text-muted-foreground">
            Marking someone Hired starts their onboarding checklist automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!filtered.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => setNewOpening({ vacancies: 1, status: "open" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <Plus className="h-4 w-4" /> Opening
          </button>
          <button onClick={() => setNewCand({ source: "direct" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Candidate
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {([["pipeline", `Pipeline (${cands.filter((c) => !c.is_final).length})`],
             ["openings", `Openings (${openings.filter((o) => o.status === "open").length})`]] as const)
            .map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                tab === k ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === "pipeline" && (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates…"
              className={`${inp} pl-9`} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : tab === "openings" ? (
        openings.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No openings yet. Create one to start collecting candidates against it.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {openings.map((o) => {
              const applied = cands.filter((c) => c.opening_id === o.id).length;
              const hired = cands.filter((c) => c.opening_id === o.id && c.current_stage === "hired").length;
              return (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{o.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[o.department, o.location].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      o.status === "open" ? "bg-emerald-100 text-emerald-700"
                      : o.status === "closed" ? "bg-slate-100 text-slate-600"
                      : "bg-amber-100 text-amber-700"}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs">
                    <span><b className="text-base">{applied}</b> applied</span>
                    <span><b className="text-base">{hired}</b> hired</span>
                    <span><b className="text-base">{o.vacancies}</b> needed</span>
                  </div>
                  {(o.salary_from || o.salary_to) && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ₹{Number(o.salary_from ?? 0).toLocaleString("en-IN")} – ₹{Number(o.salary_to ?? 0).toLocaleString("en-IN")}
                    </p>
                  )}
                  <button onClick={() => setNewOpening(o)}
                    className="mt-3 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted">
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : cands.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No candidates yet. Add one and move them through the stages.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((s) => {
            const list = byStage.get(s.code) ?? [];
            return (
              <div key={s.code} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between rounded-lg px-2 py-1.5"
                     style={{ backgroundColor: `${s.colour}15` }}>
                  <span className="text-xs font-bold" style={{ color: s.colour }}>{s.name}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-3 shadow-soft">
                      <p className="text-sm font-bold">{c.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.opening_title ?? "No opening"}{c.department ? ` · ${c.department}` : ""}
                      </p>
                      <div className="mt-1.5 flex gap-2 text-[11px] text-muted-foreground">
                        {c.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => setRating(c, n)} title={`${n} of 5`}>
                            <Star className={`h-3.5 w-3.5 ${(c.rating ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                          </button>
                        ))}
                      </div>
                      {c.onboarding_total > 0 && (
                        <p className="mt-2 rounded-full bg-india-green/10 px-2 py-0.5 text-[10px] font-bold text-india-green">
                          Onboarding {c.onboarding_done}/{c.onboarding_total}
                        </p>
                      )}
                      {!c.is_final && (
                        <select className="mt-2 h-8 w-full rounded-lg border border-border bg-background px-2 text-[11px]"
                          value="" onChange={(e) => { if (e.target.value) { setMove({ c, to: e.target.value }); setNote(""); } }}>
                          <option value="">Move to…</option>
                          {stages.filter((x) => x.code !== c.current_stage)
                                 .map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                      Nobody here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {move && (
        <Modal title={`Move ${move.c.full_name}`} onClose={() => setMove(null)}>
          <p className="text-sm text-muted-foreground">
            From <b className="text-foreground">{move.c.stage_name}</b> to{" "}
            <b className="text-foreground">{stages.find((s) => s.code === move.to)?.name}</b>.
          </p>
          {move.to === "hired" && (
            <p className="mt-2 rounded-lg bg-india-green/10 p-3 text-xs">
              Their onboarding checklist will be created automatically.
            </p>
          )}
          <label className="mt-3 block">
            <Lbl>{move.to === "rejected" ? "Reason (required)" : "Note (optional)"}</Lbl>
            <textarea className={`${inp} h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setMove(null)}
              className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button onClick={doMove} disabled={busy || (move.to === "rejected" && !note.trim())}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Move <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Modal>
      )}

      {newOpening && (
        <Modal title={newOpening.id ? "Edit opening" : "New opening"} onClose={() => setNewOpening(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><Lbl>Role title</Lbl>
              <input className={inp} value={newOpening.title ?? ""} placeholder="Field Support Executive"
                onChange={(e) => setNewOpening({ ...newOpening, title: e.target.value })} /></label>
            <label className="block"><Lbl>Department</Lbl>
              <input className={inp} value={newOpening.department ?? ""}
                onChange={(e) => setNewOpening({ ...newOpening, department: e.target.value })} /></label>
            <label className="block"><Lbl>Location</Lbl>
              <input className={inp} value={newOpening.location ?? ""}
                onChange={(e) => setNewOpening({ ...newOpening, location: e.target.value })} /></label>
            <label className="block"><Lbl>Vacancies</Lbl>
              <input type="number" min={1} className={inp} value={newOpening.vacancies ?? 1}
                onChange={(e) => setNewOpening({ ...newOpening, vacancies: Number(e.target.value) })} /></label>
            <label className="block"><Lbl>Status</Lbl>
              <select className={inp} value={newOpening.status ?? "open"}
                onChange={(e) => setNewOpening({ ...newOpening, status: e.target.value })}>
                {["draft", "open", "on_hold", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label className="block"><Lbl>Salary from</Lbl>
              <input type="number" className={inp} value={newOpening.salary_from ?? ""}
                onChange={(e) => setNewOpening({ ...newOpening, salary_from: Number(e.target.value) })} /></label>
            <label className="block"><Lbl>Salary to</Lbl>
              <input type="number" className={inp} value={newOpening.salary_to ?? ""}
                onChange={(e) => setNewOpening({ ...newOpening, salary_to: Number(e.target.value) })} /></label>
            <label className="block sm:col-span-2"><Lbl>Description</Lbl>
              <textarea className={`${inp} h-24 py-2`} value={newOpening.description ?? ""}
                onChange={(e) => setNewOpening({ ...newOpening, description: e.target.value })} /></label>
          </div>
          <Actions onCancel={() => setNewOpening(null)} onSave={saveOpening} busy={busy} />
        </Modal>
      )}

      {newCand && (
        <Modal title="Add candidate" onClose={() => setNewCand(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><Lbl>Full name</Lbl>
              <input className={inp} value={newCand.full_name ?? ""}
                onChange={(e) => setNewCand({ ...newCand, full_name: e.target.value })} /></label>
            <label className="block"><Lbl>Email</Lbl>
              <input className={inp} value={newCand.email ?? ""}
                onChange={(e) => setNewCand({ ...newCand, email: e.target.value })} /></label>
            <label className="block"><Lbl>Phone</Lbl>
              <input className={inp} value={newCand.phone ?? ""}
                onChange={(e) => setNewCand({ ...newCand, phone: e.target.value })} /></label>
            <label className="block"><Lbl>Applying for</Lbl>
              <select className={inp} value={newCand.opening_id ?? ""}
                onChange={(e) => setNewCand({ ...newCand, opening_id: e.target.value })}>
                <option value="">No specific opening</option>
                {openings.filter((o) => o.status === "open").map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select></label>
            <label className="block"><Lbl>Source</Lbl>
              <select className={inp} value={newCand.source ?? "direct"}
                onChange={(e) => setNewCand({ ...newCand, source: e.target.value })}>
                {["direct", "referral", "job portal", "walk-in", "agency", "social media"]
                  .map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label className="block sm:col-span-2"><Lbl>Expected salary</Lbl>
              <input type="number" className={inp} value={newCand.expected_salary ?? ""}
                onChange={(e) => setNewCand({ ...newCand, expected_salary: Number(e.target.value) })} /></label>
            <label className="block sm:col-span-2"><Lbl>Notes</Lbl>
              <textarea className={`${inp} h-20 py-2`} value={newCand.notes ?? ""}
                onChange={(e) => setNewCand({ ...newCand, notes: e.target.value })} /></label>
          </div>
          <Actions onCancel={() => setNewCand(null)} onSave={saveCandidate} busy={busy} />
        </Modal>
      )}
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

function Actions({ onCancel, onSave, busy }: { onCancel: () => void; onSave: () => void; busy: boolean }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={onCancel}
        className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
      <button onClick={onSave} disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-2xl bg-card p-6 shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Recruitment;
