import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Wrench, Phone, Mail, RefreshCw } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { supabase } from "@/integrations/supabase/client";

/**
 * Maintenance mode.
 *
 * The blunt ways to take a site off the air — pausing the Vercel project, or
 * the Supabase project — also stop the admin portal, so the switch ends up on
 * the far side of the door you just locked, and any AePS or wallet transaction
 * in flight fails instead of finishing. This is a row in app_settings: it flips
 * instantly, it flips back instantly, and no data is touched.
 *
 * Two deliberate exemptions, and they are what make it safe:
 *
 *   - the login pages stay open, so somebody can get in to turn it off;
 *   - one named account keeps working, so the site can be checked while paused.
 *
 * That exemption used to be "any administrator", which was three people. It is
 * now an explicit list held in the database and evaluated server-side, so the
 * other administrators see the maintenance page like anybody else, and the name
 * on the list never reaches the browser — publishing it would tell an attacker
 * exactly which single account is worth their attention.
 *
 * It also fails OPEN. If the settings read errors — the very situation where
 * the database is unwell — the site stays up rather than a network blip
 * silently taking the whole business offline.
 */

const OPEN_PREFIXES = [
  "/login", "/admin-login", "/qc-login", "/hr-login", "/accountant-login",
  "/telecaller-login", "/distributor-login", "/master-distributor-login",
  "/bde-login", "/dro-login", "/tro-login", "/store-login", "/super-login",
  "/forgot-password", "/verify/", "/payment-result",
];
const isOpenPath = (p: string) =>
  OPEN_PREFIXES.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x)) || p.includes("-login");

function MaintenancePage({ message, phone, email }: { message: string; phone: string; email: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-tricolor p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elev">
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
        <div className="bg-gradient-to-br from-orange-50 via-white to-emerald-50 px-6 pb-6 pt-7 text-center">
          <div className="flex justify-center">
            <BharatOneLogo size="lg" />
          </div>
          <div className="mt-5 flex justify-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Wrench className="h-8 w-8" />
            </span>
          </div>
        </div>

        <div className="px-6 pb-7 pt-5 text-center">
          <h1 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">
            We&apos;ll be back shortly
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-india-green px-6 text-sm font-semibold text-white transition hover:bg-india-green/90"
          >
            <RefreshCw className="h-4 w-4" /> Check again
          </button>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <a href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition hover:border-india-green hover:bg-india-green/5">
              <Phone className="h-4 w-4 text-india-green" />
              <span className="font-semibold">{phone}</span>
            </a>
            <a href={`mailto:${email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition hover:border-india-green hover:bg-india-green/5">
              <Mail className="h-4 w-4 text-india-green" />
              <span className="truncate font-semibold">{email}</span>
            </a>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
      </div>
    </div>
  );
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [state, setState] = useState<"unknown" | "open" | "closed">("unknown");
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("+91 9071100311");
  const [email, setEmail] = useState("help@mybharatone.com");

  const check = useCallback(async () => {
    try {
      // One server-side call decides everything. The list of who may still use
      // the site while it is paused is never sent to the browser — it names a
      // real person, and publishing it tells an attacker precisely which single
      // account is worth their attention.
      const { data, error } = await (supabase.rpc as any)("maintenance_state");
      // Fail open: a failed read must not take the business offline.
      if (error || !data) { setState("open"); return; }

      const d = data as { on?: boolean; message?: string; may_pass?: boolean };
      if (d.message) setMsg(d.message);
      setState(d.on && !d.may_pass ? "closed" : "open");

      // Contact details for the page, from the keys the public site may read.
      const { data: c } = await supabase
        .from("app_settings").select("key,value")
        .in("key", ["company_office_contact", "support_email"]);
      for (const r of (c as { key: string; value: string }[]) ?? []) {
        if (r.key === "company_office_contact" && r.value) setPhone(r.value);
        if (r.key === "support_email" && r.value) setEmail(r.value);
      }
    } catch {
      setState("open");
    }
  }, []);

  useEffect(() => {
    void check();
    // Re-check every couple of minutes so a retailer sitting on the page gets
    // back in on their own once the site returns, without being told to refresh.
    const t = window.setInterval(() => { void check(); }, 120000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { window.clearInterval(t); sub.subscription.unsubscribe(); };
  }, [check]);

  // Never flash the maintenance page before the check has run, and never hold
  // the login pages — that is the way back in.
  if (state !== "closed" || isOpenPath(pathname)) return <>{children}</>;
  return <MaintenancePage message={msg} phone={phone} email={email} />;
}
