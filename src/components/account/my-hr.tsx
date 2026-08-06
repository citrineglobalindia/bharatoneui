import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck, CalendarDays, Clock3, CreditCard, FileText, Loader2,
  LogIn, LogOut, Plane, Plus, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  IdCardFront, IdCardBack, ID_CARD_CSS, type CardData,
} from "@/components/hr/id-card-art";

const db = supabase as any;
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * "My HR" — the employee's own view of the HR module, shared by every staff
 * portal (accountant, QC, operator, telecaller, HR).
 *
 * Everything except the two punch RPCs is a plain table read: the HR schema
 * was built with self-read policies from day one (own attendance, own leave
 * requests, own balances, own ID card), they had just never been given a
 * screen. Check-in/out goes through hr_check_in()/hr_check_out(), which stamp
 * the SERVER clock in IST — the device's clock is never trusted.
 */

type Att = { day: string; status: string; check_in: string | null; check_out: string | null; note: string | null };
type Balance = { leave_code: string; entitled: number; carried: number; adjustment: number };
type LeaveType = { code: string; name: string; annual_days: number; colour: string | null; paid: boolean };
type LeaveReq = { id: string; leave_code: string; from_date: string; to_date: string; half_day: boolean; days: number; reason: string; status: string; applied_at: string; decision_note: string | null };
type Holiday = { holiday_on: string; name: string; optional: boolean };
type Card = { card_no: string; blood_group: string | null; photo_path: string | null; issued_on: string; valid_until: string | null; status: string; verify_token: string | null };

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700", cancelled: "bg-slate-100 text-slate-600",
};
const ATT_LABEL: Record<string, string> = { present: "Present", absent: "Absent", half_day: "Half day", wfh: "WFH", on_duty: "On duty" };
const fmtD = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const hm = (t: string | null) => (t ? t.slice(0, 5) : "—");

export function MyHR() {
  const me = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<Att | null>(null);
  const [month, setMonth] = useState<Att[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [reqs, setReqs] = useState<LeaveReq[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [employment, setEmployment] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [punching, setPunching] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [showApply, setShowApply] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [form, setForm] = useState({ code: "", from: "", to: "", half: false, reason: "" });
  const [applying, setApplying] = useState(false);

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const year = now.getFullYear();
      const [att, bal, ty, rq, hol, cd, st, emp, prof] = await Promise.all([
        db.from("hr_attendance_v2").select("day,status,check_in,check_out,note").eq("user_id", uid).gte("day", monthStart).order("day", { ascending: false }),
        db.from("hr_leave_balances").select("leave_code,entitled,carried,adjustment").eq("user_id", uid).eq("year", year),
        db.from("hr_leave_types").select("code,name,annual_days,colour,paid").eq("active", true).order("sort_order"),
        db.from("hr_leave_requests_v2").select("id,leave_code,from_date,to_date,half_day,days,reason,status,applied_at,decision_note").eq("user_id", uid).order("applied_at", { ascending: false }).limit(20),
        db.from("hr_holidays").select("holiday_on,name,optional").gte("holiday_on", new Date().toISOString().slice(0, 10)).order("holiday_on").limit(5),
        db.from("hr_id_cards").select("card_no,blood_group,photo_path,issued_on,valid_until,status,verify_token").eq("user_id", uid).eq("status", "active").maybeSingle(),
        db.from("app_settings").select("key,value").in("key", ["company_legal_name", "company_address", "company_office_contact", "id_card_signature_url"]),
        db.from("hr_employment").select("*").eq("user_id", uid).maybeSingle(),
        db.from("profiles").select("display_name,designation,department,phone,dob").eq("id", uid).maybeSingle(),
      ]);
      const rows = (att.data as Att[]) ?? [];
      setMonth(rows);
      const todayIst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const dayStr = `${todayIst.getFullYear()}-${String(todayIst.getMonth() + 1).padStart(2, "0")}-${String(todayIst.getDate()).padStart(2, "0")}`;
      setToday(rows.find((r) => r.day === dayStr) ?? null);
      setBalances((bal.data as Balance[]) ?? []);
      const tl = (ty.data as LeaveType[]) ?? [];
      setTypes(tl);
      setForm((f) => ({ ...f, code: f.code || tl[0]?.code || "" }));
      setReqs((rq.data as LeaveReq[]) ?? []);
      setHolidays((hol.data as Holiday[]) ?? []);
      const c = (cd.data as Card) ?? null;
      setCard(c);
      const s: Record<string, string> = {};
      ((st.data as { key: string; value: string }[]) ?? []).forEach((r) => { s[r.key] = r.value; });
      setSettings(s);
      setEmployment(emp.data ?? null);
      setProfile(prof.data ?? null);
      if (c?.photo_path) {
        const { data: sig } = await supabase.storage.from("id-photos").createSignedUrl(c.photo_path, 3600);
        setPhotoUrl(sig?.signedUrl ?? null);
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  /** Days actually taken this year, per leave type, from my approved requests. */
  const takenByCode = useMemo(() => {
    const y = new Date().getFullYear();
    const m = new Map<string, number>();
    reqs.filter((r) => r.status === "approved" && new Date(r.from_date).getFullYear() === y)
      .forEach((r) => m.set(r.leave_code, (m.get(r.leave_code) ?? 0) + Number(r.days)));
    return m;
  }, [reqs]);

  const attCounts = useMemo(() => {
    const c: Record<string, number> = {};
    month.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [month]);

  const punch = async (dir: "in" | "out") => {
    setPunching(true);
    try {
      const { data, error } = await db.rpc(dir === "in" ? "hr_check_in" : "hr_check_out");
      if (error) return toast.error(dir === "in" ? "Check-in failed" : "Check-out failed", { description: error.message });
      const r = data as any;
      if (dir === "in" && r?.already) toast.info(`Already checked in at ${hm(r.check_in)}`, { description: "Your first punch of the day stands." });
      else toast.success(dir === "in" ? `Checked in at ${hm(r.check_in)}` : `Checked out at ${hm(r.check_out)}`);
      await load();
    } finally { setPunching(false); }
  };

  const applyLeave = async () => {
    if (!form.code || !form.from || !form.to) return toast.error("Pick the leave type and dates");
    if (!form.reason.trim()) return toast.error("Give a reason");
    setApplying(true);
    try {
      const { error } = await db.rpc("hr_apply_leave", {
        p_code: form.code, p_from: form.from, p_to: form.to,
        p_reason: form.reason.trim(), p_half: form.half, p_user: null, p_proof: null,
      });
      if (error) return toast.error("Could not apply", { description: error.message });
      toast.success("Leave applied", { description: "HR will review your request." });
      setShowApply(false);
      setForm((f) => ({ ...f, from: "", to: "", half: false, reason: "" }));
      await load();
    } finally { setApplying(false); }
  };

  const cancelReq = async (r: LeaveReq) => {
    if (!confirm(`Cancel this ${r.leave_code} leave request (${fmtD(r.from_date)} – ${fmtD(r.to_date)})?`)) return;
    // Own-pending update is allowed by RLS; no RPC needed.
    const { error } = await db.from("hr_leave_requests_v2").update({ status: "cancelled" }).eq("id", r.id).eq("status", "pending");
    if (error) return toast.error("Could not cancel", { description: error.message });
    toast.success("Request cancelled"); load();
  };

  const cardData: CardData | null = useMemo(() => {
    if (!card) return null;
    return {
      name: profile?.display_name ?? me.name ?? "—",
      designation: profile?.designation ?? null,
      card_no: card.card_no,
      blood_group: card.blood_group,
      phone: profile?.phone ?? null,
      photo_url: photoUrl,
      dob: profile?.dob ?? null,
      date_of_joining: employment?.date_of_joining ?? null,
      work_location: employment?.work_location ?? null,
      verify_token: card.verify_token,
      company_name: settings.company_legal_name ?? "BHARATONE SERVICES AND AFFILIATES PVT.LTD",
      company_address: settings.company_address ?? "",
      office_contact: settings.company_office_contact ?? "",
      signature_url: settings.id_card_signature_url ?? null,
      qr_url: card.verify_token ? `${FN_BASE}/id-card-qr?token=${card.verify_token}` : null,
    };
  }, [card, photoUrl, profile, employment, settings, me.name]);

  const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your HR record…</div>;

  return (
    <div className="space-y-5">
      {/* ── Check in / out ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums">
            {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}
          </p>
          <p className="text-xs text-muted-foreground">{clock.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })} · IST</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-xl bg-muted/60 p-2"><p className="text-[10px] font-bold uppercase text-muted-foreground">In</p><p className="font-mono font-bold">{hm(today?.check_in ?? null)}</p></div>
            <div className="rounded-xl bg-muted/60 p-2"><p className="text-[10px] font-bold uppercase text-muted-foreground">Out</p><p className="font-mono font-bold">{hm(today?.check_out ?? null)}</p></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => punch("in")} disabled={punching || !!today?.check_in} className="flex-1 bg-india-green text-white hover:bg-india-green/90">
              {punching ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Check in
            </Button>
            <Button onClick={() => punch("out")} disabled={punching || !today?.check_in} variant="outline" className="flex-1">
              {punching ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Check out
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Times are stamped by the server in IST — the first check-in and the last check-out of the day stand.</p>
        </div>

        {/* ── This month ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold"><CalendarCheck className="h-4 w-4 text-india-green" /> My attendance — {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {Object.entries(attCounts).map(([st, n]) => (
                <span key={st} className="rounded-full bg-muted px-2 py-0.5 font-semibold">{ATT_LABEL[st] ?? st}: {n}</span>
              ))}
            </div>
          </div>
          {month.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No attendance recorded this month yet.</p>
          ) : (
            <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-left text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr><th className="px-3 py-1.5">Date</th><th className="px-3 py-1.5">Status</th><th className="px-3 py-1.5">In</th><th className="px-3 py-1.5">Out</th><th className="px-3 py-1.5">Note</th></tr>
                </thead>
                <tbody>
                  {month.map((r) => (
                    <tr key={r.day} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{fmtD(r.day)}</td>
                      <td className="px-3 py-1.5">{ATT_LABEL[r.status] ?? r.status}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{hm(r.check_in)}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{hm(r.check_out)}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {holidays.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              Upcoming holidays: {holidays.map((h) => `${h.name} (${fmtD(h.holiday_on)}${h.optional ? ", optional" : ""})`).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* ── Leave ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold"><Plane className="h-4 w-4 text-saffron" /> Leave balance {new Date().getFullYear()}</p>
            <Button size="sm" onClick={() => setShowApply(true)} className="bg-saffron-gradient text-white"><Plus className="h-4 w-4" /> Apply</Button>
          </div>
          <div className="mt-3 space-y-3">
            {types.filter((t) => Number(t.annual_days) > 0 || balances.some((b) => b.leave_code === t.code)).map((t) => {
              const b = balances.find((x) => x.leave_code === t.code);
              const entitled = Number(b?.entitled ?? t.annual_days) + Number(b?.carried ?? 0) + Number(b?.adjustment ?? 0);
              const taken = takenByCode.get(t.code) ?? 0;
              const left = Math.max(0, entitled - taken);
              return (
                <div key={t.code}>
                  <div className="flex justify-between text-xs"><span className="font-semibold">{t.name}</span><span className="text-muted-foreground">{left} of {entitled} left</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${entitled > 0 ? (left / entitled) * 100 : 0}%`, background: t.colour || "var(--india-green)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft lg:col-span-2">
          <p className="border-b border-border px-5 py-3 text-sm font-bold">My leave requests</p>
          {reqs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No leave requests yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reqs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{types.find((t) => t.code === r.leave_code)?.name ?? r.leave_code} · {fmtD(r.from_date)} – {fmtD(r.to_date)} ({r.days}{r.half_day ? " half" : ""} day{Number(r.days) === 1 ? "" : "s"})</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.reason}{r.decision_note ? ` · HR: ${r.decision_note}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_TONE[r.status] ?? "bg-muted"}`}>{r.status}</span>
                    {r.status === "pending" && (
                      <button onClick={() => cancelReq(r)} title="Cancel request" className="text-muted-foreground hover:text-rose-600"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── ID card + payslips ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4 text-ashoka" /> My ID card</p>
          {card ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-mono font-bold">{card.card_no}</p>
                <p className="text-xs text-muted-foreground">Issued {fmtD(card.issued_on)}{card.valid_until ? ` · valid until ${fmtD(card.valid_until)}` : ""}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCard((v) => !v)}>{showCard ? "Hide card" : "View card"}</Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No ID card has been issued to you yet. HR issues cards from the HR portal.</p>
          )}
          {showCard && cardData && (
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              <style>{ID_CARD_CSS}</style>
              <IdCardFront data={cardData} />
              <IdCardBack data={cardData} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-bold"><Wallet className="h-4 w-4 text-india-green" /> Payslips</p>
          {/* Payroll is deliberately not live: the statutory inputs (PF
              establishment code, ESI, PT, TDS mapping, approved salary
              structures) are not configured. Showing invented payslips here
              would be worse than saying so. */}
          <p className="mt-3 text-sm text-muted-foreground">
            Payroll is not live on BharatOne yet, so there are no payslips to show. Once
            payroll starts running, every month's slip will appear here automatically.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Salary is currently processed outside the platform.</p>
        </div>
      </div>

      {/* ── Apply-leave dialog ─────────────────────────────────────────── */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setShowApply(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Apply for leave</p>
              <button onClick={() => setShowApply(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <label className="mt-4 block text-[11px] font-semibold text-muted-foreground">Leave type</label>
            <select className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
              {types.map((t) => <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>)}
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div><label className="block text-[11px] font-semibold text-muted-foreground">From</label><input type="date" className={input} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to || e.target.value })} /></div>
              <div><label className="block text-[11px] font-semibold text-muted-foreground">To</label><input type="date" className={input} min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.half} onChange={(e) => setForm({ ...form, half: e.target.checked })} className="h-4 w-4 accent-[var(--india-green)]" /> Half day</label>
            <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Reason</label>
            <textarea rows={3} className={input + " h-auto py-2"} placeholder="Why do you need this leave?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Button onClick={applyLeave} disabled={applying} className="mt-4 w-full bg-india-green text-white hover:bg-india-green/90">
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />} Submit request
            </Button>
            <p className="mt-2 text-[10px] text-muted-foreground">Weekends and declared holidays inside the range are not counted. Your request goes to HR for approval.</p>
          </div>
        </div>
      )}
    </div>
  );
}
