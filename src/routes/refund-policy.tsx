import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Layers,
  ScrollText,
  CheckCircle2,
  Ban,
  XCircle,
  Landmark,
  Code2,
  Store,
  CalendarClock,
  Clock,
  FileText,
  ShieldAlert,
  Search,
  RefreshCw,
  Scale,
  Mail,
  ArrowUp,
  Calendar,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — BharatOne" },
      {
        name: "description",
        content:
          "Refund & Cancellation Policy for BharatOne services — eligibility, non-refundable charges, timelines and how to request a refund.",
      },
      { property: "og:title", content: "BharatOne Refund & Cancellation Policy" },
    ],
  }),
});

type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
};

const LAST_UPDATED = "28 July 2026";

const sections: Section[] = [
  {
    id: "purpose",
    icon: ScrollText,
    title: "1. Purpose",
    body: <p>This policy explains refunds, cancellations and reversals for BharatOne services.</p>,
  },
  {
    id: "services-covered",
    icon: Layers,
    title: "2. Services Covered",
    body: (
      <p>
        AEPS, BBPS, DMT, PAN, Insurance, G2C, Recharge, Banking, Software, APIs, White Label,
        Franchise, Training and Digital Products.
      </p>
    ),
  },
  {
    id: "general",
    icon: RotateCcw,
    title: "3. General Refund Policy",
    body: (
      <p>
        Payments are <strong>final</strong> unless specifically eligible for a refund under this
        policy or applicable law.
      </p>
    ),
  },
  {
    id: "eligible",
    icon: CheckCircle2,
    title: "4. Eligible Refunds",
    body: (
      <>
        <p>Refunds may be considered, after verification, for:</p>
        <ul className="mt-3 space-y-1.5">
          <li>Duplicate payments and accidental multiple payments</li>
          <li>Payment-gateway failures and system errors</li>
          <li>Technical failures</li>
        </ul>
      </>
    ),
  },
  {
    id: "non-refundable",
    icon: Ban,
    title: "5. Non-Refundable",
    body: (
      <>
        <p>The following are non-refundable:</p>
        <ul className="mt-3 space-y-1.5">
          <li>Successful transactions</li>
          <li>Government fees</li>
          <li>Subscriptions, API/setup charges</li>
          <li>Franchise fee (₹5,999), training, KYC and devices</li>
          <li>Legally non-refundable GST</li>
        </ul>
      </>
    ),
  },
  {
    id: "failed-transactions",
    icon: XCircle,
    title: "6. Failed Transactions",
    body: (
      <p>
        Verified eligible failures will be refunded to the original payment method or your
        BharatOne Wallet.
      </p>
    ),
  },
  {
    id: "service-specific",
    icon: Landmark,
    title: "7. Service-Specific Terms",
    body: (
      <ul className="space-y-1.5">
        <li><strong>AEPS:</strong> Subject to the NPCI / bank dispute process.</li>
        <li><strong>BBPS:</strong> Successful bill payments cannot be cancelled.</li>
        <li><strong>DMT:</strong> Successful transfers are irreversible.</li>
        <li><strong>Government Services:</strong> Government fees are generally non-refundable after submission.</li>
      </ul>
    ),
  },
  {
    id: "software-apis",
    icon: Code2,
    title: "8. Software & APIs",
    body: (
      <p>
        Activation, customization and implementation charges are non-refundable once work has
        started.
      </p>
    ),
  },
  {
    id: "franchise",
    icon: Store,
    title: "9. Franchise Services",
    body: (
      <p>
        Franchise fee, onboarding, branding, activation and training charges are non-refundable
        once delivered.
      </p>
    ),
  },
  {
    id: "cancellation",
    icon: CalendarClock,
    title: "10. Cancellation",
    body: <p>Cancellation is possible only before processing begins.</p>,
  },
  {
    id: "refund-time",
    icon: Clock,
    title: "11. Refund Time",
    body: (
      <ul className="space-y-1.5">
        <li>UPI: 3–5 days</li>
        <li>Bank transfer: 5–7 days</li>
        <li>Cards: 5–10 days</li>
        <li>BharatOne Wallet: within 24 hours after approval</li>
      </ul>
    ),
  },
  {
    id: "refund-request",
    icon: FileText,
    title: "12. How to Request a Refund",
    body: (
      <p>
        Email <strong>support@mybharatone.com</strong> with your Transaction ID, date, mobile
        number, amount, service, reason and any supporting documents.
      </p>
    ),
  },
  {
    id: "fraud",
    icon: ShieldAlert,
    title: "13. Fraud Prevention",
    body: <p>Fraudulent claims will be rejected.</p>,
  },
  {
    id: "investigation",
    icon: Search,
    title: "14. Investigation",
    body: <p>BharatOne may investigate disputes and request supporting documents.</p>,
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "15. Changes",
    body: <p>This policy may be updated at any time.</p>,
  },
  {
    id: "governing-law",
    icon: Scale,
    title: "16. Governing Law",
    body: (
      <p>
        This policy is governed by the laws of <strong>India</strong>. Jurisdiction:{" "}
        <strong>Hassan, Karnataka</strong>.
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

function RefundPolicyPage() {
  const [activeId, setActiveId] = useState<string>(sections[0].id);
  const [showTop, setShowTop] = useState(false);

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
          Refund &amp; <span className="text-gradient-tricolor">Cancellation Policy</span>
        </>
      }
      subtitle="How refunds, cancellations and reversals work across BharatOne services."
      crumbs={[{ label: "Refund Policy" }]}
      accent="ashoka"
    >
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8 sm:mb-7"
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
                          layoutId="refund-active"
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

          <article className="lg:col-span-9 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 mb-7 shadow-soft relative overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "var(--gradient-tricolor)" }}
              />
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="text-sm leading-relaxed text-foreground/85">
                  Payments made to BharatOne are final unless they qualify for a refund under this
                  policy or under applicable law. Please review the eligibility, non-refundable
                  charges and timelines below before raising a refund request.
                </div>
              </div>
            </motion.div>

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

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 rounded-3xl border border-border bg-gradient-to-br from-card to-muted/40 p-7 sm:p-9 text-center"
            >
              <h3 className="font-display text-xl sm:text-2xl font-bold">Need to request a refund?</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                Email us your Transaction ID, date, mobile number, amount, service and reason with
                supporting documents, and our team will review your request.
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
                  href="mailto:support@mybharatone.com"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground"
                >
                  support@mybharatone.com →
                </a>
              </div>
            </motion.div>
          </article>
        </div>
      </section>

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
