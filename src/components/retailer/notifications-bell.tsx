import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Banknote,
  ArrowLeftRight,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Wallet as WalletIcon,
  FileText,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  to: string;
  tone: "success" | "info" | "warn" | "danger";
  icon: React.ReactNode;
  read?: boolean;
};

const SEED: Notif[] = [
  {
    id: "n1",
    title: "AEPS withdrawal successful",
    body: "₹2,500 withdrawn for Ramesh K. · Commission ₹5.00 credited",
    time: "2 min ago",
    to: "/aeps",
    tone: "success",
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    id: "n2",
    title: "Wallet balance low",
    body: "Your wallet balance has dropped below ₹5,000. Top up to avoid service interruption.",
    time: "18 min ago",
    to: "/wallet",
    tone: "warn",
    icon: <WalletIcon className="h-4 w-4" />,
  },
  {
    id: "n3",
    title: "Money transfer pending RBI clearance",
    body: "IMPS ₹14,800 to HDFC ****4421 awaiting beneficiary verification.",
    time: "1 hr ago",
    to: "/money-transfer",
    tone: "info",
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    id: "n4",
    title: "GST application approved",
    body: "ARN AA29110123456X for client Bharat Traders has been approved.",
    time: "3 hrs ago",
    to: "/applications",
    tone: "success",
    icon: <FileText className="h-4 w-4" />,
    read: true,
  },
  {
    id: "n5",
    title: "Recharge failed — refund initiated",
    body: "Airtel ₹199 prepaid recharge failed. Amount will be refunded within 24 hrs.",
    time: "5 hrs ago",
    to: "/recharge",
    tone: "danger",
    icon: <Smartphone className="h-4 w-4" />,
    read: true,
  },
  {
    id: "n6",
    title: "Video KYC verified",
    body: "Your Video KYC submission has been approved by the compliance team.",
    time: "Yesterday",
    to: "/video-kyc",
    tone: "success",
    icon: <ShieldCheck className="h-4 w-4" />,
    read: true,
  },
];

const TONE: Record<Notif["tone"], string> = {
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-sky-100 text-sky-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

function iconFor(type: string) {
  if (type === "approved") return <ShieldCheck className="h-4 w-4" />;
  if (type === "ready_for_approval") return <CheckCheck className="h-4 w-4" />;
  if (type === "rejected") return <AlertTriangle className="h-4 w-4" />;
  if (type === "new_registration") return <FileText className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}
function toneFor(type: string): Notif["tone"] {
  if (type === "approved") return "success";
  if (type === "rejected") return "danger";
  if (type === "ready_for_approval") return "info";
  return "info";
}
function relTime(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  async function load() {
    let data: any[] | null = null;
    try {
      await ensureStaffSession();
      const res = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      data = res.data as any[] | null;
    } catch { data = null; }
    setItems(
      (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        time: relTime(n.created_at),
        to: n.link ?? "/notifications",
        tone: toneFor(n.type),
        icon: iconFor(n.type),
        read: n.read,
      })),
    );
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markAll = async () => {
    setItems((xs) => xs.map((n) => ({ ...n, read: true })));
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) await supabase.from("notifications").update({ read: true }).eq("read", false);
  };
  const markOne = async (id: string) => {
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-bold">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "You're all caught up"}
              </p>
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] font-semibold text-saffron hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                No notifications yet
              </li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.to as never}
                  onClick={() => { markOne(n.id); setOpen(false); }}
                  className={`flex gap-3 px-4 py-3 hover:bg-muted/60 transition ${n.read ? "" : "bg-saffron/[0.04]"}`}
                >
                  <span className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${TONE[n.tone]}`}>
                    {n.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug truncate">{n.title}</p>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{n.time}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="px-4 py-2.5 border-t border-border bg-muted/30">
            <Link to="/notifications" onClick={() => setOpen(false)} className="block text-center text-xs font-semibold text-saffron hover:underline">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
