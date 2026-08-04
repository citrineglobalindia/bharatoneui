import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Chatbot } from "@/components/site/Chatbot";
import { VisitorTracker } from "@/components/site/VisitorTracker";

export function PageShell({
  title,
  subtitle,
  children,
  accent = "saffron",
  centered = false,
  divider = false,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  accent?: "saffron" | "green" | "ashoka";
  /** Centre the banner content (CR-140 About, CR-145 Services). */
  centered?: boolean;
  /** Show the tricolour divider rule under the heading. */
  divider?: boolean;
  /** Optional call-to-action rendered under the subtitle. */
  actions?: ReactNode;
}) {
  const accentMap = {
    saffron: "from-[var(--saffron)]/20 via-transparent to-transparent",
    green: "from-[var(--india-green)]/20 via-transparent to-transparent",
    ashoka: "from-[var(--ashoka)]/20 via-transparent to-transparent",
  } as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[64px] md:pt-[112px]">
        {/* Page header */}
        <section className={`relative overflow-hidden border-b border-border/60 bg-gradient-to-br ${accentMap[accent]}`}>
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className={`container mx-auto px-4 sm:px-6 py-10 sm:py-14 relative ${centered ? "flex flex-col items-center text-center" : ""}`}>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] max-w-3xl"
            >
              {title}
            </motion.h1>
            {divider && (
              <div
                aria-hidden
                className={`mt-5 flex items-center gap-2 ${centered ? "justify-center" : ""}`}
              >
                <span className="h-1 w-14 rounded-full bg-saffron" />
                <span className="h-1.5 w-1.5 rounded-full bg-ashoka" />
                <span className="h-1 w-14 rounded-full bg-india-green" />
              </div>
            )}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed"
              >
                {subtitle}
              </motion.p>
            )}
            {actions && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}
              >
                {actions}
              </motion.div>
            )}
          </div>
        </section>

        {children}
      </main>
      <Footer />
      <Chatbot />
      <VisitorTracker />
    </div>
  );
}
