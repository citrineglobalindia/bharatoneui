import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Clock, XCircle, HelpCircle, Loader2, ArrowRight, Home } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Where the payment gateway sends the customer back to.
 *
 * ICICI form-POSTs the result to our icici-return function, which verifies the
 * signature and then redirects the browser here with a plain-language outcome. This
 * page never decides anything itself — it only reports what the server concluded,
 * because anything in the URL could have been typed by hand.
 */
const search = z.object({
  status: z.string().optional().default("unknown"),
  ref: z.string().optional().default(""),
  purpose: z.string().optional().default(""),
  amount: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

export const Route = createFileRoute("/payment-result")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Payment status — BharatOne" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentResult,
});

const PURPOSE: Record<string, string> = {
  wallet_topup: "Wallet recharge",
  registration_fee: "Registration fee",
  service_payment: "Service payment",
  estore_order: "E-Store order",
};

function PaymentResult() {
  const { status, ref, purpose, amount, message } = Route.useSearch();
  const [live, setLive] = useState(status);
  const [liveMsg, setLiveMsg] = useState(message);
  const [checking, setChecking] = useState(false);

  // A UPI payment often comes back as "pending" because the bank confirms a moment
  // later. Rather than leaving the customer staring at limbo, ask the gateway again.
  useEffect(() => {
    if (live !== "pending" || !ref) return;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      setChecking(true);
      const { data } = await (supabase as any).functions.invoke("icici-status", {
        body: { merchant_txn_no: ref },
      });
      setChecking(false);
      const outcome = data?.results?.[0]?.outcome;
      if (outcome === "paid" || outcome === "failed") {
        setLive(outcome);
        setLiveMsg(data?.results?.[0]?.detail ?? "");
        return;
      }
      if (tries < 5) setTimeout(tick, 5000);
    };
    const t = setTimeout(tick, 4000);
    return () => clearTimeout(t);
  }, [live, ref]);

  const look = {
    paid: {
      icon: CheckCircle2, tone: "text-india-green", ring: "bg-india-green/10",
      title: "Payment successful",
      body: "Thank you. We have received your payment and our team has been notified.",
    },
    pending: {
      icon: Clock, tone: "text-amber-600", ring: "bg-amber-500/10",
      title: "Payment is being confirmed",
      body: "Your bank is still confirming this payment. It usually takes under a minute — you can stay on this page.",
    },
    failed: {
      icon: XCircle, tone: "text-destructive", ring: "bg-destructive/10",
      title: "Payment did not go through",
      body: "No money has been taken. You can try again, or use a different payment method.",
    },
    bad_hash: {
      icon: XCircle, tone: "text-destructive", ring: "bg-destructive/10",
      title: "We could not verify this payment",
      body: "For your safety we have not recorded it. If money has left your account, contact support with the reference below and we will trace it.",
    },
    not_found: {
      icon: HelpCircle, tone: "text-muted-foreground", ring: "bg-muted",
      title: "We could not find this payment",
      body: "The reference does not match anything in our records. If you have been charged, please contact support.",
    },
    unknown: {
      icon: HelpCircle, tone: "text-muted-foreground", ring: "bg-muted",
      title: "Payment status unclear",
      body: "We could not confirm the result. If money has left your account it is safe — contact support with the reference below and we will check.",
    },
  }[live] ?? {
    icon: HelpCircle, tone: "text-muted-foreground", ring: "bg-muted",
    title: "Payment status unclear", body: "",
  };

  const Icon = look.icon;

  return (
    <div className="flex min-h-screen flex-col bg-tricolor">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <BharatOneLogo className="h-8 w-auto" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${look.ring}`}>
            <Icon className={`h-8 w-8 ${look.tone}`} />
          </div>

          <h1 className="mt-5 text-xl font-bold">{look.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{look.body}</p>

          {live === "pending" && checking && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking with your bank…
            </p>
          )}

          {(amount || ref) && (
            <dl className="mt-6 divide-y divide-border rounded-xl border border-border text-left text-sm">
              {amount && (
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-bold">₹{Number(amount).toLocaleString("en-IN")}</dd>
                </div>
              )}
              {purpose && (
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted-foreground">For</dt>
                  <dd className="font-medium">{PURPOSE[purpose] ?? purpose}</dd>
                </div>
              )}
              {ref && (
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono text-xs font-semibold">{ref}</dd>
                </div>
              )}
            </dl>
          )}

          {liveMsg && live !== "paid" && (
            <p className="mt-3 text-xs text-muted-foreground">{liveMsg}</p>
          )}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" /> Back to home
              </Link>
            </Button>
            {live === "failed" && (
              <Button asChild variant="outline" className="flex-1">
                <Link to="/wallet">
                  Try again <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Need help? Quote the reference above to{" "}
            <a href="mailto:support@mybharatone.com" className="font-semibold text-india-green hover:underline">
              support@mybharatone.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
