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
  Facebook,
  Youtube,
  Instagram,
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
                <BharatOneLogo size="lg" />
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
              <BharatOneLogo size="lg" />
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-card px-6 py-3 text-[11px] text-muted-foreground border-t border-border">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Link to="/terms-and-conditions" className="hover:text-foreground">Terms & Condition</Link>
            <span className="text-border">|</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <div className="flex items-center gap-3 justify-center text-muted-foreground">
            <a href="https://www.instagram.com/bharatone__official?igsh=MXgxeXdyZXZzenQ2ZQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-foreground transition-colors"><Instagram className="h-4 w-4" /></a>
            <a href="https://www.facebook.com/share/14ehHxTsSc7/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-foreground transition-colors"><Facebook className="h-4 w-4" /></a>
            <a href="https://youtube.com/@bharatone-n3m5m?si=nm29R-B94J0EpnJb" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-foreground transition-colors"><Youtube className="h-4 w-4" /></a>
            <a href="https://www.threads.com/@bharatone__official" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="hover:text-foreground transition-colors"><ThreadsIcon className="h-4 w-4" /></a>
          </div>
          <div className="text-center sm:text-right">
            Copyright © 2026 <span className="text-india-green font-semibold">BharatOne Services & Affiliates Pvt. Ltd.</span> All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.2 0C6.4 0 3.3 3.5 3.3 8.6c0 4.1 1.7 6.7 4.6 6.7.8 0 1.4-.3 1.8-.8.3-.4.5-.9.6-1.4.1-.4.1-.7.1-1.1v-.5h-.5c-.8 0-1.4-.2-1.9-.6-.4-.4-.6-.9-.6-1.6 0-.7.3-1.3.7-1.7.5-.4 1.1-.6 1.9-.6.8 0 1.4.2 1.9.6.4.4.6.9.6 1.6v4.3c0 2.4-.6 4.2-1.7 5.4-1.2 1.3-3 1.9-5.3 1.9-2.5 0-4.4-.8-5.7-2.4C1.1 17.9.5 15.7.5 13c0-3 .9-5.5 2.6-7.4C4.8 3.7 7.2 2.7 10 2.7c2.9 0 5.2.9 6.8 2.6 1.6 1.7 2.4 4 2.4 6.9 0 3.2-.7 5.6-2.1 7.3-1.3 1.6-3.3 2.4-5.8 2.4-1.5 0-2.7-.4-3.6-1.1-.9-.7-1.4-1.7-1.5-2.9l-.1-.9h2l.1.6c.1.7.4 1.2.9 1.6.5.4 1.2.6 2 .6 1.6 0 2.8-.5 3.6-1.4.9-1 1.3-2.5 1.3-4.6v-.8c-.4.5-.9.8-1.5 1-.6.2-1.3.3-2 .3-2 0-3.6-.7-4.7-2-1.1-1.3-1.7-3.1-1.7-5.3 0-2.3.6-4.1 1.8-5.4C9.1 1.6 10.5 1 12.2 1c1.2 0 2.3.3 3.2 1l.6.5V2.6c0-.4.1-.7.4-1 .3-.3.6-.4 1-.4s.7.1 1 .4c.3.3.4.6.4 1v11.3c0 2.7-.8 4.9-2.3 6.5-1.5 1.6-3.6 2.4-6.2 2.4-3 0-5.3-.9-6.9-2.6C1.8 18.5 1 16.2 1 13.1c0-3.4 1-6.2 3-8.2C5.9 3 8.5 2 11.5 2c3.2 0 5.8 1 7.6 3.1 1.8 2 2.7 4.7 2.7 8 0 3.5-.8 6.2-2.4 8.2-1.6 2-3.9 3-6.9 3-1.8 0-3.3-.5-4.4-1.4-1.1-1-1.7-2.3-1.8-4l-.1-1.2h2l.1.8c.1 1.1.5 1.9 1.2 2.5.7.5 1.7.8 2.9.8 2.1 0 3.7-.7 4.8-2 1.1-1.3 1.7-3.2 1.7-5.5V11c-.5.6-1.1 1-1.8 1.3-.7.3-1.5.4-2.3.4-2.2 0-3.9-.7-5-2.1-1.1-1.4-1.7-3.2-1.7-5.4 0-2.3.6-4 1.9-5.2C10.3 2.2 11.7 1.6 13.4 1.6c1.3 0 2.4.3 3.3.9l.5.4V3c0-.3.1-.5.3-.7.2-.2.4-.3.7-.3.3 0 .5.1.7.3.2.2.3.4.3.7v10.5c0 2.3-.7 4.1-2 5.5-1.3 1.3-3.1 2-5.3 2-2.6 0-4.6-.8-5.9-2.3-1.3-1.5-1.9-3.6-1.9-6.1 0-2.7.8-4.9 2.3-6.6 1.5-1.7 3.5-2.5 5.9-2.5 1.6 0 3 .4 4.1 1.2l.4.3V4.8c-.4-.4-.9-.7-1.5-.9-.6-.2-1.3-.3-2-.3-1.7 0-3.1.5-4.1 1.5-1 1-1.5 2.3-1.5 3.9 0 1.7.5 3 1.4 4 .9 1 2.2 1.5 3.8 1.5.9 0 1.7-.2 2.3-.5.6-.3 1.1-.8 1.4-1.4V9.2c-.3-.3-.7-.5-1.1-.6-.4-.1-.9-.2-1.4-.2-1.1 0-2 .3-2.6 1-.6.6-.9 1.5-.9 2.5 0 1 .3 1.8.9 2.4.6.6 1.4.9 2.4.9.6 0 1.1-.1 1.5-.4.4-.2.7-.6.9-1 .2-.4.2-.8.2-1.2v-.4h-.3c-.5 0-.9-.1-1.2-.4-.3-.3-.5-.7-.5-1.2 0-.5.2-.9.5-1.2.3-.3.7-.4 1.2-.4s.9.1 1.2.4c.3.3.5.7.5 1.2v4.5c0 1.8-.5 3.2-1.4 4.2-.9 1-2.2 1.5-3.9 1.5-2 0-3.5-.6-4.5-1.8-1-1.2-1.5-2.8-1.5-4.7 0-2 .5-3.6 1.6-4.8 1.1-1.2 2.5-1.8 4.3-1.8 1 0 1.9.2 2.6.6.7.4 1.3.9 1.7 1.6V8.5c-.3-.2-.6-.3-1-.4-.4-.1-.8-.1-1.2-.1-1.4 0-2.6.4-3.4 1.2-.8.8-1.2 1.9-1.2 3.2 0 1.3.4 2.3 1.1 3.1.7.7 1.7 1.1 2.9 1.1.7 0 1.3-.1 1.8-.4.5-.3.8-.7 1-1.2.2-.5.3-1 .3-1.5v-.2h-.2c-.4 0-.7-.1-.9-.3-.2-.2-.3-.5-.3-.9 0-.4.1-.7.3-.9.2-.2.5-.3.9-.3.4 0 .7.1.9.3.2.2.3.5.3.9v3.6c0 1.4-.4 2.5-1.1 3.3-.7.8-1.8 1.2-3.2 1.2-1.6 0-2.9-.5-3.8-1.5-.9-1-1.3-2.3-1.3-3.9 0-1.7.4-3 1.3-4 0 0 0 0 0 0" />
    </svg>
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