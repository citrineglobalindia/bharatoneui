import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  ClipboardCheck,
  Calculator,
  Crown,
  Truck,
  Building2,
  Map,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type PortalRole =
  | "qc"
  | "accountant"
  | "admin"
  | "distributor"
  | "master-distributor"
  | "hr"
  | "dro"
  | "tro";

export interface PortalConfig {
  role: PortalRole;
  portalName: string;
  shortName: string;
  tagline: string;
  accent: "saffron" | "green" | "indigo" | "rose" | "amber" | "sky" | "violet";
  icon: LucideIcon;
  demo: {
    username: string;
    password: string;
    displayName: string;
  };
  redirectTo?: string;
}

const ACCENT_MAP: Record<
  PortalConfig["accent"],
  { ring: string; bg: string; text: string; btn: string; chip: string; soft: string }
> = {
  saffron: {
    ring: "ring-saffron/30",
    bg: "bg-saffron",
    text: "text-saffron",
    btn: "bg-saffron hover:bg-saffron/90 text-white",
    chip: "bg-saffron/10 text-saffron border-saffron/30",
    soft: "from-orange-50 via-white to-amber-50",
  },
  green: {
    ring: "ring-india-green/30",
    bg: "bg-india-green",
    text: "text-india-green",
    btn: "bg-india-green hover:bg-india-green/90 text-white",
    chip: "bg-india-green/10 text-india-green border-india-green/30",
    soft: "from-emerald-50 via-white to-teal-50",
  },
  indigo: {
    ring: "ring-indigo-500/30",
    bg: "bg-indigo-600",
    text: "text-indigo-600",
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    soft: "from-indigo-50 via-white to-blue-50",
  },
  rose: {
    ring: "ring-rose-500/30",
    bg: "bg-rose-600",
    text: "text-rose-600",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    soft: "from-rose-50 via-white to-pink-50",
  },
  amber: {
    ring: "ring-amber-500/30",
    bg: "bg-amber-600",
    text: "text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    soft: "from-amber-50 via-white to-yellow-50",
  },
  sky: {
    ring: "ring-sky-500/30",
    bg: "bg-sky-600",
    text: "text-sky-600",
    btn: "bg-sky-600 hover:bg-sky-700 text-white",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    soft: "from-sky-50 via-white to-cyan-50",
  },
  violet: {
    ring: "ring-violet-500/30",
    bg: "bg-violet-600",
    text: "text-violet-600",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    soft: "from-violet-50 via-white to-purple-50",
  },
};

function genCaptcha() {
  const chars = "0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function PortalLogin({ config }: { config: PortalConfig }) {
  const Icon = config.icon;
  const a = ACCENT_MAP[config.accent];
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState("------");
  const [captchaInput, setCaptchaInput] = useState("");

  useEffect(() => {
    setCaptcha(genCaptcha());
  }, []);

  return (
    <div className="relative min-h-screen bg-tricolor flex items-center justify-center p-3 sm:p-4 overflow-x-hidden">
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full ${a.bg} opacity-10 blur-3xl`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-india-green/15 blur-3xl"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-elev overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* Header */}
        <div className={`relative p-6 bg-gradient-to-br ${a.soft} text-center`}>
          <Link
            to="/login"
            className="absolute left-4 top-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retailer Portal
          </Link>

          <div className="flex justify-center">
            <BharatOneLogo size="md" />
          </div>

          <div className="mt-4 flex justify-center">
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-elev ring-4 ${a.ring}`}
            >
              <Icon className={`h-9 w-9 ${a.text}`} />
            </div>
          </div>

          <span
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${a.chip}`}
          >
            <ShieldCheck className="h-3 w-3" /> {config.shortName} Portal
          </span>

          <h1 className="font-display mt-2 text-xl sm:text-2xl font-extrabold text-foreground">
            {config.portalName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{config.tagline}</p>
        </div>

        {/* Form */}
        <div className="p-6">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const id = identifier.trim().toLowerCase();
              if (captchaInput.trim() !== captcha) {
                toast.error("Captcha does not match");
                return;
              }
              if (config.role === "hr") {
                const { error } = await supabase.auth.signInWithPassword({ email: id, password });
                if (error) {
                  toast.error("Unable to sign in", { description: "Check your work email and password." });
                  return;
                }
                toast.success("Secure HR access verified");
                navigate({ to: config.redirectTo ?? "/hr/dashboard" });
                return;
              }
              if (
                id !== config.demo.username.toLowerCase() ||
                password !== config.demo.password
              ) {
                toast.error("Invalid credentials", {
                  description: "Check your username and password.",
                });
                return;
              }
              try {
                localStorage.setItem(
                  "bharatone:auth",
                  JSON.stringify({
                    name: config.demo.displayName,
                    username: config.demo.username,
                    role: config.role,
                    portal: config.portalName,
                    loggedInAt: new Date().toISOString(),
                  }),
                );
              } catch {}
              toast.success(`Welcome, ${config.demo.displayName}`, {
                description: `Signed in to ${config.portalName}.`,
              });
              navigate({ to: config.redirectTo ?? "/dashboard" });
            }}
          >
            <div>
              <label className="text-sm font-semibold text-foreground">Username</label>
              <div className="mt-1 relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${a.text}`} />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                   placeholder={config.role === "hr" ? "Enter your work email" : "Enter your username"}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">Password</label>
              <div className="mt-1 relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${a.text}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 h-10">
                <span className="font-display select-none text-lg font-extrabold tracking-[0.25em] text-purple-700 italic">
                  {captcha}
                </span>
                <button
                  type="button"
                  aria-label="Refresh captcha"
                  onClick={() => setCaptcha(genCaptcha())}
                  className={`${a.text} hover:opacity-80 transition-opacity`}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <input
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                placeholder="Captcha"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toast.info("Contact your administrator to reset your password.")}
                className={`text-xs font-semibold ${a.text} hover:underline`}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className={`h-10 w-full rounded-lg text-sm font-semibold shadow-elev transition-all hover:scale-[1.01] active:scale-[0.99] ${a.btn}`}
            >
              Sign in to {config.shortName} Portal
            </Button>
          </form>
        </div>

        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />
      </div>
    </div>
  );
}

export const PORTAL_CONFIGS: Record<PortalRole, PortalConfig> = {
  qc: {
    role: "qc",
    portalName: "Quality Control Portal",
    shortName: "QC",
    tagline: "Review KYC, applications and on-boarding submissions.",
    accent: "indigo",
    icon: ClipboardCheck,
    demo: { username: "9845224260", password: "Password@66", displayName: "QC Reviewer" },
    redirectTo: "/qc/dashboard",
  },
  accountant: {
    role: "accountant",
    portalName: "Accountant Portal",
    shortName: "Accounts",
    tagline: "Settlements, ledgers, payouts and reconciliation.",
    accent: "green",
    icon: Calculator,
    demo: { username: "8879789067", password: "Password@66", displayName: "Mahesh" },
    redirectTo: "/accountant/dashboard",
  },
  admin: {
    role: "admin",
    portalName: "Administrator Portal",
    shortName: "Admin",
    tagline: "Master control for BharatOne network operations.",
    accent: "saffron",
    icon: Crown,
    demo: { username: "super.admin", password: "Admin@2026", displayName: "Super Admin" },
  },
  distributor: {
    role: "distributor",
    portalName: "Distributor Portal",
    shortName: "Distributor",
    tagline: "Manage your retailer network, stock and commissions.",
    accent: "sky",
    icon: Truck,
    demo: { username: "7259809887", password: "Password@66", displayName: "Karthik M" },
    redirectTo: "/distributor/dashboard",
  },
  "master-distributor": {
    role: "master-distributor",
    portalName: "Master Distributor Portal",
    shortName: "Master Distributor",
    tagline: "Oversee distributors and regional performance.",
    accent: "violet",
    icon: Building2,
    demo: {
      username: "master.distributor",
      password: "Master@2026",
      displayName: "Master Distributor",
    },
  },
  hr: {
    role: "hr",
    portalName: "Human Resources Portal",
    shortName: "HR",
    tagline: "People operations, attendance, payroll and talent management.",
    accent: "sky",
    icon: Users,
    demo: { username: "hr.manager", password: "HR@2026", displayName: "Ananya Rao" },
    redirectTo: "/hr/dashboard",
  },
  dro: {
    role: "dro",
    portalName: "District Regional Officer Portal",
    shortName: "DRO",
    tagline: "District-level oversight, approvals and audits.",
    accent: "rose",
    icon: Map,
    demo: { username: "8974532567", password: "Password@66", displayName: "Kavya" },
    redirectTo: "/dro/dashboard",
  },
  tro: {
    role: "tro",
    portalName: "Taluk Regional Officer Portal",
    shortName: "TRO",
    tagline: "Taluk-level field operations and onboarding.",
    accent: "amber",
    icon: MapPin,
    demo: { username: "8974532566", password: "Password@66", displayName: "Navya" },
    redirectTo: "/tro/dashboard",
  },
};