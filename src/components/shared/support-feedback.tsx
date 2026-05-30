import { useState } from "react";
import { toast } from "sonner";
import {
  LifeBuoy, Phone, Mail, MessageSquare, Plus, Star, Send, Smile, Bug, Lightbulb, ThumbsUp,
} from "lucide-react";

export type PortalAccent = "emerald" | "indigo" | "rose" | "amber" | "green";

const ACCENT: Record<PortalAccent, { btn: string; ring: string; soft: string; text: string }> = {
  emerald: { btn: "bg-emerald-600 hover:bg-emerald-700", ring: "focus-visible:ring-emerald-400/25 focus-visible:border-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-600" },
  indigo: { btn: "bg-indigo-600 hover:bg-indigo-700", ring: "focus-visible:ring-indigo-400/25 focus-visible:border-indigo-500", soft: "bg-indigo-50 text-indigo-700 border-indigo-200", text: "text-indigo-600" },
  rose: { btn: "bg-rose-600 hover:bg-rose-700", ring: "focus-visible:ring-rose-400/25 focus-visible:border-rose-500", soft: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-600" },
  amber: { btn: "bg-amber-600 hover:bg-amber-700", ring: "focus-visible:ring-amber-400/25 focus-visible:border-amber-500", soft: "bg-amber-50 text-amber-800 border-amber-200", text: "text-amber-600" },
  green: { btn: "bg-green-600 hover:bg-green-700", ring: "focus-visible:ring-green-400/25 focus-visible:border-green-500", soft: "bg-green-50 text-green-700 border-green-200", text: "text-green-600" },
};

function Header({ icon, title, subtitle, accent }: { icon: React.ReactNode; title: string; subtitle: string; accent: PortalAccent }) {
  const a = ACCENT[accent];
  return (
    <div className="flex items-start gap-3">
      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${a.soft}`}>{icon}</div>
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

const inputCls = (a: typeof ACCENT[PortalAccent]) =>
  `w-full rounded-lg border border-input bg-background px-3 h-10 text-sm shadow-soft outline-none focus-visible:ring-4 ${a.ring}`;
const areaCls = (a: typeof ACCENT[PortalAccent]) =>
  `w-full rounded-lg border border-input bg-background p-3 text-sm shadow-soft outline-none focus-visible:ring-4 ${a.ring}`;

const RECENT_TICKETS = [
  { id: "TKT-9821", subject: "Unable to view yesterday's report", category: "Technical", status: "Open", date: "Today" },
  { id: "TKT-9777", subject: "Export CSV missing columns", category: "Reports", status: "In Progress", date: "2 days ago" },
  { id: "TKT-9610", subject: "Login OTP delay", category: "Account", status: "Resolved", date: "1 week ago" },
];

const STATUS_TONE: Record<string, string> = {
  Open: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function SupportPanel({ accent }: { accent: PortalAccent }) {
  const a = ACCENT[accent];
  return (
    <div className="space-y-5">
      <Header accent={accent} icon={<LifeBuoy className="h-5 w-5" />} title="Support" subtitle="Reach our team or raise a ticket — we usually respond within minutes." />

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
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Raise a Ticket</h3>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); (e.currentTarget as HTMLFormElement).reset(); toast.success("Ticket created — TKT-9830"); }} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select className={inputCls(a)}><option>Technical</option><option>Reports</option><option>Account</option><option>Billing</option><option>Other</option></select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Priority</label>
              <select className={inputCls(a)}><option>Low</option><option>Medium</option><option>High</option></select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Subject</label>
              <input required placeholder="Brief summary" className={inputCls(a)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Describe the issue</label>
              <textarea rows={4} required placeholder="Provide details, IDs, screenshots…" className={areaCls(a)} />
            </div>
            <button type="submit" className={`w-full h-10 rounded-lg text-white text-sm font-bold shadow-elev ${a.btn} flex items-center justify-center gap-1.5`}>
              <Send className="h-4 w-4" /> Submit Ticket
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold">Your Recent Tickets</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Ticket</th>
                  <th className="text-left px-4 py-2.5 font-bold">Subject</th>
                  <th className="text-left px-4 py-2.5 font-bold">Category</th>
                  <th className="text-left px-4 py-2.5 font-bold">Status</th>
                  <th className="text-right px-4 py-2.5 font-bold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_TICKETS.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.id}</td>
                    <td className="px-4 py-2.5 font-medium">{t.subject}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.category}</td>
                    <td className="px-4 py-2.5"><span className={`inline-block text-[11px] font-bold border rounded-full px-2 py-0.5 ${STATUS_TONE[t.status]}`}>{t.status}</span></td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const FB_TYPES = [
  { key: "suggestion", label: "Suggestion", icon: <Lightbulb className="h-4 w-4" /> },
  { key: "compliment", label: "Compliment", icon: <ThumbsUp className="h-4 w-4" /> },
  { key: "bug", label: "Bug / Issue", icon: <Bug className="h-4 w-4" /> },
];

export function FeedbackPanel({ accent }: { accent: PortalAccent }) {
  const a = ACCENT[accent];
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [type, setType] = useState("suggestion");

  return (
    <div className="space-y-5">
      <Header accent={accent} icon={<Smile className="h-5 w-5" />} title="Feedback" subtitle="Tell us what's working and what we can improve — your input shapes the product." />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (rating === 0) { toast.error("Please give a star rating"); return; }
              (e.currentTarget as HTMLFormElement).reset();
              setRating(0); setType("suggestion");
              toast.success("Thank you! Your feedback has been submitted.");
            }}
            className="space-y-5"
          >
            <div>
              <p className="text-sm font-bold mb-2">How would you rate your experience?</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`${n} stars`}>
                    <Star className={`h-8 w-8 transition-colors ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                  </button>
                ))}
                {rating > 0 && <span className="ml-2 text-sm font-semibold text-slate-600">{rating}/5</span>}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold mb-2">What kind of feedback is this?</p>
              <div className="flex flex-wrap gap-2">
                {FB_TYPES.map((t) => (
                  <button
                    key={t.key} type="button" onClick={() => setType(t.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold transition ${type === t.key ? `${a.btn} text-white border-transparent` : "bg-white border-border text-slate-700 hover:bg-muted"}`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold">Tell us more</label>
              <textarea rows={5} required placeholder="Share details, ideas, or what went wrong…" className={`${areaCls(a)} mt-1.5`} />
            </div>

            <button type="submit" className={`h-10 px-5 rounded-lg text-white text-sm font-bold shadow-elev ${a.btn} flex items-center gap-1.5`}>
              <Send className="h-4 w-4" /> Submit Feedback
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm font-bold mb-1">Why your feedback matters</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Every submission is reviewed by our product team. Highly-requested ideas are prioritised in our roadmap.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm font-bold mb-2">Satisfaction this quarter</p>
            <div className="flex items-end gap-2">
              <span className={`font-display text-3xl font-extrabold ${a.text}`}>4.6</span>
              <span className="text-xs text-muted-foreground mb-1">/ 5 · 2,140 ratings</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${a.btn}`} style={{ width: "92%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
