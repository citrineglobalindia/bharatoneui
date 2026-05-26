import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, Lock, Eye, EyeOff, ShieldCheck, UserPlus, ArrowRight, Sparkles } from "lucide-react";
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
  return (
    <div className="relative min-h-screen bg-tricolor flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden">
      {/* Ambient glow (static — animating blurred layers tanks performance) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-saffron-gradient opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl"
      />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-elev grid md:grid-cols-2 animate-in fade-in zoom-in-95 duration-500">
        {/* Left */}
        <div className="relative p-5 sm:p-10 md:p-14 bg-tricolor animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center justify-between gap-3 md:block">
            <BharatOneLogo size="md" />
          </div>
          <h1 className="font-display mt-4 md:mt-6 text-[26px] sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Empowering India&rsquo;s{" "}
            <span className="bg-saffron-gradient bg-clip-text text-transparent">Digital Retailers</span>
          </h1>
          <p className="mt-2.5 md:mt-4 max-w-md text-[13px] sm:text-base leading-relaxed text-muted-foreground">
            AEPS, DMT, Recharge, BBPS &amp; Business Services — unified in one professional dashboard built for Karnataka.
          </p>
          <div className="mt-4 md:mt-8 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
            {[
              { v: "10K+", l: "Retailers" },
              { v: "50+", l: "Services" },
              { v: "99.9%", l: "Uptime" },
            ].map((s, i) => (
              <div
                key={s.l}
                style={{ animationDelay: `${300 + i * 120}ms` }}
                className="rounded-xl border border-border bg-card/80 backdrop-blur px-2 py-2.5 sm:px-3 sm:py-3 text-center shadow-soft animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 transition-transform hover:-translate-y-0.5 hover:shadow-elev"
              >
                <div className="font-display text-base sm:text-xl font-extrabold text-foreground">{s.v}</div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 md:absolute md:bottom-6 md:left-10 md:mt-0 text-[11px] sm:text-xs text-muted-foreground">
            © 2026 BharatOne Digital Services · Hasan, Karnataka
          </div>
        </div>

        {/* Right */}
        <div className="p-5 sm:p-10 md:p-14 border-t border-border md:border-t-0 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-white/80 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-saffron shadow-soft">
            <Sparkles className="h-3 w-3" /> Secure Login
          </div>
          <h2 className="font-display mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your BharatOne account</p>

          <form className="mt-7 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-xs font-semibold tracking-[0.14em] text-foreground">USERNAME</label>
              <div className="mt-2 relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary"
                  placeholder="JSKO101 or BO10001"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-[0.14em] text-foreground">PASSWORD</label>
              <div className="mt-2 relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary"
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
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-saffron" />
                Remember me
              </label>
              <a href="#" className="font-semibold text-saffron hover:underline">Forgot Password?</a>
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-saffron-gradient text-base font-semibold shadow-elev hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-transform"
            >
              <ShieldCheck className="h-4 w-4" /> Sign In Securely
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-border" />
            <span className="mx-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New to BharatOne?</span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Register CTA */}
          <Link
            to="/"
            className="group flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-saffron/40 bg-saffron/5 px-4 py-3.5 transition-all hover:border-saffron hover:bg-saffron/10 hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-gradient text-white shadow-elev transition-transform group-hover:scale-110 group-hover:rotate-3">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Create new account</p>
                <p className="text-[11px] text-muted-foreground">Retailer · Distributor · JSKO migration</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-saffron transition-transform group-hover:translate-x-1" />
          </Link>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Awaiting approval?{" "}
            <a href="#" className="font-semibold text-saffron hover:underline">Track application →</a>
          </p>
        </div>
      </div>
    </div>
  );
}