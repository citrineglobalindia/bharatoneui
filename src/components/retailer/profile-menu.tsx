import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  User,
  Settings as SettingsIcon,
  Wallet as WalletIcon,
  ClipboardList,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  FileCheck2,
} from "lucide-react";

const ITEMS: { label: string; to: string; icon: React.ReactNode; hint?: string }[] = [
  { label: "My Profile", to: "/settings", icon: <User className="h-4 w-4" />, hint: "Personal details" },
  { label: "KYC Docs", to: "/video-kyc", icon: <FileCheck2 className="h-4 w-4" />, hint: "Identity & verification" },
  { label: "Wallet", to: "/wallet", icon: <WalletIcon className="h-4 w-4" />, hint: "Balance & top-up" },
  { label: "My Applications", to: "/applications", icon: <ClipboardList className="h-4 w-4" />, hint: "Service requests" },
  { label: "Security", to: "/settings", icon: <ShieldCheck className="h-4 w-4" />, hint: "Password & 2FA" },
  { label: "Settings", to: "/settings", icon: <SettingsIcon className="h-4 w-4" /> },
  { label: "Support", to: "/support", icon: <LifeBuoy className="h-4 w-4" /> },
];

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const me = useCurrentUser();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full hover:bg-muted pl-1 pr-2 py-1"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="h-7 w-7 rounded-full bg-india-green text-white text-xs font-bold flex items-center justify-center">{me.initials}</div>
        <span className="hidden sm:inline text-sm font-semibold">{me.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-india-green text-white font-bold flex items-center justify-center">{me.initials}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{me.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{me.email}</p>
              {me.phone && <p className="text-[11px] text-muted-foreground truncate">{/^\d{10}$/.test(me.phone) ? `+91 ${me.phone}` : me.phone}</p>}
              {me.jskoId && <span className="inline-block mt-0.5 text-[10px] font-semibold bg-india-green text-white px-1.5 py-0.5 rounded">JSKO ID: {me.jskoId}</span>}
            </div>
          </div>

          <ul className="py-1">
            {ITEMS.map((it) => (
              <li key={it.label}>
                <Link
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition"
                >
                  <span className="h-7 w-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center">{it.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">{it.label}</span>
                    {it.hint && <span className="block text-[11px] text-muted-foreground">{it.hint}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate({ to: "/login" });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}