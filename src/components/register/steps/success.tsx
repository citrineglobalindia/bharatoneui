import {
  CheckCircle2,
  Copy,
  Download,
  Share2,
  Sparkles,
  ShieldCheck,
  Printer,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Mail,
  Send,
  Link as LinkIcon,
  Phone,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo, useRef, useState } from "react";
import logoUrl from "@/assets/bharatone-logo.png";

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

export function buildSubmission(utr: string, plan: string, amount = 4999): SubmissionInfo {
  return {
    applicationId: genId("BO"),
    transactionId: genId("TXN"),
    utr: utr || "—",
    amount: `₹${amount.toLocaleString("en-IN")}`,
    submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    plan,
  };
}

function buildReceiptCanvas(info: SubmissionInfo): HTMLCanvasElement {
  const W = 920, H = 1120;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FF9933"; ctx.fillRect(0, 0, W / 3, 14);
  ctx.fillStyle = "#138808"; ctx.fillRect((2 * W) / 3, 0, W / 3, 14);
  ctx.fillStyle = "#9A3412"; ctx.font = "bold 30px Arial"; ctx.fillText("BharatOne \u2014 Official Receipt", 56, 92);
  ctx.fillStyle = "#6b7280"; ctx.font = "18px Arial"; ctx.fillText("KYC Submission \u00b7 BharatOne", 56, 124);
  ctx.strokeStyle = "#E5E7EB"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(56, 150); ctx.lineTo(W - 56, 150); ctx.stroke();
  const rows: [string, string][] = [
    ["Application ID", info.applicationId],
    ["Transaction ID", info.transactionId],
    ["UTR / Reference", info.utr],
    ["Amount Paid", info.amount],
    ["Plan", info.plan],
    ["Submitted", info.submittedAt],
    ["Status", "Under Review"],
  ];
  let y = 220;
  for (const [k, v] of rows) {
    ctx.fillStyle = "#9ca3af"; ctx.font = "14px Arial"; ctx.fillText(k.toUpperCase(), 56, y);
    ctx.fillStyle = "#111827"; ctx.font = "bold 26px Arial"; ctx.fillText(String(v), 56, y + 34);
    y += 92;
  }
  ctx.fillStyle = "#6b7280"; ctx.font = "16px Arial";
  ctx.fillText("Thank you for choosing BharatOne \u00b7 support@bharatone.com", 56, H - 60);
  return c;
}

export function SuccessStep({ info }: { info: SubmissionInfo }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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
        "🇮🇳 BharatOne — KYC Submission Receipt",
        "────────────────────────────────────────",
        `Application ID : ${info.applicationId}`,
        `Transaction ID : ${info.transactionId}`,
        `UTR / Reference: ${info.utr}`,
        `Amount Paid    : ${info.amount}`,
        `Plan           : ${info.plan}`,
        `Submitted At   : ${info.submittedAt}`,
        "",
        "Status         : Under Review",
        "Support        : support@bharatone.com",
        "Website        : https://bharatone.com",
      ].join("\n"),
    [info]
  );

  const shareMessage = [
    "BharatOne — KYC Submission Receipt",
    `Application ID: ${info.applicationId}`,
    `Transaction ID: ${info.transactionId}`,
    `UTR / Reference: ${info.utr}`,
    `Amount: ${info.amount}`,
    `Plan: ${info.plan}`,
    `Submitted: ${info.submittedAt}`,
    "Status: Under Review",
  ].join("\n");
  const enc = encodeURIComponent(shareMessage);

  const downloadPNG = () => {
    try {
      setBusy("png");
      const canvas = buildReceiptCanvas(info);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `BharatOne-Receipt-${info.applicationId}.png`;
      a.click();
    } finally {
      setBusy(null);
    }
  };

  const downloadPDF = async () => {
    try {
      setBusy("pdf");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const W = pdf.internal.pageSize.getWidth();
      pdf.setFillColor(255, 153, 51); pdf.rect(0, 0, W / 3, 8, "F");
      pdf.setFillColor(19, 136, 8); pdf.rect((2 * W) / 3, 0, W / 3, 8, "F");
      pdf.setTextColor(154, 52, 18); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
      pdf.text("BharatOne - Official Receipt", 40, 60);
      pdf.setTextColor(107, 114, 128); pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      pdf.text("KYC Submission - BharatOne", 40, 78);
      pdf.setDrawColor(229, 231, 235); pdf.line(40, 95, W - 40, 95);
      const rows: [string, string][] = [
        ["Application ID", info.applicationId],
        ["Transaction ID", info.transactionId],
        ["UTR / Reference", info.utr],
        ["Amount Paid", info.amount.replace("₹", "Rs ")],
        ["Plan", info.plan],
        ["Submitted", info.submittedAt],
        ["Status", "Under Review"],
      ];
      let y = 130;
      for (const [k, v] of rows) {
        pdf.setTextColor(156, 163, 175); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
        pdf.text(k.toUpperCase(), 40, y);
        pdf.setTextColor(17, 24, 39); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
        pdf.text(String(v), 40, y + 18);
        y += 48;
      }
      pdf.setTextColor(107, 114, 128); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      pdf.text("Thank you for choosing BharatOne - support@bharatone.com", 40, y + 24);
      pdf.save(`BharatOne-Receipt-${info.applicationId}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${enc}`, "_blank", "noopener");
  const shareTelegram = () =>
    window.open(`https://t.me/share/url?url=${encodeURIComponent("https://bharatone.com")}&text=${enc}`, "_blank", "noopener");
  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent("BharatOne Submission Receipt - " + info.applicationId)}&body=${enc}`;
  };
  const shareSMS = () => {
    window.location.href = `sms:?&body=${enc}`;
  };
  const nativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "BharatOne Submission Receipt", text: shareMessage });
      else await copy("share", shareMessage);
    } catch { /* user cancelled */ }
  };

  const copyReceipt = () => copy("receipt", receiptText);

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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
    `BharatOne|${info.applicationId}|${info.transactionId}|${info.utr}|${info.amount}`
  )}`;

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

      {/* Premium Receipt Card (also used for PNG/PDF export) */}
      <div className="relative mt-6 flex justify-center">
        <div
          ref={receiptRef}
          className="relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-elev"
          style={{
            colorScheme: "light",
            color: "#111827",
            border: "1px solid #E5E7EB",
          }}
        >
          {/* Tricolor strip */}
          <div className="flex h-1.5 w-full">
            <div className="flex-1" style={{ background: "#FF9933" }} />
            <div className="flex-1 bg-white" />
            <div className="flex-1" style={{ background: "#138808" }} />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between gap-3 px-6 py-5"
            style={{
              background:
                "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 50%, #ECFDF5 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="BharatOne" className="h-10 w-auto" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A3412]">
                  Official Receipt
                </p>
                <p className="text-[11px] font-medium text-neutral-600">
                  KYC Submission · BharatOne
                </p>
              </div>
            </div>
            <div
              className="rounded-lg border px-3 py-1.5 text-center"
              style={{ borderColor: "#86EFAC", background: "#F0FDF4" }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#166534]">
                Paid
              </p>
              <p className="font-mono text-sm font-bold text-[#14532D]">
                {info.amount}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-3 text-left">
                <ReceiptLine label="Application ID" value={info.applicationId} mono />
                <ReceiptLine label="Transaction ID" value={info.transactionId} mono />
                <ReceiptLine label="UTR / Reference" value={info.utr} mono />
                <ReceiptLine label="Plan" value={info.plan} />
                <ReceiptLine label="Submitted" value={info.submittedAt} />
              </div>
              <div className="flex flex-col items-center justify-start">
                <div className="rounded-lg border border-neutral-200 bg-white p-1.5">
                  <img
                    src={qrUrl}
                    alt="Receipt QR"
                    width={120}
                    height={120}
                    className="h-[120px] w-[120px]"
                    crossOrigin="anonymous"
                  />
                </div>
                <p className="mt-1.5 text-[9px] font-medium uppercase tracking-wider text-neutral-500">
                  Scan to verify
                </p>
              </div>
            </div>

            <div
              className="mt-5 flex items-center justify-between rounded-xl border border-dashed px-4 py-3"
              style={{ borderColor: "#FCD34D", background: "#FFFBEB" }}
            >
              <div className="flex items-center gap-2 text-left">
                <ShieldCheck className="h-4 w-4" style={{ color: "#B45309" }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92400E]">
                    Status
                  </p>
                  <p className="text-xs font-bold text-[#78350F]">Under Review</p>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500">
                support@bharatone.com
              </p>
            </div>
          </div>

          {/* Perforation + footer */}
          <div
            className="h-3 w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 6px 6px, #E5E7EB 2px, transparent 2.5px)",
              backgroundSize: "12px 12px",
              backgroundPosition: "0 -3px",
            }}
          />
          <div className="bg-neutral-50 px-6 py-3 text-center">
            <p className="text-[10px] font-medium text-neutral-500">
              Thank you for choosing BharatOne · Receipt #{info.applicationId}
            </p>
          </div>
        </div>
      </div>

      {/* Quick-copy field rows */}
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
        <Row label="Application ID" value={info.applicationId} k="app" />
        <Row label="Transaction ID" value={info.transactionId} k="txn" />
        <Row label="UTR / Reference" value={info.utr} k="utr" />
        <Row label="Amount Paid" value={info.amount} k="amt" />
      </div>

      {/* Advanced action bar */}
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={busy !== null}
              className="rounded-xl bg-saffron-gradient shadow-elev hover:opacity-95"
            >
              <Download className="h-4 w-4" />
              {busy === "pdf"
                ? "Generating PDF…"
                : busy === "png"
                ? "Generating Image…"
                : "Download Receipt"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel>Save as</DropdownMenuLabel>
            <DropdownMenuItem onClick={downloadPDF}>
              <FileText className="h-4 w-4" /> PDF document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadPNG}>
              <ImageIcon className="h-4 w-4" /> PNG image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyReceipt}>
              <Copy className="h-4 w-4" />
              {copied === "receipt" ? "Copied!" : "Copy as text"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel>Share via</DropdownMenuLabel>
            <DropdownMenuItem onClick={shareWhatsApp}>
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareTelegram}>
              <Send className="h-4 w-4 text-[#229ED9]" /> Telegram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareEmail}>
              <Mail className="h-4 w-4 text-primary" /> Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareSMS}>
              <Phone className="h-4 w-4 text-foreground" /> SMS
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={nativeShare}>
              <LinkIcon className="h-4 w-4" /> More options…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
          <Printer className="h-4 w-4" /> Print
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

function ReceiptLine({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[12px] font-semibold text-neutral-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
