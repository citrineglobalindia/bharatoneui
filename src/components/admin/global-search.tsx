import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, UserSquare2, FileSearch, Zap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Hit = { kind: string; id: string; title: string; subtitle: string | null; status: string | null; ref: string | null };

const kindMeta: Record<string, { label: string; icon: any; tone: string }> = {
  registration: { label: "Registration", icon: UserSquare2, tone: "bg-blue-100 text-blue-700" },
  application: { label: "Application", icon: FileSearch, tone: "bg-violet-100 text-violet-700" },
  service: { label: "Service", icon: Zap, tone: "bg-emerald-100 text-emerald-700" },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = window.setTimeout(async () => {
      setLoading(true); setTouched(true);
      await ensureStaffSession();
      const { data } = await supabase.rpc("global_search", { q: q.trim() });
      setHits((data as Hit[]) ?? []);
      setLoading(false);
    }, 300);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q]);

  const open = (h: Hit) => {
    if (h.kind === "registration") navigate({ to: "/review/$id", params: { id: h.id } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><Search className="h-5 w-5 text-india-green" /> Global Search</h2>
        <p className="text-sm text-muted-foreground">Search registrations, service applications and the service catalog in one place.</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-12 shadow-soft">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, application ID, JSKO ID, phone, email, service…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {q.trim().length >= 2 && (
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          {loading ? (
            <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
          ) : hits.length === 0 && touched ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No matches for “{q}”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {hits.map((h) => {
                const meta = kindMeta[h.kind] ?? { label: h.kind, icon: FileSearch, tone: "bg-slate-100 text-slate-700" };
                const clickable = h.kind === "registration";
                return (
                  <li key={h.kind + h.id}>
                    <button
                      onClick={() => open(h)} disabled={!clickable}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${clickable ? "hover:bg-muted/50" : "cursor-default"}`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tone}`}><meta.icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold">{h.title || "—"}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${meta.tone}`}>{meta.label}</span>
                          {h.status && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{h.status.replace("_", " ")}</span>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>
                      </div>
                      {clickable && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
