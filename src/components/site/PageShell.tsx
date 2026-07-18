import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Chatbot } from "@/components/site/Chatbot";
import { VisitorTracker } from "@/components/site/VisitorTracker";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; to?: string };

export function PageShell({
  eyebrow,
  title,
  subtitle,
  crumbs,
  children,
  accent = "saffron",
  centered = false,
  divider = false,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
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
          <div className={`container mx-auto px-4 sm:px-6 py-14 sm:py-20 relative ${centered ? "flex flex-col items-center text-center" : ""}`}>
            {crumbs && (
              <nav aria-label="Breadcrumb" className="mb-5">
                <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <li>
                    <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                  </li>
                  {crumbs.map((c, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3" />
                      {c.to ? (
                        <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
                      ) : (
                        <span className="text-foreground font-medium">{c.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {eyebrow && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/80 backdrop-blur border border-border text-[11px] font-semibold uppercase tracking-wider mb-4"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)]" />
                {eyebrow}
              </motion.div>
            )}
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
