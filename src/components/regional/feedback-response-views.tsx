import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MessageSquare, Send, Star, Search, Inbox, CheckCircle2, Clock, Store, Building2,
  Filter, CornerDownRight, ThumbsUp, Bug, Lightbulb,
} from "lucide-react";
import { RegionalShell, type RegionalConfig } from "@/components/regional/regional-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { StatCard } from "@/components/retailer/stat-card";

type FbSource = "Retailer" | "TRO";
type FbType = "Suggestion" | "Compliment" | "Bug";
type FbStatus = "New" | "Responded" | "Closed";

interface FeedbackItem {
  id: string;
  source: FbSource;
  from: string;
  sub: string;
  type: FbType;
  rating: number;
  message: string;
  date: string;
  status: FbStatus;
  reply?: string;
}

const SEED: FeedbackItem[] = [
  { id: "FB-5012", source: "Retailer", from: "Harshitha N", sub: "Sri Sai Digital · Anekal", type: "Bug", rating: 2, message: "AEPS report for yesterday is not loading on my dashboard since morning. Please check.", date: "Today, 09:24", status: "New" },
  { id: "FB-5011", source: "TRO", from: "Navya", sub: "Anekal Taluk Office", type: "Suggestion", rating: 4, message: "Can we get a taluk-wise commission comparison view in the analytics page?", date: "Today, 08:50", status: "New" },
  { id: "FB-5009", source: "Retailer", from: "Ramesh Kumar", sub: "Ramesh Mobile World · Hoskote", type: "Compliment", rating: 5, message: "The new wallet recharge flow is super fast now. Thank you team!", date: "Yesterday, 18:10", status: "Responded", reply: "Thanks Ramesh! Glad it's helping. We'll keep improving." },
  { id: "FB-5006", source: "Retailer", from: "Lakshmi Devi", sub: "Sri Lakshmi Centre · Anekal", type: "Suggestion", rating: 3, message: "Please add Kannada language support for the service catalog.", date: "2 days ago", status: "Responded", reply: "Noted — Kannada support is on the roadmap for next quarter." },
  { id: "FB-5001", source: "TRO", from: "Navya", sub: "Anekal Taluk Office", type: "Bug", rating: 3, message: "Notification badge count not clearing after reading.", date: "3 days ago", status: "Closed", reply: "Fixed in the latest update. Closing this." },
];

const TYPE_META: Record<FbType, { icon: typeof Bug; cls: string }> = {
  Suggestion: { icon: Lightbulb, cls: "bg-sky-50 text-sky-700 border-sky-200" },
  Compliment: { icon: ThumbsUp, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Bug: { icon: Bug, cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const STATUS_META: Record<FbStatus, string> = {
  New: "bg-amber-50 text-amber-700 border-amber-200",
  Responded: "bg-sky-50 text-sky-700 border-sky-200",
  Closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </div>
  );
}

export function FeedbackResponseDesk({ cfg }: { cfg: RegionalConfig }) {
  const tone = cfg.accent === "rose" ? "rose" : "saffron";
  const accentBtn = cfg.accent === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700";
  const [items, setItems] = useState<FeedbackItem[]>(SEED);
  const [sourceFilter, setSourceFilter] = useState<"all" | FbSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FbStatus>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(SEED[0].id);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () =>
      items.filter(
        (f) =>
          (sourceFilter === "all" || f.source === sourceFilter) &&
          (statusFilter === "all" || f.status === statusFilter) &&
          (query === "" ||
            f.from.toLowerCase().includes(query.toLowerCase()) ||
            f.message.toLowerCase().includes(query.toLowerCase()) ||
            f.id.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, sourceFilter, statusFilter, query],
  );

  const active = items.find((f) => f.id === activeId) ?? filtered[0] ?? null;

  const stats = useMemo(() => {
    const avg = items.reduce((a, f) => a + f.rating, 0) / (items.length || 1);
    return {
      total: items.length,
      pending: items.filter((f) => f.status === "New").length,
      responded: items.filter((f) => f.status !== "New").length,
      avg: avg.toFixed(1),
    };
  }, [items]);

  function sendReply() {
    if (!active) return;
    if (draft.trim().length < 3) {
      toast.error("Please write a response");
      return;
    }
    setItems((prev) =>
      prev.map((f) => (f.id === active.id ? { ...f, reply: draft.trim(), status: "Responded" } : f)),
    );
    setDraft("");
    toast.success(`Response sent to ${active.from}`);
  }

  function closeThread() {
    if (!active) return;
    setItems((prev) => prev.map((f) => (f.id === active.id ? { ...f, status: "Closed" } : f)));
    toast.success("Thread closed");
  }

  return (
    <RegionalShell cfg={cfg}>
      <div className="space-y-5">
        <PageHeader
          icon={<MessageSquare className="h-5 w-5" />}
          title="Feedback Response Desk"
          subtitle="Respond to feedback raised by your retailers and taluk officers."
          badge={
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              {stats.pending} awaiting reply
            </span>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Feedback" value={String(stats.total)} icon={<Inbox className="h-5 w-5" />} tone={tone as "rose" | "saffron"} />
          <StatCard label="Awaiting Reply" value={String(stats.pending)} icon={<Clock className="h-5 w-5" />} tone="rose" />
          <StatCard label="Responded" value={String(stats.responded)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
          <StatCard label="Avg Rating" value={`${stats.avg}/5`} icon={<Star className="h-5 w-5" />} tone="violet" />
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Inbox list */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-3 border-b border-border space-y-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 h-9">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search feedback…" className="flex-1 bg-transparent text-sm outline-none" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "Retailer", "TRO"] as const).map((s) => (
                  <button key={s} onClick={() => setSourceFilter(s)} className={`px-2.5 h-7 rounded-md text-xs font-semibold border transition ${sourceFilter === s ? `${accentBtn} text-white border-transparent` : "bg-white border-border text-slate-600 hover:bg-muted"}`}>
                    {s === "all" ? "All sources" : s}
                  </button>
                ))}
                <span className="w-px bg-border mx-0.5" />
                {(["all", "New", "Responded", "Closed"] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 h-7 rounded-md text-xs font-semibold border transition ${statusFilter === s ? "bg-slate-900 text-white border-transparent" : "bg-white border-border text-slate-600 hover:bg-muted"}`}>
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>
            <ul className="max-h-[520px] overflow-y-auto divide-y divide-border">
              {filtered.length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground"><Filter className="h-5 w-5 mx-auto mb-2 opacity-50" />No feedback matches your filters.</li>
              )}
              {filtered.map((f) => {
                const T = TYPE_META[f.type].icon;
                return (
                  <li key={f.id}>
                    <button onClick={() => { setActiveId(f.id); setDraft(""); }} className={`w-full text-left p-3 transition hover:bg-muted/50 ${active?.id === f.id ? "bg-muted/60" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {f.source === "Retailer" ? <Store className="h-3.5 w-3.5 text-orange-500 shrink-0" /> : <Building2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />}
                          <span className="text-sm font-bold truncate">{f.from}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_META[f.status]}`}>{f.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_META[f.type].cls}`}><T className="h-3 w-3" />{f.type}</span>
                        <Stars n={f.rating} />
                        <span className="ml-auto text-[10px] text-muted-foreground">{f.date}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Detail / reply */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card shadow-soft p-5">
            {!active ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-16">Select a feedback to respond.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl text-white flex items-center justify-center font-extrabold ${active.source === "Retailer" ? "bg-orange-500" : "bg-sky-500"}`}>
                      {active.from.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-slate-900">{active.from}</p>
                      <p className="text-xs text-muted-foreground">{active.sub} · {active.source} · {active.id}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_META[active.status]}`}>{active.status}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Stars n={active.rating} />
                  <span className="text-xs text-muted-foreground">{active.date}</span>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{active.message}</p>
                </div>

                {active.reply && (
                  <div className="flex gap-2">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Your response</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{active.reply}</p>
                    </div>
                  </div>
                )}

                {active.status !== "Closed" && (
                  <div className="space-y-2.5">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      placeholder={active.reply ? "Add a follow-up response…" : `Write a response to ${active.from}…`}
                      className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-amber-400/20"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={sendReply} className={`h-10 px-5 rounded-lg text-white text-sm font-bold flex items-center gap-1.5 ${accentBtn}`}>
                        <Send className="h-4 w-4" /> Send Response
                      </button>
                      <button onClick={closeThread} className="h-10 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-slate-700 hover:bg-muted">
                        Mark as Closed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </RegionalShell>
  );
}