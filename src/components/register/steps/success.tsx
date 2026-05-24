import { CheckCircle2, Copy, Download, Share2, Sparkles, ShieldCheck, Printer } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export type SubmissionInfo = {
  applicationId: string;
  transactionId: string;
  utr: string;
  amount: string;
  submittedAt: string;
  plan: string;
};

function genId(prefix: string) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

export function buildSubmission(utr: string, plan: string): SubmissionInfo {
  return {
    applicationId: genId("BO"),
    transactionId: genId("TXN"),
    utr: utr || "—",
    amount: "₹4,999",
    submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    plan,
  };
}

export function SuccessStep({ info }: { info: SubmissionInfo }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const receiptText = useMemo(
    () =>
      [
        "BharatOne — KYC Submission Receipt",
        "====================================",
        `Application ID : ${info.applicationId}`,
        `Transaction ID : ${info.transactionId}`,
        `UTR / Reference: ${info.utr}`,
        `Amount Paid    : ${info.amount}`,
        `Plan           : ${info.plan}`,
        `Submitted At   : ${info.submittedAt}`,
        "",
        "Status         : Under Review",
        "Support        : support@bharatone.com",
      ].join("\n"),
    [info]
  );

  const download = () => {
    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BharatOne-Receipt-${info.applicationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const payload = {
      title: "BharatOne Submission",
      text: `My BharatOne application has been submitted.\nApplication ID: ${info.applicationId}\nTransaction ID: ${info.transactionId}`,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else await copy("share", payload.text);
    } catch {}
  };

  const Row = ({ label, value, k }: { label: string; value: string; k: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => copy(k, value)}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground transition hover:bg-muted"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied === k ? "Copied" : "Copy"}
      </button>
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-saffron-gradient opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-20 h-48 w-48 rounded-full bg-[oklch(0.7_0.15_150)] opacity-15 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.75_0.15_150)] opacity-40" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.95_0.06_150)] text-[oklch(0.45_0.15_150)] shadow-elev">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        </div>
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-[11px] font-semibold text-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Submission Successful
        </div>
        <h2 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">
          Application Submitted
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your BharatOne onboarding has been received. Save the transaction details below — our team will verify your KYC and notify you on your registered email and mobile.
        </p>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
        <Row label="Application ID" value={info.applicationId} k="app" />
        <Row label="Transaction ID" value={info.transactionId} k="txn" />
        <Row label="UTR / Reference" value={info.utr} k="utr" />
        <Row label="Amount Paid" value={info.amount} k="amt" />
        <div className="rounded-xl border border-border bg-background/60 px-4 py-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Submitted</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{info.submittedAt}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.95_0.06_150)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.35_0.15_150)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Under Review
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={download} className="rounded-xl bg-saffron-gradient shadow-elev hover:opacity-95">
          <Download className="h-4 w-4" /> Save Transaction
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
          <Printer className="h-4 w-4" /> Print Receipt
        </Button>
        <Button variant="outline" onClick={share} className="rounded-xl">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-5">
        <Button asChild variant="ghost">
          <Link to="/">Back to Home</Link>
        </Button>
        <Button asChild className="rounded-xl bg-primary hover:bg-primary/90">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
}
