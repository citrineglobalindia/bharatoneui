// Domestic Money Transfer.
//
// WHAT WAS HERE BEFORE, AND WHY IT HAD TO GO
// ------------------------------------------
// This route used to render a complete-looking transfer screen: three saved
// beneficiaries (Suresh Kumar, Anitha R., Mohan Lal — all invented, with made-up
// account numbers), stat cards reading "Today's Transfers ₹20,700" and
// "Commission Earned ₹57" that were typed-in literals, and a Send button whose
// entire implementation was:
//
//     onSubmit={(e) => { e.preventDefault(); toast.success(`${mode} transfer initiated`); }}
//
// No API call. No database write. Nothing. A retailer could fill in a customer's
// beneficiary details, press Send, read "IMPS transfer initiated", and tell the
// customer their money was on its way. It was reachable from the retailer
// dashboard's Quick Services grid.
//
// A screen that says a payment succeeded when nothing happened is worse than no
// screen at all, so it is gone. What is here now says exactly where the feature
// stands and nothing more.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, Clock3, ShieldCheck, ArrowRight } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";

export const Route = createFileRoute("/money-transfer")({
  head: () => ({ meta: [{ title: "Money Transfer — BharatOne" }] }),
  component: DmtPage,
});

function DmtPage() {
  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Domestic Money Transfer"
          subtitle="Send money to any Indian bank account by IMPS or NEFT"
        />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold">Not available yet</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Money transfer is built and waiting on one thing: our banking partner has to
                switch the remittance service on for BharatOne. Until they do, no transfer can
                actually reach a bank, so the screen stays closed rather than pretending.
              </p>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                You will see it appear here the day it goes live. Nothing needs to be set up at
                your end.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/40 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-india-green" />
            <p className="text-xs text-muted-foreground">
              If you used this page before today and saw <b>“transfer initiated”</b>, no money
              moved and nothing was charged — the screen was incomplete and was showing that
              message in error. Nothing was ever taken from your wallet.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/aeps"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
              AEPS Banking <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/bbps"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
              Recharge &amp; Bills
            </Link>
          </div>
        </div>
      </div>
    </RetailerShell>
  );
}
