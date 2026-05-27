import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  UserCheck,
  Store,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Clock,
  Users,
  Facebook,
  Youtube,
  Instagram,
  AtSign,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "JSKO / Retailer Registration — BharatOne" },
      {
        name: "description",
        content:
          "Choose your onboarding type and complete the required verification steps on BharatOne.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen overflow-hidden bg-tricolor">
      {/* Ambient decoration (static, low blur for perf) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-saffron-gradient opacity-15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-2xl"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-center px-4 sm:px-6">
          <Link
            to="/login"
            aria-label="Go back"
            className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo size="lg" />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center sm:text-left animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-saffron shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> JSKO Onboarding Portal
          </div>
          <h1 className="font-display mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            Welcome to{" "}
            <span className="bg-saffron-gradient bg-clip-text text-transparent">
              BharatOne
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground sm:mx-0 mx-auto">
            Choose your onboarding type below. Each path takes about{" "}
            <span className="font-semibold text-foreground">5–7 minutes</span> with secure
            KYC and video verification.
          </p>
        </div>

        <div className="mt-7 sm:mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <OnboardingCard
            delay={120}
            icon={<UserCheck className="h-6 w-6" />}
            title="Old JSKO Onboarding"
            description="Migrate your existing JSKO account from the legacy portal."
            badge="Migrate"
            badgeTone="emerald"
            accent="from-amber-400 to-orange-500"
            onClick={() => navigate({ to: "/register", search: { type: "old" } })}
          />
          <OnboardingCard
            delay={240}
            icon={<Store className="h-6 w-6" />}
            title="New Retailer Registration"
            description="For new retailers registering directly on the BharatOne portal."
            badge="Most popular"
            badgeTone="saffron"
            featured
            accent="from-orange-500 to-rose-500"
            onClick={() => navigate({ to: "/register", search: { type: "new" } })}
          />
          <OnboardingCard
            delay={360}
            icon={<Truck className="h-6 w-6" />}
            title="Distributor Onboarding"
            description="Register as an authorised BharatOne distributor with GST & territory."
            badge="New"
            badgeTone="blue"
            accent="from-emerald-500 to-teal-600"
            onClick={() => navigate({ to: "/register", search: { type: "distributor" } })}
          />
        </div>

        {/* Trust strip */}
        <div className="mt-8 sm:mt-12 grid gap-3 sm:grid-cols-3">
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Encrypted KYC"
            note="256-bit secure transit"
          />
          <TrustItem
            icon={<Clock className="h-4 w-4" />}
            title="Under 7 minutes"
            note="Average completion"
          />
          <TrustItem
            icon={<Users className="h-4 w-4" />}
            title="50,000+ partners"
            note="Onboarded across India"
          />
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
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
      </main>
    </div>
  );
}

function OnboardingCard({
  icon,
  title,
  description,
  badge,
  badgeTone = "emerald",
  accent = "from-orange-500 to-rose-500",
  featured = false,
  delay = 0,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeTone?: "emerald" | "saffron" | "blue";
  accent?: string;
  featured?: boolean;
  delay?: number;
  onClick?: () => void;
}) {
  const badgeCls =
    badgeTone === "saffron"
      ? "bg-saffron-gradient text-white"
      : badgeTone === "blue"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 sm:p-7 text-left shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elev animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 ${
        featured
          ? "border-saffron/40 ring-1 ring-saffron/20"
          : "border-border hover:border-saffron/40"
      }`}
    >
      <div
        aria-hidden
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-elev transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
        {badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}
          >
            {badge}
          </span>
        )}
      </div>
      <h2 className="font-display mt-6 text-lg sm:text-xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron transition-transform group-hover:translate-x-1">
        Continue <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.2 0C6.4 0 3.3 3.5 3.3 8.6c0 4.1 1.7 6.7 4.6 6.7.8 0 1.4-.3 1.8-.8.3-.4.5-.9.6-1.4.1-.4.1-.7.1-1.1v-.5h-.5c-.8 0-1.4-.2-1.9-.6-.4-.4-.6-.9-.6-1.6 0-.7.3-1.3.7-1.7.5-.4 1.1-.6 1.9-.6.8 0 1.4.2 1.9.6.4.4.6.9.6 1.6v4.3c0 2.4-.6 4.2-1.7 5.4-1.2 1.3-3 1.9-5.3 1.9-2.5 0-4.4-.8-5.7-2.4C1.1 17.9.5 15.7.5 13c0-3 .9-5.5 2.6-7.4C4.8 3.7 7.2 2.7 10 2.7c2.9 0 5.2.9 6.8 2.6 1.6 1.7 2.4 4 2.4 6.9 0 3.2-.7 5.6-2.1 7.3-1.3 1.6-3.3 2.4-5.8 2.4-1.5 0-2.7-.4-3.6-1.1-.9-.7-1.4-1.7-1.5-2.9l-.1-.9h2l.1.6c.1.7.4 1.2.9 1.6.5.4 1.2.6 2 .6 1.6 0 2.8-.5 3.6-1.4.9-1 1.3-2.5 1.3-4.6v-.8c-.4.5-.9.8-1.5 1-.6.2-1.3.3-2 .3-2 0-3.6-.7-4.7-2-1.1-1.3-1.7-3.1-1.7-5.3 0-2.3.6-4.1 1.8-5.4C9.1 1.6 10.5 1 12.2 1c1.2 0 2.3.3 3.2 1l.6.5V2.6c0-.4.1-.7.4-1 .3-.3.6-.4 1-.4s.7.1 1 .4c.3.3.4.6.4 1v11.3c0 2.7-.8 4.9-2.3 6.5-1.5 1.6-3.6 2.4-6.2 2.4-3 0-5.3-.9-6.9-2.6C1.8 18.5 1 16.2 1 13.1c0-3.4 1-6.2 3-8.2C5.9 3 8.5 2 11.5 2c3.2 0 5.8 1 7.6 3.1 1.8 2 2.7 4.7 2.7 8 0 3.5-.8 6.2-2.4 8.2-1.6 2-3.9 3-6.9 3-1.8 0-3.3-.5-4.4-1.4-1.1-1-1.7-2.3-1.8-4l-.1-1.2h2l.1.8c.1 1.1.5 1.9 1.2 2.5.7.5 1.7.8 2.9.8 2.1 0 3.7-.7 4.8-2 1.1-1.3 1.7-3.2 1.7-5.5V11c-.5.6-1.1 1-1.8 1.3-.7.3-1.5.4-2.3.4-2.2 0-3.9-.7-5-2.1-1.1-1.4-1.7-3.2-1.7-5.4 0-2.3.6-4 1.9-5.2C10.3 2.2 11.7 1.6 13.4 1.6c1.3 0 2.4.3 3.3.9l.5.4V3c0-.3.1-.5.3-.7.2-.2.4-.3.7-.3.3 0 .5.1.7.3.2.2.3.4.3.7v10.5c0 2.3-.7 4.1-2 5.5-1.3 1.3-3.1 2-5.3 2-2.6 0-4.6-.8-5.9-2.3-1.3-1.5-1.9-3.6-1.9-6.1 0-2.7.8-4.9 2.3-6.6 1.5-1.7 3.5-2.5 5.9-2.5 1.6 0 3 .4 4.1 1.2l.4.3V4.8c-.4-.4-.9-.7-1.5-.9-.6-.2-1.3-.3-2-.3-1.7 0-3.1.5-4.1 1.5-1 1-1.5 2.3-1.5 3.9 0 1.7.5 3 1.4 4 .9 1 2.2 1.5 3.8 1.5.9 0 1.7-.2 2.3-.5.6-.3 1.1-.8 1.4-1.4V9.2c-.3-.3-.7-.5-1.1-.6-.4-.1-.9-.2-1.4-.2-1.1 0-2 .3-2.6 1-.6.6-.9 1.5-.9 2.5 0 1 .3 1.8.9 2.4.6.6 1.4.9 2.4.9.6 0 1.1-.1 1.5-.4.4-.2.7-.6.9-1 .2-.4.2-.8.2-1.2v-.4h-.3c-.5 0-.9-.1-1.2-.4-.3-.3-.5-.7-.5-1.2 0-.5.2-.9.5-1.2.3-.3.7-.4 1.2-.4s.9.1 1.2.4c.3.3.5.7.5 1.2v4.5c0 1.8-.5 3.2-1.4 4.2-.9 1-2.2 1.5-3.9 1.5-2 0-3.5-.6-4.5-1.8-1-1.2-1.5-2.8-1.5-4.7 0-2 .5-3.6 1.6-4.8 1.1-1.2 2.5-1.8 4.3-1.8 1 0 1.9.2 2.6.6.7.4 1.3.9 1.7 1.6V8.5c-.3-.2-.6-.3-1-.4-.4-.1-.8-.1-1.2-.1-1.4 0-2.6.4-3.4 1.2-.8.8-1.2 1.9-1.2 3.2 0 1.3.4 2.3 1.1 3.1.7.7 1.7 1.1 2.9 1.1.7 0 1.3-.1 1.8-.4.5-.3.8-.7 1-1.2.2-.5.3-1 .3-1.5v-.2h-.2c-.4 0-.7-.1-.9-.3-.2-.2-.3-.5-.3-.9 0-.4.1-.7.3-.9.2-.2.5-.3.9-.3.4 0 .7.1.9.3.2.2.3.5.3.9v3.6c0 1.4-.4 2.5-1.1 3.3-.7.8-1.8 1.2-3.2 1.2-1.6 0-2.9-.5-3.8-1.5-.9-1-1.3-2.3-1.3-3.9 0-1.7.4-3 1.3-4 0 0 0 0 0 0" />
    </svg>
  );
}

function TrustItem({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-gradient text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.186 2.016c-2.445 0-4.287.794-5.473 2.358-.353.473-.612.99-.772 1.543-.156.54-.236 1.122-.236 1.732 0 .818.18 1.54.537 2.152.357.615.876 1.052 1.543 1.3.16.06.324.11.49.15.165.04.333.068.503.086.17.018.34.025.51.022.17-.003.339-.018.506-.045.167-.027.33-.066.488-.117.158-.05.31-.113.454-.187.146-.075.283-.162.41-.26.13-.098.25-.208.36-.33.11-.122.21-.256.297-.4.088-.144.163-.298.225-.462.062-.164.11-.337.143-.518.034-.18.053-.368.057-.562a3.39 3.39 0 00-.024-.574 3.372 3.372 0 00-.143-.55 3.218 3.218 0 00-.26-.498 2.94 2.94 0 00-.353-.44 2.668 2.668 0 00-.436-.363 2.405 2.405 0 00-.502-.275 2.266 2.266 0 00-.547-.163 2.17 2.17 0 00-.57-.015 2.227 2.227 0 00-.552.11 2.34 2.34 0 00-.515.225 2.498 2.498 0 00-.46.335 2.686 2.686 0 00-.39.434c-.105.15-.196.312-.27.484-.075.173-.133.355-.173.546-.04.19-.062.388-.065.593-.003.204.015.413.055.625.04.21.1.42.18.626.08.208.18.408.3.597.12.19.26.366.42.526.16.16.34.3.54.418.2.118.42.212.65.28.23.07.47.112.72.128.25.016.5.003.75-.038.25-.04.49-.11.72-.207.23-.098.45-.223.65-.372.2-.15.38-.325.54-.523.16-.198.3-.418.41-.657.11-.24.2-.497.26-.765.06-.27.09-.55.09-.84 0-.2-.02-.4-.06-.59-.04-.19-.1-.37-.18-.54-.08-.17-.17-.33-.28-.48-.12-.15-.25-.29-.4-.41-.15-.12-.31-.23-.49-.31-.18-.08-.37-.14-.57-.18-.2-.04-.4-.05-.6-.03-.2.02-.4.07-.58.15-.18.08-.35.19-.5.32-.15.13-.28.29-.39.46-.11.17-.2.36-.26.56-.06.2-.1.41-.1.62 0 .18.03.35.08.52.05.17.12.32.22.47.1.14.21.27.34.38.13.11.27.2.43.27.16.07.33.12.5.14.17.02.35.01.52-.04.17-.05.33-.13.48-.24.15-.1.28-.23.39-.38.11-.15.2-.32.26-.5.06-.18.09-.37.09-.57 0-.17-.02-.33-.07-.49-.05-.16-.12-.3-.21-.43-.09-.13-.2-.24-.33-.33-.13-.09-.27-.16-.43-.2-.16-.04-.32-.06-.49-.04-.17.01-.33.06-.48.13-.15.07-.29.17-.41.29-.12.12-.22.26-.3.42-.08.16-.14.33-.17.51-.03.18-.04.36-.02.55.02.18.07.36.15.52.08.17.18.31.3.44.12.13.26.23.42.3.16.08.33.12.5.14.18.01.36-.01.53-.07.17-.06.33-.15.47-.27.14-.12.26-.27.35-.44.09-.17.15-.35.18-.54.03-.19.03-.38 0-.57-.03-.19-.1-.37-.18-.53-.09-.17-.2-.31-.34-.43-.13-.12-.28-.21-.45-.27-.17-.06-.34-.1-.52-.1-.18 0-.35.04-.52.1-.16.07-.31.16-.44.28-.13.12-.23.26-.31.42-.08.16-.13.33-.15.51-.02.18-.02.36.02.54.04.18.1.34.2.5.1.15.21.28.35.4.14.11.29.2.46.26.16.06.34.1.51.1.18 0 .35-.03.51-.1.16-.06.31-.15.44-.26.13-.12.24-.26.32-.42.08-.16.14-.33.16-.51.03-.18.03-.36-.01-.54-.03-.18-.1-.34-.19-.5-.1-.15-.21-.28-.35-.39-.14-.11-.3-.2-.47-.26-.17-.05-.34-.08-.52-.08-.18 0-.35.03-.51.09-.16.06-.3.15-.43.27-.13.11-.23.25-.31.4-.08.16-.13.33-.16.5-.02.18-.02.35.02.53.03.17.1.33.18.48.09.15.2.28.33.39.13.11.28.2.45.25.16.06.33.08.5.08.17 0 .34-.03.5-.08.16-.06.3-.14.43-.25.12-.11.23-.24.31-.39.08-.15.14-.31.17-.48.03-.17.03-.34.01-.51-.03-.17-.08-.33-.16-.48-.08-.15-.18-.28-.3-.4-.13-.11-.27-.2-.43-.27-.16-.06-.33-.1-.5-.1-.17 0-.33.04-.49.1-.15.06-.29.15-.41.26-.12.11-.22.25-.3.4-.07.15-.12.31-.15.48-.02.16-.02.33 0 .5.02.16.07.32.14.47.07.15.16.28.27.4.11.11.24.2.39.27.15.06.3.1.46.12.16.01.32 0 .47-.05.15-.04.29-.11.42-.21.12-.09.23-.21.32-.34.09-.13.15-.28.2-.43.04-.15.06-.31.05-.47-.01-.16-.05-.31-.12-.46-.06-.14-.15-.27-.26-.38-.11-.11-.24-.2-.38-.26-.14-.07-.3-.11-.46-.12-.16-.01-.32.01-.47.06-.15.05-.28.13-.4.23-.12.1-.22.22-.3.36-.08.13-.14.28-.17.43-.04.15-.05.3-.04.46.01.15.05.3.12.44.07.14.16.26.27.37.11.1.24.18.38.24.14.06.29.09.45.1.15 0 .3-.02.44-.08.14-.06.27-.14.38-.25.11-.1.2-.22.27-.36.07-.13.12-.28.14-.43.03-.15.02-.3-.01-.45-.03-.14-.09-.28-.17-.41-.08-.12-.18-.23-.3-.32-.11-.09-.24-.16-.38-.2-.14-.05-.28-.07-.43-.07-.15 0-.29.03-.43.08-.13.05-.25.13-.36.23-.1.1-.19.22-.25.35-.07.13-.11.27-.13.42-.02.14-.01.29.03.43.03.13.09.26.17.38.08.11.17.21.28.3.11.08.23.15.36.19.13.04.27.06.4.05.14 0 .27-.03.4-.08.12-.06.24-.14.33-.24.1-.1.17-.21.23-.33.05-.12.09-.25.1-.39.01-.13 0-.26-.03-.39-.04-.12-.1-.24-.18-.34-.08-.1-.18-.19-.29-.27-.11-.07-.23-.13-.36-.16-.13-.03-.26-.04-.39-.03-.13.02-.26.06-.37.12-.12.06-.22.15-.31.25-.09.1-.16.22-.21.34-.05.12-.08.25-.09.38 0 .13.01.26.05.38.04.12.1.23.18.33.08.1.17.18.28.25.1.07.22.12.34.15.12.03.24.03.36.02.12-.02.24-.06.35-.12.1-.06.2-.14.28-.24.08-.09.14-.2.18-.32.04-.11.07-.23.07-.36 0-.12-.02-.24-.06-.35-.05-.11-.11-.21-.2-.3-.08-.09-.18-.16-.29-.22-.1-.06-.22-.1-.34-.12-.12-.02-.23-.02-.35 0-.11.03-.22.07-.32.14-.1.06-.18.15-.25.25-.07.1-.12.21-.15.33-.03.11-.04.23-.03.35.01.11.05.22.1.32.06.1.13.19.22.27.09.08.19.14.3.19.11.04.23.07.35.08.11 0 .23-.02.34-.07.1-.05.2-.11.28-.2.08-.08.14-.18.19-.29.04-.1.07-.22.08-.34 0-.11-.01-.22-.05-.33-.04-.1-.1-.2-.17-.28-.08-.08-.17-.15-.27-.2-.1-.05-.21-.08-.33-.1-.11-.01-.22 0-.33.04-.1.04-.2.1-.29.17-.08.08-.15.17-.2.27-.05.1-.09.21-.1.33-.01.11 0 .22.04.33.04.1.1.19.17.27.07.08.16.15.26.2.1.05.2.08.32.09.1.01.21 0 .31-.05.1-.04.19-.1.27-.18.07-.08.13-.17.17-.28.04-.1.06-.21.06-.32 0-.1-.02-.2-.06-.3-.04-.1-.1-.18-.17-.26-.07-.07-.16-.13-.25-.17-.1-.04-.2-.06-.31-.07-.1 0-.2.01-.3.05-.1.04-.18.1-.26.17-.07.07-.13.16-.17.26-.04.09-.06.2-.06.3 0 .1.02.2.06.29.04.09.1.17.17.24.07.07.15.12.24.16.09.04.18.06.28.07.09 0 .18-.01.27-.05.08-.04.16-.09.23-.16.06-.07.12-.15.15-.24.04-.09.05-.18.05-.28 0-.09-.02-.18-.06-.27-.04-.08-.09-.15-.16-.22-.07-.06-.15-.11-.24-.14-.08-.03-.17-.04-.26-.04-.08 0-.17.02-.25.06-.08.04-.15.09-.21.16-.06.07-.11.15-.14.24-.03.08-.04.17-.04.26 0 .09.02.17.06.25.04.08.09.15.16.21.06.06.14.11.22.14.08.03.17.04.26.04.08 0 .16-.02.24-.06.07-.04.14-.1.2-.16.06-.07.1-.14.13-.23.03-.08.04-.16.04-.25 0-.08-.02-.16-.05-.23-.04-.07-.09-.14-.15-.2-.06-.06-.13-.1-.21-.13-.07-.03-.15-.04-.23-.04-.08 0-.15.02-.22.05-.07.04-.13.09-.18.15-.05.06-.09.13-.11.21-.03.07-.03.15-.03.23 0 .07.02.15.05.22.04.07.09.13.15.18.06.05.13.09.21.11.07.02.15.03.22.03.07 0 .14-.02.21-.05.06-.04.12-.08.17-.14.05-.06.08-.12.1-.2.02-.07.03-.14.03-.21 0-.07-.02-.14-.05-.2-.03-.06-.08-.12-.13-.17-.06-.04-.12-.08-.19-.1-.06-.02-.13-.03-.2-.02-.06 0-.13.02-.19.05-.06.04-.11.08-.15.14-.04.06-.07.12-.09.19-.01.06-.02.13-.01.2 0 .06.02.12.05.18.03.06.08.11.13.15.05.04.11.07.18.09.06.01.12.02.18.01.06 0 .12-.02.17-.05.05-.04.1-.08.13-.13.04-.05.06-.11.07-.17.01-.06.01-.12 0-.18-.02-.05-.04-.1-.08-.15-.04-.04-.09-.08-.14-.1-.05-.03-.11-.04-.17-.04-.05 0-.1.02-.15.05-.05.03-.09.07-.12.12-.03.05-.05.1-.06.16-.01.05 0 .1.02.15.02.05.05.09.1.13.04.03.09.06.14.07.05.01.1.02.14 0 .05 0 .09-.02.13-.05.04-.03.07-.07.09-.12.02-.04.03-.09.03-.14 0-.04-.01-.09-.04-.13-.03-.04-.06-.07-.1-.1-.04-.02-.09-.04-.13-.04-.04 0-.08.02-.12.04-.04.03-.07.06-.09.1-.02.04-.03.09-.03.13 0 .04.01.08.03.12.02.03.05.06.08.09.03.02.07.04.11.04.04 0 .07-.01.1-.04.03-.02.05-.06.07-.1.01-.03.02-.07.02-.1 0-.03-.01-.06-.03-.09-.02-.03-.04-.05-.07-.07-.03-.02-.06-.03-.1-.03-.03 0-.06.01-.09.03-.03.02-.05.05-.06.08-.01.03-.02.06-.02.09 0 .03.01.06.03.08.02.02.04.04.07.06.02.01.05.02.08.02.02 0 .05-.01.07-.03.02-.02.03-.04.04-.07.01-.02.01-.05 0-.07 0-.02-.01-.04-.03-.06-.02-.02-.04-.03-.06-.04-.02 0-.04 0-.06.02-.02.01-.03.03-.04.05 0 .02-.01.04 0 .06 0 .02.01.04.03.05.01.01.03.02.05.02.01 0 .03 0 .04-.02.01-.01.02-.03.02-.05 0-.01 0-.03-.01-.04-.01-.01-.02-.02-.04-.03-.01 0-.03 0-.04.01-.01.01-.02.02-.02.04 0 .01 0 .02.01.03.01.01.02.01.03.01.01 0 .02 0 .03-.01.01-.01.01-.02.01-.03 0-.01 0-.02-.01-.02 0 0-.01-.01-.02-.01-.01 0-.01 0-.02.01 0 0-.01.01-.01.02 0 0 0 .01.01.01 0 0 .01 0 .01 0 0 0 .01 0 .01-.01 0 0 0-.01 0-.01 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0z" />
    </svg>
  );
}
