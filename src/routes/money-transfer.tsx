// Domestic Money Transfer — the real screen.
//
// WHAT WAS HERE BEFORE
// --------------------
// A static form with three invented beneficiaries, typed-in figures reading
// "Today's Transfers ₹20,700", and a Send button whose entire implementation was
// `toast.success("IMPS transfer initiated")`. No API call, no database write. A
// retailer could have told a customer their money was on its way.
//
// HOW THE REAL THING WORKS
// The rail is Eko's Fino DMT. Money moves in four steps, and the screen follows
// them one at a time rather than presenting one big form:
//
//   1  Find the customer by mobile — or register them (name, date of birth,
//      address), then verify with Aadhaar and a fingerprint on the same device
//      already used for AePS.
//   2  Add the beneficiary — name, account, IFSC, their mobile.
//   3  Enter an amount. The customer gets a one-time password.
//   4  Read the password back. Only now is the wallet debited and the money sent.
//
// Two things the old screen got wrong that are not repeated here:
//
//  * There is NO IMPS / NEFT / RTGS choice. Eko's transfer endpoint takes the
//    recipient, the amount and the OTP — the rail decides how it goes. Offering
//    a toggle that changes nothing is a lie about what the retailer controls.
//  * The charge is quoted from the live commission slab BEFORE the OTP is sent,
//    so the retailer knows what to collect. A fee discovered afterwards is how
//    arguments at the counter start.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeftRight, Loader2, Search, UserPlus, ShieldCheck, Send, Clock3,
  Building2, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Wallet, X,
  Fingerprint, ArrowRight, Receipt,
} from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/money-transfer")({
  head: () => ({ meta: [{ title: "Money Transfer — BharatOne" }] }),
  component: DmtPage,
});

type Config = {
  enabled: boolean; keys_set: boolean; wallet_balance: number;
  max_per_transaction: number; commission_slabs: number;
};
type Sender = {
  id: string; mobile: string; name: string | null; kyc_state: string; is_verified: boolean;
  monthly_limit: number; monthly_used: number; remaining: number; beneficiaries: number;
};
type Bene = {
  id: string; name: string; account_number: string; ifsc: string; bank_name: string | null;
  verified: boolean; verified_name: string | null;
};
type Txn = {
  id: string; created_at: string; amount: number; fee: number; sender_mobile: string | null;
  beneficiary_name: string | null; account_number: string | null; ifsc: string | null;
  bank_name: string | null; status: string; message: string | null; utr: string | null;
  client_ref_id: string | null; commission: number;
};

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const when = (s: string) => new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const inp = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const TONE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-amber-100 text-amber-700",
  pending_reconciliation: "bg-sky-100 text-sky-700",
  awaiting_otp: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};
const LABEL: Record<string, string> = {
  success: "Sent", failed: "Failed", refunded: "Refunded",
  pending_reconciliation: "Being verified", awaiting_otp: "Awaiting OTP", expired: "Expired",
};

const call = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("dmt", { body: { action, ...payload } });
  if (error) {
    // The edge function puts the useful sentence in the body, which
    // functions.invoke hides behind a generic "non-2xx status code".
    let detail = error.message;
    try { detail = JSON.parse(await (error as any).context?.text?.())?.error ?? detail; } catch { /* keep generic */ }
    throw new Error(detail);
  }
  return data as any;
};

function DmtPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [sender, setSender] = useState<Sender | null>(null);
  const [recent, setRecent] = useState<Sender[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, { data: t }, { data: s }] = await Promise.all([
        call("config"),
        (supabase as any).rpc("dmt_my_transactions", { _limit: 40 }),
        (supabase as any).rpc("dmt_my_senders", { _q: null, _limit: 8 }),
      ]);
      setCfg(c);
      setTxns((t as Txn[]) ?? []);
      setRecent((s as Sender[]) ?? []);
    } catch (e: any) {
      toast.error("Could not load money transfer", { description: String(e.message || e) });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !cfg) {
    return (
      <RetailerShell>
        <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      </RetailerShell>
    );
  }

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Domestic Money Transfer"
          subtitle="Send money to any Indian bank account from your wallet"
          actions={
            <button onClick={load}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          }
        />

        {!cfg?.enabled ? (
          <NotEnabled />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Wallet balance" value={inr(cfg.wallet_balance)} icon={Wallet} />
              <Stat label="Most per transfer" value={inr(cfg.max_per_transaction)} icon={ArrowRight} />
              <Stat label="Sent today"
                value={inr(txns.filter((t) => t.status === "success" && new Date(t.created_at).toDateString() === new Date().toDateString())
                  .reduce((a, t) => a + Number(t.amount), 0))}
                icon={Send} />
            </div>

            {cfg.commission_slabs === 0 && (
              <Banner tone="amber" icon={AlertTriangle}
                text="No commission rates are set up, so these transfers will earn you nothing. Ask an administrator to add them before you start." />
            )}

            {sender
              ? <TransferFlow sender={sender} cfg={cfg} onBack={() => { setSender(null); load(); }} onDone={load} />
              : <FindCustomer recent={recent} onPick={setSender} />}

            <History txns={txns} />
          </>
        )}
      </div>
    </RetailerShell>
  );
}

function NotEnabled() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <Clock3 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">Not available yet</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Money transfer is built and ready. Our banking partner has to switch the remittance
            service on for BharatOne before a transfer can reach a bank, so the form stays closed
            rather than taking something it cannot send.
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            It will appear here the day it goes live. Nothing needs setting up at your end.
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/40 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-india-green" />
        <p className="text-xs text-muted-foreground">
          If you used this page before 3 August 2026 and saw <b>“transfer initiated”</b>, no money
          moved and nothing was charged — the screen was incomplete and showed that message in
          error. Nothing was ever taken from your wallet.
        </p>
      </div>
    </div>
  );
}

/* ── Step 1 · find or register the customer ─────────────────────────────── */

function FindCustomer({ recent, onPick }: { recent: Sender[]; onPick: (s: Sender) => void }) {
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsOnboard, setNeedsOnboard] = useState(false);
  const [found, setFound] = useState<Sender | null>(null);

  const lookup = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) return toast.error("Enter the customer's 10-digit mobile number");
    setBusy(true); setNeedsOnboard(false); setFound(null);
    try {
      const r = await call("sender_lookup", { mobile });
      if (r.sender) { setFound(r.sender); if (!r.known) setNeedsOnboard(true); }
      else setNeedsOnboard(true);
    } catch (e: any) {
      toast.error("Could not look up the customer", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold">Who is sending the money?</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Every sender is registered once against their mobile number, as the regulator requires.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input className={`${inp} pl-9`} inputMode="numeric" maxLength={10}
              placeholder="Customer's mobile number"
              value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => e.key === "Enter" && lookup()} />
          </div>
          <button onClick={lookup} disabled={busy}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
          </button>
        </div>

        {found && !needsOnboard && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="font-bold">{found.name ?? found.mobile}</p>
              <p className="text-xs text-muted-foreground">
                {found.mobile} · {found.is_verified
                  ? <span className="font-semibold text-emerald-600">Verified</span>
                  : <span className="font-semibold text-amber-600">Not verified yet</span>}
                {" · "}{inr(found.remaining)} left this month
              </p>
            </div>
            <button onClick={() => onPick(found)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {needsOnboard && <OnboardForm mobile={mobile} onDone={(s) => { setNeedsOnboard(false); onPick(s); }} />}
      </section>

      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-extrabold">Recent customers</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recent.map((s) => (
              <li key={s.id}>
                <button onClick={() => onPick(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition hover:border-india-green hover:bg-muted/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{s.name ?? s.mobile}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.mobile} · {s.beneficiaries} beneficiar{s.beneficiaries === 1 ? "y" : "ies"} · {inr(s.remaining)} left
                    </p>
                  </div>
                  {s.is_verified
                    ? <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OnboardForm({ mobile, onDone }: { mobile: string; onDone: (s: Sender) => void }) {
  const [f, setF] = useState({ name: "", dob: "", residence_address: "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Enter the customer's name");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return toast.error("Enter the date of birth");
    if (!f.residence_address.trim()) return toast.error("Enter the customer's address");
    setBusy(true);
    try {
      await call("sender_onboard", { mobile, ...f, name: f.name.trim(), residence_address: f.residence_address.trim() });
      const r = await call("sender_lookup", { mobile });
      toast.success("Customer registered", { description: "Next, verify them with Aadhaar and a fingerprint." });
      onDone(r.sender);
    } catch (e: any) {
      toast.error("Could not register the customer", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4 text-india-green" /> New customer</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {mobile} is not registered yet. Take these details exactly as they appear on the customer's Aadhaar.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Full name</label>
          <input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="As per Aadhaar" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Date of birth</label>
          <input className={inp} type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Address</label>
          <input className={inp} value={f.residence_address}
            onChange={(e) => setF({ ...f, residence_address: e.target.value })} placeholder="Residential address" />
        </div>
      </div>
      <button onClick={save} disabled={busy}
        className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Register customer
      </button>
    </div>
  );
}

/* ── Steps 2–4 · verify, beneficiary, transfer ──────────────────────────── */

function TransferFlow({ sender, cfg, onBack, onDone }: {
  sender: Sender; cfg: Config; onBack: () => void; onDone: () => void;
}) {
  const [s, setS] = useState<Sender>(sender);
  const [benes, setBenes] = useState<Bene[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<Bene | null>(null);

  const refreshSender = useCallback(async () => {
    const r = await call("sender_lookup", { mobile: s.mobile });
    if (r.sender) setS(r.sender);
  }, [s.mobile]);

  const loadBenes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await call("recipients", { sender_id: s.id });
      setBenes((r.list as Bene[]) ?? []);
    } catch (e: any) {
      toast.error("Could not load beneficiaries", { description: String(e.message || e) });
    } finally { setLoading(false); }
  }, [s.id]);

  useEffect(() => { if (s.is_verified) loadBenes(); else setLoading(false); }, [s.is_verified, loadBenes]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div>
          <p className="font-extrabold">{s.name ?? s.mobile}</p>
          <p className="text-xs text-muted-foreground">
            {s.mobile} · {inr(s.remaining)} of {inr(s.monthly_limit)} left this month
          </p>
        </div>
        <button onClick={onBack} className="text-xs font-semibold text-india-green hover:underline">Change customer</button>
      </div>

      {!s.is_verified ? (
        <VerifySender sender={s} onVerified={async () => { await refreshSender(); loadBenes(); }} />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold">Beneficiaries</h2>
              <button onClick={() => setAdding(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                <UserPlus className="h-3.5 w-3.5" /> Add beneficiary
              </button>
            </div>

            {loading ? (
              <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>
            ) : benes.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No beneficiaries yet. Add the account the customer wants to send money to.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {benes.map((b) => (
                  <li key={b.id} className={`rounded-xl border p-3 transition ${pick?.id === b.id ? "border-india-green bg-india-green/5" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.bank_name ?? "Bank"} · ••••{b.account_number.slice(-4)}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{b.ifsc}</p>
                        {b.verified_name && (
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                            Bank says: {b.verified_name}
                          </p>
                        )}
                      </div>
                      <button title="Remove from your list"
                        onClick={async () => {
                          if (!window.confirm(`Remove ${b.name} from your list?`)) return;
                          try { await call("remove_recipient", { beneficiary_id: b.id }); loadBenes(); }
                          catch (e: any) { toast.error(String(e.message || e)); }
                        }}
                        className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => setPick(b)}
                      className="mt-2 w-full rounded-lg bg-india-green/10 py-1.5 text-xs font-bold text-india-green hover:bg-india-green/20">
                      Send money to {b.name.split(" ")[0]} →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pick && (
            <SendMoney sender={s} bene={pick} cfg={cfg}
              onClose={() => setPick(null)}
              onSent={async () => { setPick(null); await refreshSender(); onDone(); }} />
          )}
        </>
      )}

      {adding && (
        <AddBeneficiary sender={s} onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); loadBenes(); }} />
      )}
    </section>
  );
}

function VerifySender({ sender, onVerified }: { sender: Sender; onVerified: () => void }) {
  const [stage, setStage] = useState<"start" | "otp">(sender.kyc_state === "otp_sent" ? "otp" : "start");
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const startKyc = async () => {
    if (!/^\d{12}$/.test(aadhaar)) return toast.error("Enter the customer's 12-digit Aadhaar number");
    setBusy(true);
    try {
      // The fingerprint comes from the same RD-service device already used for
      // AePS. Without it the bank will not register the sender.
      const piddata = (window as any).bharatoneCapturePid
        ? await (window as any).bharatoneCapturePid()
        : null;
      if (!piddata) {
        toast.error("Fingerprint scanner not detected", {
          description: "Connect the same device you use for AEPS and try again.",
        });
        return;
      }
      await call("sender_ekyc", { sender_id: sender.id, aadhaar, piddata });
      toast.success("One-time password sent to the customer");
      setStage("otp");
    } catch (e: any) {
      toast.error("Verification could not start", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the one-time password");
    setBusy(true);
    try {
      const r = await call("sender_verify_otp", { sender_id: sender.id, otp });
      toast.success("Customer verified", {
        description: r?.kyc_charge
          ? `A one-time registration charge of ${inr(r.kyc_charge)} has been taken from your wallet. It is not charged again for this customer.`
          : undefined,
      });
      onVerified();
    } catch (e: any) {
      toast.error("Verification failed", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
      <p className="flex items-center gap-2 text-sm font-extrabold text-amber-800">
        <Fingerprint className="h-4 w-4" /> Verify this customer before sending
      </p>
      <p className="mt-1 text-xs text-amber-800/80">
        The bank requires Aadhaar and a fingerprint once per customer. It takes about a minute
        and does not have to be repeated.
      </p>

      {stage === "start" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={`${inp} max-w-xs`} inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar number"
            value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} />
          <button onClick={startKyc} disabled={busy}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-amber-600 px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />} Scan fingerprint
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={`${inp} max-w-[180px] tracking-[0.3em]`} inputMode="numeric" maxLength={8}
            placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} />
          <button onClick={verify} disabled={busy}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-amber-600 px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify
          </button>
          <button onClick={() => setStage("start")} className="text-xs font-semibold text-amber-800 hover:underline">Start again</button>
        </div>
      )}
    </div>
  );
}

function AddBeneficiary({ sender, onClose, onAdded }: {
  sender: Sender; onClose: () => void; onAdded: () => void;
}) {
  const [f, setF] = useState({ name: "", account: "", confirm: "", ifsc: "", recipient_mobile: "", bank_name: "" });
  const [busy, setBusy] = useState(false);
  const mismatch = f.confirm.length > 0 && f.account !== f.confirm;

  const save = async () => {
    if (!f.name.trim()) return toast.error("Enter the beneficiary's name");
    if (!/^\d{6,20}$/.test(f.account)) return toast.error("Enter a valid account number");
    if (mismatch) return toast.error("The two account numbers do not match");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc.toUpperCase())) return toast.error("Enter a valid IFSC code");
    if (!/^[6-9]\d{9}$/.test(f.recipient_mobile)) return toast.error("Enter the beneficiary's 10-digit mobile number");
    setBusy(true);
    try {
      const r = await call("add_recipient", {
        sender_id: sender.id, name: f.name.trim(), account: f.account,
        ifsc: f.ifsc.toUpperCase(), recipient_mobile: f.recipient_mobile,
        bank_name: f.bank_name.trim() || undefined,
      });
      const vn = r?.beneficiary?.verified_name;
      toast.success("Beneficiary added", {
        description: vn ? `The bank holds this account as ${vn}.` : undefined,
      });
      onAdded();
    } catch (e: any) {
      toast.error("Could not add the beneficiary", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 shadow-elev sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold"><Building2 className="h-4 w-4 text-india-green" /> Add beneficiary</h3>
            <p className="text-xs text-muted-foreground">For {sender.name ?? sender.mobile}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Beneficiary name</label>
            <input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="As on the bank account" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Account number</label>
            <input className={inp} inputMode="numeric" value={f.account}
              onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, "").slice(0, 20) })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Confirm account number</label>
            {/* Typed twice on purpose. A digit wrong here sends a stranger the money. */}
            <input className={`${inp} ${mismatch ? "border-rose-400" : ""}`} inputMode="numeric" value={f.confirm}
              onChange={(e) => setF({ ...f, confirm: e.target.value.replace(/\D/g, "").slice(0, 20) })} />
            {mismatch && <p className="mt-1 text-[11px] font-semibold text-rose-600">These do not match.</p>}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">IFSC code</label>
            <input className={`${inp} uppercase`} maxLength={11} value={f.ifsc}
              onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase().slice(0, 11) })} placeholder="HDFC0001234" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Beneficiary mobile</label>
            <input className={inp} inputMode="numeric" maxLength={10} value={f.recipient_mobile}
              onChange={(e) => setF({ ...f, recipient_mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-india-green text-sm font-bold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add beneficiary
          </button>
        </div>
      </div>
    </div>
  );
}

function SendMoney({ sender, bene, cfg, onClose, onSent }: {
  sender: Sender; bene: Bene; cfg: Config; onClose: () => void; onSent: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{ fee: number; total_debit: number; slab: boolean } | null>(null);
  const [stage, setStage] = useState<"amount" | "otp">("amount");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const amt = Number(amount);

  // Quoted live, before the OTP goes out. The retailer must know what to collect
  // from the customer before the customer's phone starts ringing.
  useEffect(() => {
    if (!(amt > 0)) { setQuote(null); return; }
    let dead = false;
    (async () => {
      const { data } = await (supabase as any).rpc("dmt_quote", { _mode: "ANY", _amount: amt });
      if (!dead) setQuote(data as any);
    })();
    return () => { dead = true; };
  }, [amt]);

  const tooMuch = amt > cfg.max_per_transaction;
  const overLimit = amt > sender.remaining;
  const shortWallet = quote ? quote.total_debit > cfg.wallet_balance : false;
  const canSend = amt > 0 && !tooMuch && !overLimit && !shortWallet;

  const sendOtp = async () => {
    setBusy(true);
    try {
      const r = await call("send_otp", { sender_id: sender.id, beneficiary_id: bene.id, amount: Math.round(amt) });
      setTransferId(r.transfer_id);
      setStage("otp");
      toast.success("One-time password sent", { description: r.message });
    } catch (e: any) {
      toast.error("Could not start the transfer", { description: String(e.message || e) });
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the one-time password");
    setBusy(true);
    try {
      const r = await call("transfer", { transfer_id: transferId, otp });
      toast.success("Money sent", {
        description: r.utr ? `Bank reference ${r.utr}` : "The bank has accepted the transfer.",
      });
      onSent();
    } catch (e: any) {
      // A held transfer is not a failure and must not be retried.
      const m = String(e.message || e);
      if (/verified|do NOT/i.test(m)) toast.warning("Being verified", { description: m });
      else toast.error("Transfer failed", { description: m });
      onSent();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-elev sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-extrabold"><Send className="h-4 w-4 text-india-green" /> Send money</h3>
            <p className="truncate text-xs text-muted-foreground">
              {bene.name} · {bene.bank_name ?? "Bank"} ••••{bene.account_number.slice(-4)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {stage === "amount" ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Amount</label>
              <input className={`${inp} h-14 text-2xl font-extrabold`} inputMode="numeric" placeholder="0"
                value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
            </div>

            {amt > 0 && (
              <div className="space-y-1.5 rounded-xl bg-muted/40 p-3 text-sm">
                <Row label="Amount to beneficiary" value={inr(amt)} />
                <Row label="Service charge" value={quote ? inr(quote.fee) : "…"} />
                <div className="border-t border-border pt-1.5">
                  <Row label="Collect from the customer" value={quote ? inr(quote.total_debit) : "…"} bold />
                </div>
                {quote && !quote.slab && (
                  <p className="text-[11px] text-amber-700">No charge is configured, so nothing is being added.</p>
                )}
              </div>
            )}

            {tooMuch && <Warn text={`The most that can be sent in one transfer is ${inr(cfg.max_per_transaction)}.`} />}
            {overLimit && !tooMuch && <Warn text={`This customer has only ${inr(sender.remaining)} left of their monthly limit.`} />}
            {shortWallet && !overLimit && !tooMuch && <Warn text={`Your wallet has ${inr(cfg.wallet_balance)}. Top up before sending.`} />}

            <button onClick={sendOtp} disabled={!canSend || busy}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-india-green text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send one-time password
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Nothing is charged yet. Your wallet is debited only after the customer's password is entered.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <Row label="Sending" value={inr(amt)} />
              <Row label="To" value={bene.name} />
              <div className="border-t border-border pt-1.5">
                <Row label="Debited from your wallet" value={quote ? inr(quote.total_debit) : inr(amt)} bold />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                One-time password sent to {sender.mobile}
              </label>
              <input className={`${inp} h-14 text-center text-2xl font-extrabold tracking-[0.4em]`} inputMode="numeric"
                maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} />
            </div>
            <button onClick={confirm} disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-india-green text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send {quote ? inr(amt) : ""}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              If this times out, do not send it again — check the history below first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── History ────────────────────────────────────────────────────────────── */

function History({ txns }: { txns: Txn[] }) {
  const sent = useMemo(() => txns.filter((t) => t.status !== "expired"), [txns]);
  if (sent.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-extrabold"><Receipt className="h-4 w-4 text-muted-foreground" /> Recent transfers</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="p-2.5">When</th><th className="p-2.5">To</th>
              <th className="p-2.5 text-right">Amount</th><th className="p-2.5">Status</th>
              <th className="p-2.5">Bank reference</th><th className="p-2.5 text-right">You earned</th>
            </tr>
          </thead>
          <tbody>
            {sent.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-2.5 text-xs text-muted-foreground">{when(t.created_at)}</td>
                <td className="p-2.5">
                  <p className="font-semibold">{t.beneficiary_name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">••••{(t.account_number ?? "").slice(-4)}</p>
                </td>
                <td className="p-2.5 text-right font-bold">{inr(t.amount)}</td>
                <td className="p-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[t.status] ?? "bg-muted"}`}>
                    {LABEL[t.status] ?? t.status}
                  </span>
                  {t.status !== "success" && t.message && (
                    <p className="mt-0.5 max-w-[220px] text-[11px] text-muted-foreground">{t.message}</p>
                  )}
                </td>
                <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{t.utr ?? "—"}</td>
                <td className="p-2.5 text-right text-xs font-semibold text-emerald-600">
                  {t.commission > 0 ? inr(t.commission) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Icon className="h-4 w-4 text-india-green" />
      <p className="mt-1.5 text-xl font-extrabold">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-extrabold" : "font-semibold"}>{value}</span>
    </div>
  );
}
function Warn({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {text}
    </p>
  );
}
function Banner({ tone, icon: Icon, text }: { tone: "amber"; icon: any; text: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-xs">{text}</p>
    </div>
  );
}
