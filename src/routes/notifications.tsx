import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Banknote, ArrowLeftRight, Smartphone, ShieldCheck, Wallet as WalletIcon, FileText } from "lucide-react";
import { useState } from "react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { SectionCard } from "@/components/retailer/section-card";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BharatOne" }] }),
  component: NotificationsPage,
});

type Item = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "success" | "info" | "warn" | "danger";
  icon: React.ReactNode;
  read?: boolean;
};

const TONE: Record<Item["tone"], string> = {
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-sky-100 text-sky-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

const SEED: Item[] = [
  { id: "n1", title: "AEPS withdrawal successful", body: "₹2,500 withdrawn for Ramesh K. · Commission ₹5.00 credited", time: "2 min ago", tone: "success", icon: <Banknote className="h-4 w-4" /> },
  { id: "n2", title: "Wallet balance low", body: "Your wallet balance has dropped below ₹5,000. Top up to avoid service interruption.", time: "18 min ago", tone: "warn", icon: <WalletIcon className="h-4 w-4" /> },
  { id: "n3", title: "Money transfer pending RBI clearance", body: "IMPS ₹14,800 to HDFC ****4421 awaiting beneficiary verification.", time: "1 hr ago", tone: "info", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: "n4", title: "GST application approved", body: "ARN AA29110123456X for client Bharat Traders has been approved.", time: "3 hrs ago", tone: "success", icon: <FileText className="h-4 w-4" />, read: true },
  { id: "n5", title: "Recharge failed — refund initiated", body: "Airtel ₹199 prepaid recharge failed. Amount will be refunded within 24 hrs.", time: "5 hrs ago", tone: "danger", icon: <Smartphone className="h-4 w-4" />, read: true },
  { id: "n6", title: "Video KYC verified", body: "Your Video KYC submission has been approved by the compliance team.", time: "Yesterday", tone: "success", icon: <ShieldCheck className="h-4 w-4" />, read: true },
  { id: "n7", title: "New circular from NPCI", body: "Updated AEPS transaction limits effective from next month.", time: "2 days ago", tone: "info", icon: <ShieldCheck className="h-4 w-4" />, read: true },
];

const FILTERS = ["All", "Unread", "Transactions", "Applications", "System"] as const;

function NotificationsPage() {
  const [items, setItems] = useState<Item[]>(SEED);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const unread = items.filter((n) => !n.read).length;

  const visible = items.filter((n) => {
    if (filter === "Unread") return !n.read;
    if (filter === "Transactions") return ["AEPS withdrawal successful", "Money transfer pending RBI clearance", "Recharge failed — refund initiated"].includes(n.title);
    if (filter === "Applications") return n.title.includes("GST") || n.title.includes("KYC");
    if (filter === "System") return n.title.includes("Wallet") || n.title.includes("NPCI");
    return true;
  });

  return (
    <RetailerShell>
      <div className="space-y-5">
        <PageHeader
          icon={<Bell className="h-5 w-5" />}
          title="Notifications"
          subtitle={unread > 0 ? `You have ${unread} unread notifications` : "You're all caught up"}
          action={
            unread > 0 ? (
              <button
                onClick={() => setItems((xs) => xs.map((n) => ({ ...n, read: true })))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === f ? "bg-saffron-gradient text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <SectionCard title={`${visible.length} notification${visible.length === 1 ? "" : "s"}`}>
          <ul className="divide-y divide-border -mx-4">
            {visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing here yet.</li>
            )}
            {visible.map((n) => (
              <li
                key={n.id}
                onClick={() => setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/60 transition ${n.read ? "" : "bg-saffron/[0.04]"}`}
              >
                <span className={`mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${TONE[n.tone]}`}>{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </RetailerShell>
  );
}