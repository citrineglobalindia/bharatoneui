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
 *   - administrators are never held, so they can work while it is on.
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
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["maintenance_mode", "maintenance_message", "company_office_contact", "support_email"]);
      // Fail open: a failed read must not take the business offline.
      if (error || !data) { setState("open"); return; }

      const map: Record<string, string> = {};
      for (const r of data as { key: string; value: string }[]) map[r.key] = r.value;

      setMsg(map.maintenance_message || "We are carrying out scheduled maintenance and will be back shortly.");
      if (map.company_office_contact) setPhone(map.company_office_contact);
      if (map.support_email) setEmail(map.support_email);

      if (map.maintenance_mode !== "on") { setState("open"); return; }

      // It is on — but administrators keep working, and they are the only
      // people who can turn it off.
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session?.user?.id) { setState("closed"); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", s.session.user.id);
      const isAdmin = ((roles ?? []) as { role: string }[]).some((r) => r.role === "admin");
      setState(isAdmin ? "open" : "closed");
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
