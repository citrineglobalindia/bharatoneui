import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowRight,
  Landmark,
  Users,
  Plane,
  ShieldCheck,
  Fingerprint,
  LayoutGrid,
  RefreshCw,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Instagram,
  MessageCircle,
  Search,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BharatOne Retailer Portal" },
      {
        name: "description",
        content:
          "Sign in to your BharatOne account. AEPS, DMT, Recharge, BBPS and Business Services in one professional dashboard.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState("------");
  useEffect(() => {
    setCaptcha(genCaptcha());
  }, []);
  return (
    <div className="relative min-h-screen lg:h-screen bg-tricolor flex items-center justify-center p-2 sm:p-3 lg:p-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-saffron-gradient opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl"
      />

      <div className="relative w-full max-w-6xl lg:max-h-full flex flex-col rounded-2xl border border-border bg-card shadow-elev overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="grid md:grid-cols-2 min-h-0">
          {/* Left — Welcome */}
          <div className="relative p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-orange-50 via-white to-emerald-50 text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Welcome To
              <br />
              <span className="text-saffron">BharatOne</span>{" "}
              <span className="text-india-green">Connect</span>
            </h1>

            <div className="mt-4 flex justify-center">
              <div className="relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-full bg-white shadow-elev ring-4 ring-saffron/30">
                <div className="absolute inset-2 rounded-full ring-2 ring-india-green/40" />
                <BharatOneLogo size="md" />
              </div>
            </div>

            <h2 className="font-display mt-4 text-lg sm:text-xl font-bold text-foreground">
              Gateway to <span className="text-saffron">BharatOne</span>{" "}
              <span className="text-india-green">Network!</span>
            </h2>
            <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-muted-foreground leading-relaxed">
              BharatOne Connect is a secure authentication platform for accessing e-Governance,
              banking, financial, travel, insurance, Aadhaar, and citizen services across India.
            </p>

            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
              <ServiceTile icon={<Landmark className="h-5 w-5" />} label="Banking" tone="saffron" />
              <ServiceTile icon={<Users className="h-5 w-5" />} label="G2C Services" tone="green" />
              <ServiceTile icon={<Plane className="h-5 w-5" />} label="Travel" tone="saffron" />
              <ServiceTile icon={<ShieldCheck className="h-5 w-5" />} label="Insurance" tone="green" />
              <ServiceTile icon={<Fingerprint className="h-5 w-5" />} label="Aadhaar" tone="saffron" />
              <ServiceTile icon={<LayoutGrid className="h-5 w-5" />} label="& More Services" tone="green" />
            </div>
          </div>

          {/* Right — Login */}
          <div className="p-5 sm:p-6 lg:p-7 border-t border-border md:border-t-0 md:border-l">
            <div className="flex justify-center md:justify-start">
              <BharatOneLogo size="md" />
            </div>
            <h2 className="font-display mt-3 text-xl sm:text-2xl font-extrabold text-foreground">
              Log in to your account
            </h2>

            <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-sm font-semibold text-foreground">Username or Email</label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                    placeholder="Username or Email"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Password</label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-india-green" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                    placeholder="Password"
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

              {/* Captcha */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 h-11">
                  <span className="font-display select-none text-lg font-extrabold tracking-[0.25em] text-purple-700 italic">
                    {captcha}
                  </span>
                  <button
                    type="button"
                    aria-label="Refresh captcha"
                    onClick={() => setCaptcha(genCaptcha())}
                    className="text-india-green hover:text-saffron transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <input
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-india-green/15 focus-visible:border-india-green"
                  placeholder="Enter Captcha Text"
                />
              </div>

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs font-semibold text-india-green hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-india-green text-base font-semibold text-white shadow-elev hover:bg-india-green/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Log In
              </Button>
            </form>

            <div className="relative my-3 flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                New to BharatOne?
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            <Link
              to="/get-started"
              className="group flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-saffron/40 bg-saffron/5 px-4 py-2 transition-all hover:border-saffron hover:bg-saffron/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-gradient text-white shadow-elev">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Create new JSKO account</p>
                  <p className="text-[11px] text-muted-foreground">Retailer · Distributor · JSKO</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-saffron transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/track-application"
              className="group flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-india-green/40 bg-india-green/5 px-4 py-2 transition-all hover:border-india-green hover:bg-india-green/10 mt-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-india-green text-white shadow-elev">
                  <Search className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Track your application</p>
                  <p className="text-[11px] text-muted-foreground">Check registration status</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-india-green transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Tricolor strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-india-green" />

        {/* Footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-card px-6 py-2 text-[11px] text-muted-foreground border-t border-border">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Link to="/terms-and-conditions" className="hover:text-foreground">Terms & Condition</Link>
            <span className="text-border">|</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <div className="flex items-center gap-3 justify-center text-muted-foreground">
            <a href="#" aria-label="Twitter" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Facebook" className="hover:text-foreground"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
            <a href="#" aria-label="YouTube" className="hover:text-foreground"><Youtube className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-foreground"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="WhatsApp" className="hover:text-foreground"><MessageCircle className="h-4 w-4" /></a>
          </div>
          <div className="text-center sm:text-right">
            Copyright © 2026 <span className="text-india-green font-semibold">BharatOne Services & Affiliates Pvt. Ltd.</span> All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceTile({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "saffron" | "green";
}) {
  const color = tone === "saffron" ? "text-saffron" : "text-india-green";
  return (
    <div className="flex flex-col items-center justify-start gap-1.5 rounded-xl border border-border bg-white px-2 py-2.5 shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-elev">
      <div className={`flex h-8 w-8 items-center justify-center ${color}`}>{icon}</div>
      <span className="text-[10px] sm:text-[11px] font-semibold text-foreground leading-tight text-center">
        {label}
      </span>
    </div>
  );
}

function genCaptcha() {
  const chars = "0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}