import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Copyright,
  Link as LinkIcon,
  Server,
  Mail,
  ArrowUp,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Privacy Policy — BharatOne" },
      {
        name: "description",
        content:
          "Privacy Policy, Copyright, Hyperlinking and Security policies for BharatOne Services and Affiliates Pvt. Ltd.",
      },
      { property: "og:title", content: "BharatOne Privacy Policy" },
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
    id: "privacy-policy",
    icon: Lock,
    title: "1. Privacy Policy",
    body: (
      <>
        <p>
          BharatOne Services and Affiliates Pvt. Ltd. are committed to protecting the privacy of
          users who visit our website.
          <strong> We do not automatically collect any personal information</strong> that can
          identify you individually (such as name, phone number or email address), unless you
          voluntarily provide it to us.
        </p>
        <p>
          If you choose to provide personal information through any form, service registration or
          email, it will be used strictly to respond to your query or provide the service you
          requested. <strong>We do not share, sell or distribute</strong> personal information to
          third parties, unless required by law or for delivering services with your consent.
        </p>
      </>
    ),
  },
  {
    id: "copyright-policy",
    icon: Copyright,
    title: "2. Copyright Policy",
    body: (
      <>
        <p>
          All content published on the BharatOne Services website is the property of BharatOne
          Services and Affiliates Pvt. Ltd. unless otherwise stated. You may reproduce material from
          this website free of charge with prior written permission. However, this must be done:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "Accurately",
            "Without derogatory context",
            "With proper acknowledgement of the source",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-india-green shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Permission does not extend to any third-party material identified as such. For content
          owned by other copyright holders, users must obtain permission directly from them.
        </p>
      </>
    ),
  },
  {
    id: "hyperlinking-policy",
    icon: LinkIcon,
    title: "3. Hyperlinking Policy",
    body: (
      <>
        <p>
          Our website may contain links to external websites for user convenience. BharatOne
          Services and Affiliates Pvt. Ltd. are <strong>not responsible</strong> for the content or
          reliability of linked websites and do not endorse any views expressed therein.
        </p>
        <p>
          We do not guarantee that links will remain active at all times and are not liable for any
          broken or outdated links.
        </p>
      </>
    ),
  },
  {
    id: "security-policy",
    icon: Server,
    title: "4. Security Policy",
    body: (
      <>
        <p>
          To ensure site security and availability to all users, our systems use commercial-grade
          software to monitor traffic and detect unauthorised activity. Unauthorised attempts to
          alter or upload content, or otherwise damage this site, are{" "}
          <strong>strictly prohibited</strong> and punishable under the{" "}
          <strong>Information Technology Act, 2000</strong> and other applicable Indian laws.
        </p>
        <p>
          We retain logs of traffic for analysis and security purposes, which are regularly reviewed
          and deleted according to our internal data retention policies.
        </p>
      </>
    ),
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function PrivacyPage() {
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
          Privacy &amp; <span className="text-gradient-tricolor">Policies</span>
        </>
      }
      subtitle="How BharatOne handles your data, our content, third-party links and the security of this site."
      crumbs={[{ label: "Privacy Policy" }]}
      accent="green"
    >
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
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
            Your data, your control
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sticky nav */}
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
                          layoutId="privacy-active"
                          className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--india-green)] to-[var(--saffron)] rounded-full"
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
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--india-green)] to-[var(--saffron)] text-white flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-sm leading-relaxed text-foreground/85">
                  We take privacy seriously. This page covers how we collect (or don't collect)
                  personal information, our content ownership, the rules for linking to other sites
                  from ours and how we secure your visit. Have questions? Email{" "}
                  <a
                    href="mailto:privacy@mybharatone.com"
                    className="text-saffron font-medium hover:underline"
                  >
                    privacy@mybharatone.com
                  </a>
                  .
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
                  className="scroll-mt-28 rounded-2xl border border-border bg-card p-6 sm:p-7 hover:border-india-green/40 hover:shadow-soft transition-all"
                >
                  <header className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--india-green)]/15 to-[var(--saffron)]/15 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-india-green" />
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
              <h3 className="font-display text-xl sm:text-2xl font-bold">
                Privacy-related question?
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                Reach out and we'll respond within one business day. You can also see our Terms for
                the broader agreement that governs our services.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-[var(--india-green)] to-[var(--saffron)] text-white"
                >
                  <Link to="/contact">
                    <Mail className="mr-1.5 h-4 w-4" /> Contact us
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/terms">Read our Terms</Link>
                </Button>
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
          className="fixed bottom-24 right-5 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-[var(--india-green)] to-[var(--saffron)] text-white shadow-soft flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </PageShell>
  );
}
