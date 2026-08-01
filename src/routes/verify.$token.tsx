// Public ID card verification — what the QR on the back of a card opens.
//
// This page is reached by someone standing in front of a person holding a card,
// so it answers one question first and loudly: is this card valid right now.
// The detail below it is only enough to confirm the card matches the person —
// no phone number, no date of birth, no blood group, no photograph. Somebody who
// photographs a QR code should not walk away with a personal record.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX, ShieldAlert, Loader2, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/verify/$token")({
  head: () => ({
    meta: [
      { title: "Verify ID card — BharatOne" },
      { name: "description", content: "Check whether a BharatOne staff identity card is genuine and currently valid." },
      // A verification result is about a named individual. It should not be
      // indexed, and there is nothing here worth a search engine's attention.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyPage,
});

type Result = {
  found: boolean; valid: boolean; state: string;
  name?: string; designation?: string; department?: string | null;
  work_location?: string | null; card_no?: string;
  issued_on?: string; valid_until?: string | null; company?: string;
};

const LOOK: Record<string, { title: string; note: string; icon: any; ring: string; chip: string }> = {
  active: {
    title: "Valid card", note: "This card is genuine and currently in force.",
    icon: ShieldCheck, ring: "border-emerald-300 bg-emerald-50", chip: "bg-emerald-600",
  },
  expired: {
    title: "Expired card", note: "This card was genuine but has passed its expiry date. Ask the holder for a current one.",
    icon: Clock3, ring: "border-amber-300 bg-amber-50", chip: "bg-amber-600",
  },
  revoked: {
    title: "Cancelled card", note: "This card has been cancelled by BharatOne and should not be accepted.",
    icon: ShieldX, ring: "border-rose-300 bg-rose-50", chip: "bg-rose-600",
  },
  lost: {
    title: "Reported lost", note: "This card was reported lost or stolen and should not be accepted.",
    icon: ShieldX, ring: "border-rose-300 bg-rose-50", chip: "bg-rose-600",
  },
  unknown: {
    title: "Not recognised", note: "No BharatOne card matches this code. It may be a forgery, or the link may have been mistyped.",
    icon: ShieldAlert, ring: "border-rose-300 bg-rose-50", chip: "bg-rose-600",
  },
};

const d = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function VerifyPage() {
  const { token } = Route.useParams();
  const [res, setRes] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let on = true;
    (supabase as any).rpc("id_card_verify", { p_token: token }).then(
      ({ data, error }: any) => {
        if (!on) return;
        if (error || !data) setFailed(true); else setRes(data as Result);
      },
      () => on && setFailed(true),
    );
    return () => { on = false; };
  }, [token]);

  if (failed) {
    return (
      <Shell>
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          The check could not be completed. Please try again in a moment.
        </p>
      </Shell>
    );
  }

  if (!res) {
    return (
      <Shell>
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-india-green" />
        </div>
      </Shell>
    );
  }

  const look = LOOK[res.state] ?? LOOK.unknown;
  const Icon = look.icon;

  return (
    <Shell>
      <div className={`rounded-2xl border-2 ${look.ring} p-6 text-center`}>
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${look.chip}`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{look.title}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{look.note}</p>
      </div>

      {res.found && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-lg font-extrabold">{res.name}</p>
            <p className="text-sm text-muted-foreground">{res.designation}</p>
          </div>
          <dl className="divide-y divide-border text-sm">
            <Line k="Card number" v={res.card_no} mono />
            {res.department && <Line k="Department" v={res.department} />}
            {res.work_location && <Line k="Work area" v={res.work_location} />}
            <Line k="Issued" v={d(res.issued_on)} />
            <Line k="Valid until" v={res.valid_until ? d(res.valid_until) : "No expiry"} />
          </dl>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {res.company ?? "BharatOne Services and Affiliates Pvt. Ltd."}
        {" · "}
        <a href="mailto:help@mybharatone.com" className="font-semibold text-india-green underline">
          Report a problem with this card
        </a>
      </p>
    </Shell>
  );
}

const Line = ({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-2.5">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className={`font-semibold ${mono ? "font-mono text-xs" : ""}`}>{v ?? "—"}</dd>
  </div>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background px-4 py-10">
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex justify-center"><BharatOneLogo size="md" /></div>
      {children}
    </div>
  </div>
);
