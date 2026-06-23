import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import { Mail, Phone, MapPin, ArrowRight, ArrowUp, Check } from "lucide-react";
import logo from "@/assets/bharatone-logo.png";

/* -------------------------------------------------------------------------- */
/* Inline brand-icon SVGs (lucide-react 1.16 has no brand glyphs)             */
/* -------------------------------------------------------------------------- */

type IconProps = { className?: string };

const FacebookIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99h-2.54V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);

const InstagramIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const TwitterIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
  </svg>
);

const YoutubeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.016 3.016 0 0 0 .502 6.186 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .502 5.814 3.016 3.016 0 0 0 2.122 2.136C4.495 20.455 12 20.455 12 20.455s7.505 0 9.376-.505a3.016 3.016 0 0 0 2.122-2.136A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
  </svg>
);

const LinkedinIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const linkVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/* -------------------------------------------------------------------------- */
/* FooterLink — animated underline on hover                                   */
/* -------------------------------------------------------------------------- */

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.li variants={linkVariants}>
      <a
        href={href}
        className="group relative inline-flex items-center gap-1.5 text-background/70 transition-colors hover:text-saffron"
      >
        <span className="relative">
          {children}
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-saffron transition-transform duration-300 group-hover:scale-x-100" />
        </span>
        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
      </a>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/* SocialIcon — magnetic spring lift on hover                                 */
/* -------------------------------------------------------------------------- */

function SocialIcon({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      variants={itemVariants}
      whileHover={{ scale: 1.12, y: -3 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-background/10 backdrop-blur-sm transition-colors hover:bg-saffron"
    >
      <span className="absolute inset-0 rounded-full opacity-0 ring-2 ring-saffron/40 transition-opacity duration-300 group-hover:opacity-100" />
      <Icon className="h-4 w-4" />
    </motion.a>
  );
}

/* -------------------------------------------------------------------------- */
/* ChakraDecoration — Ashoka chakra rotates with scroll progress              */
/* -------------------------------------------------------------------------- */

function ChakraDecoration({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  return (
    <motion.svg
      aria-hidden
      style={{ rotate, y }}
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 text-saffron/15 sm:h-96 sm:w-96 md:-right-24"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.4" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2="50"
          y2="4"
          stroke="currentColor"
          strokeWidth="0.5"
          transform={`rotate(${(i * 360) / 24} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </motion.svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Newsletter — idle → submitting → success state machine                     */
/* -------------------------------------------------------------------------- */

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || state === "submitting") return;
    setState("submitting");
    // Newsletter capture will be wired to the portal backend later.
    setTimeout(() => {
      setState("success");
      setEmail("");
      setTimeout(() => setState("idle"), 3200);
    }, 400);
  };

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={onSubmit}
      className="relative flex w-full max-w-sm items-center"
    >
      <div className="relative flex w-full items-center overflow-hidden rounded-full bg-background/10 ring-1 ring-background/15 transition-all focus-within:ring-saffron">
        <Mail className="ml-4 h-4 w-4 shrink-0 text-background/60" />
        <input
          type="email"
          required
          disabled={state !== "idle"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="w-full bg-transparent px-3 py-3 text-sm text-background placeholder:text-background/50 outline-none disabled:opacity-60"
        />
        <motion.button
          type="submit"
          disabled={state !== "idle"}
          whileTap={{ scale: 0.92 }}
          className="mr-1 flex h-9 items-center gap-1.5 rounded-full bg-saffron px-4 text-sm font-medium text-background hover:brightness-110 disabled:opacity-80"
        >
          <AnimatePresence mode="wait" initial={false}>
            {state === "idle" && (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5"
              >
                Subscribe <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            )}
            {state === "submitting" && (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/60 border-t-background" />
                Joining
              </motion.span>
            )}
            {state === "success" && (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Joined!
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.form>
  );
}

/* -------------------------------------------------------------------------- */
/* BackToTop                                                                  */
/* -------------------------------------------------------------------------- */

function BackToTop() {
  return (
    <motion.button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      variants={itemVariants}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 360, damping: 18 }}
      aria-label="Back to top"
      className="group inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-4 py-2 text-xs font-medium text-background/80 backdrop-blur-sm hover:border-saffron hover:text-saffron"
    >
      <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      Back to top
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });

  const animateProps = prefersReducedMotion
    ? { initial: false as const, animate: "visible" as const }
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, amount: 0.15 },
      };

  return (
    <footer ref={ref} className="relative isolate mt-24 overflow-hidden bg-foreground text-background">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: "var(--gradient-tricolor)" }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 0%, color-mix(in oklab, var(--saffron) 14%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, color-mix(in oklab, var(--india-green) 14%, transparent), transparent 60%)",
        }}
      />
      {!prefersReducedMotion && <ChakraDecoration scrollYProgress={scrollYProgress} />}

      {/* Newsletter row */}
      <motion.div variants={containerVariants} {...animateProps} className="container mx-auto px-4 pt-16 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-background/10 bg-background/5 p-6 backdrop-blur-sm sm:p-8 md:flex-row md:items-center md:justify-between">
          <motion.div variants={itemVariants} className="max-w-md">
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Stay in the loop</h3>
            <p className="mt-1.5 text-sm text-background/65">
              Schemes, service updates, and new centers near you — straight to your inbox.
            </p>
          </motion.div>
          <Newsletter />
        </div>
      </motion.div>

      {/* Main grid */}
      <motion.div
        variants={containerVariants}
        {...animateProps}
        className="container mx-auto grid grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-4"
      >
        <motion.div variants={itemVariants} className="col-span-2 space-y-5 md:col-span-1">
          <div className="inline-block rounded-xl bg-background p-2.5 shadow-soft">
            <img src={logo} alt="BharatOne" className="h-9 w-auto" />
          </div>
          <p className="text-sm leading-relaxed text-background/65">
            Revolutionizing how Indian citizens access essential services — from government paperwork to banking,
            all under one trusted roof.
          </p>
          <motion.div variants={itemVariants} className="flex items-center gap-2 text-xs text-background/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-india-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-india-green" />
            </span>
            Live across 1,000+ centers in India
          </motion.div>
          <motion.div variants={containerVariants} className="flex flex-wrap gap-2.5 pt-1">
            <SocialIcon href="https://www.facebook.com/" label="Facebook" Icon={FacebookIcon} />
            <SocialIcon href="https://www.instagram.com/" label="Instagram" Icon={InstagramIcon} />
            <SocialIcon href="https://x.com/" label="Twitter / X" Icon={TwitterIcon} />
            <SocialIcon href="https://www.youtube.com/" label="YouTube" Icon={YoutubeIcon} />
            <SocialIcon href="https://www.linkedin.com/" label="LinkedIn" Icon={LinkedinIcon} />
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/90">Company</h4>
          <motion.ul variants={containerVariants} className="space-y-2.5 text-sm">
            <FooterLink href="/about">About Us</FooterLink>
            <FooterLink href="/citizen-services">Services</FooterLink>
            <FooterLink href="/schemes">Schemes</FooterLink>
            <FooterLink href="/contact">Careers</FooterLink>
          </motion.ul>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/90">Services</h4>
          <motion.ul variants={containerVariants} className="space-y-2.5 text-sm">
            <FooterLink href="/services#e-gov">E-Governance</FooterLink>
            <FooterLink href="/services#nadakacheri">Nadakacheri Services</FooterLink>
            <FooterLink href="/services#aeps">Banking & AEPS</FooterLink>
            <FooterLink href="/services#irctc">Travel & IRCTC</FooterLink>
            <FooterLink href="/services#bbps">Bill Payments (BBPS)</FooterLink>
          </motion.ul>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/90">Reach Us</h4>
          <motion.ul variants={containerVariants} className="space-y-3 text-sm text-background/70">
            <motion.li variants={linkVariants} className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
              <a href="tel:+919611101334" className="hover:text-background">+91 96111 01334</a>
            </motion.li>
            <motion.li variants={linkVariants} className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
              <a href="mailto:info@mybharatone.com" className="break-all hover:text-background">info@mybharatone.com</a>
            </motion.li>
            <motion.li variants={linkVariants} className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
              <span>10th B Cross, Krishnaraja Puram,<br />Hassan, Karnataka 573201</span>
            </motion.li>
          </motion.ul>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto h-px w-[92%] origin-left"
        style={{ background: "var(--gradient-tricolor)", opacity: 0.5 }}
      />

      <motion.div
        variants={containerVariants}
        {...animateProps}
        className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-background/55 sm:flex-row sm:px-6"
      >
        <motion.span variants={itemVariants}>
          © {new Date().getFullYear()} BharatOne Services. All rights reserved.
        </motion.span>
        <motion.div variants={itemVariants} className="flex items-center gap-5">
          <a href="/privacy" className="hover:text-background">Privacy</a>
          <a href="/terms" className="hover:text-background">Terms</a>
          <span aria-hidden className="h-3 w-px bg-background/20" />
          <span className="flex items-center gap-1">Made with <span className="text-saffron">♥</span> in India</span>
        </motion.div>
        <BackToTop />
      </motion.div>
    </footer>
  );
}
