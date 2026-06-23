import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  ShieldCheck,
  UserCheck,
  Ban,
  CreditCard,
  Copyright,
  Link as LinkIcon,
  AlertTriangle,
  ShieldAlert,
  PowerOff,
  RefreshCw,
  Scale,
  Mail,
  ArrowUp,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — BharatOne" },
      {
        name: "description",
        content:
          "Terms and Conditions for using BharatOne Services and Affiliates Pvt. Ltd. — consultancy and citizen-services support across India.",
      },
      { property: "og:title", content: "BharatOne Terms & Conditions" },
    ],
  }),
});

type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
};

const LAST_UPDATED = "23 May 2026";

const sections: Section[] = [
  {
    id: "introduction",
    icon: ScrollText,
    title: "1. Introduction",
    body: (
      <>
        <p>
          BharatOne Services and Affiliates Pvt. Ltd. offers assistance in accessing various Indian
          government schemes, subsidies, certifications, and application services.
          <strong> We are not a government agency.</strong> All services provided are consultancy
          and support-based and do not guarantee approval or success of applications.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    icon: UserCheck,
    title: "2. Eligibility",
    body: (
      <p>
        You must be at least <strong>18 years old</strong> and legally capable of entering into
        binding contracts to use our services.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    icon: Ban,
    title: "3. Acceptable Use",
    body: (
      <>
        <p>You agree to use the website only for lawful purposes. You may not:</p>
        <ul className="mt-3 space-y-1.5">
          <li>Misrepresent your identity or provide false information.</li>
          <li>Attempt to gain unauthorised access to the site or our systems.</li>
          <li>Use the site for any fraudulent or harmful activity.</li>
        </ul>
      </>
    ),
  },
  {
    id: "fees-payments",
    icon: CreditCard,
    title: "4. Fees and Payments",
    body: (
      <p>
        Certain services may be subject to fees. All applicable charges will be disclosed before any
        payment is made. <strong>Payments are non-refundable</strong> once a service has been
        initiated.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    icon: Copyright,
    title: "5. Intellectual Property",
    body: (
      <p>
        All content on the site, including text, graphics, logos and software, is the property of
        BharatOne and protected under applicable intellectual-property laws. You may not copy,
        reproduce or distribute any material from this website without written permission.
      </p>
    ),
  },
  {
    id: "third-party-links",
    icon: LinkIcon,
    title: "6. Third-Party Links",
    body: (
      <p>
        Our site may contain links to third-party websites. We are not responsible for the content,
        privacy policies or practices of any third-party sites or services.
      </p>
    ),
  },
  {
    id: "disclaimer",
    icon: AlertTriangle,
    title: "7. Disclaimer of Warranties",
    body: (
      <p>
        Our services are offered on a <strong>best-effort basis</strong>. While we aim to provide
        accurate and updated information, we do not guarantee the completeness, accuracy or
        timeliness of any information or results.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    icon: ShieldAlert,
    title: "8. Limitation of Liability",
    body: (
      <p>
        BharatOne Services and Affiliates Pvt. Ltd. shall not be held liable for any indirect,
        incidental, special, or consequential damages arising out of your use or inability to use
        our services.
      </p>
    ),
  },
  {
    id: "termination",
    icon: PowerOff,
    title: "9. Termination",
    body: (
      <p>
        We may terminate or suspend your access to our services without notice if you breach these
        Terms or engage in any unlawful activity.
      </p>
    ),
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "10. Changes to These Terms",
    body: (
      <p>
        We reserve the right to update or change these Terms at any time. Your continued use of the
        site after any changes constitutes your acceptance of the new Terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    icon: Scale,
    title: "11. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of <strong>India</strong>. Any disputes will be subject
        to the jurisdiction of the courts in <strong>Karnataka, India</strong>.
      </p>
    ),
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function TermsPage() {
  const [activeId, setActiveId] = useState<string>(sections[0].id);
  const [showTop, setShowTop] = useState(false);

  // Highlight the section currently in view in the sidebar
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <PageShell
      eyebrow="Legal"
      title={
        <>
          Terms &amp; <span className="text-gradient-tricolor">Conditions</span>
        </>
      }
      subtitle="The agreement between you and BharatOne Services and Affiliates Pvt. Ltd. when you use our website and services."
      crumbs={[{ label: "Terms & Conditions" }]}
      accent="ashoka"
    >
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Meta strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
            <Calendar className="h-3.5 w-3.5 text-saffron" />
            Last updated: <span className="text-foreground font-medium">{LAST_UPDATED}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-india-green" />
            Effective immediately
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sticky section nav */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-28">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                On this page
              </div>
              <nav className="flex flex-col gap-0.5 border-l border-border">
                {sections.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`relative pl-4 py-2 text-sm transition-colors ${
                        active
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="terms-active"
                          className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--saffron)] to-[var(--india-green)] rounded-full"
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        />
                      )}
                      {s.title}
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Body */}
          <article className="lg:col-span-9 order-1 lg:order-2">
            {/* Intro callout */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 mb-10 shadow-soft relative overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "var(--gradient-tricolor)" }}
              />
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div className="text-sm leading-relaxed text-foreground/85">
                  Please read these Terms carefully before using BharatOne. By accessing or using
                  any part of the site or our services, you agree to be bound by these Terms. If
                  you disagree with any part of these Terms, you may not use our services.
                </div>
              </div>
            </motion.div>

            {/* Sections */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.05 }}
              className="space-y-6"
            >
              {sections.map((s) => (
                <motion.section
                  key={s.id}
                  id={s.id}
                  variants={fadeUp}
                  className="scroll-mt-28 rounded-2xl border border-border bg-card p-6 sm:p-7 hover:border-saffron/40 hover:shadow-soft transition-all"
                >
                  <header className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-saffron" />
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold">{s.title}</h2>
                  </header>
                  <div className="text-sm sm:text-[15px] leading-relaxed text-foreground/85 space-y-2">
                    {s.body}
                  </div>
                </motion.section>
              ))}
            </motion.div>

            {/* Contact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 rounded-3xl border border-border bg-gradient-to-br from-card to-muted/40 p-7 sm:p-9 text-center"
            >
              <h3 className="font-display text-xl sm:text-2xl font-bold">
                Questions about these Terms?
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                Get in touch with our team and we'll be happy to walk you through anything that
                isn't clear.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white"
                >
                  <Link to="/contact">
                    <Mail className="mr-1.5 h-4 w-4" /> Contact us
                  </Link>
                </Button>
                <a
                  href="mailto:legal@mybharatone.com"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground"
                >
                  legal@mybharatone.com →
                </a>
              </div>
            </motion.div>
          </article>
        </div>
      </section>

      {/* Back to top */}
      {showTop && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-5 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white shadow-soft flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </PageShell>
  );
}
