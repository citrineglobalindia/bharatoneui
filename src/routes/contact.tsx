import { createFileRoute } from "@tanstack/react-router";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { useRef, useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Globe,
  Sparkles,
  Navigation,
  Building2,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contact BharatOne — Talk to Our Team" },
      {
        name: "description",
        content:
          "Get in touch with BharatOne — our Head Office at 10th B Cross, Krishnaraja Puram, Hassan, Karnataka 573201. Call, email, or visit us. We typically respond within one business day.",
      },
      { property: "og:title", content: "Contact BharatOne" },
      {
        property: "og:description",
        content: "Talk to the BharatOne team about services, centers and partnerships.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
/* Variants                                                                   */
/* -------------------------------------------------------------------------- */
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */
const OFFICE_ADDRESS = "Bharatone Head Office, 10th B Cross, Krishnaraja Puram, Hassan, Karnataka 573201";
const MAP_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Bharatone+Head+Office%2C+10th+B+Cross%2C+Krishnaraja+Puram%2C+Hassan%2C+Karnataka+573201";
const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=Bharatone+Head+Office%2C+10th+B+Cross%2C+Krishnaraja+Puram%2C+Hassan%2C+Karnataka+573201&output=embed";

const contactCards = [
  {
    icon: Phone,
    label: "Phone",
    value: "+91 96111 01334",
    sub: "Mon–Sat · 9:30am – 6:30pm IST",
    href: "tel:+919611101334",
    accent: "from-[var(--saffron)] to-[var(--saffron-glow)]",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@mybharatone.com",
    sub: "Reply within 1 business day",
    href: "mailto:info@mybharatone.com",
    accent: "from-[var(--india-green)] to-[var(--india-green-glow)]",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "Head Office",
    sub: "Hassan, Karnataka",
    href: "#location",
    accent: "from-[var(--ashoka)] to-[color-mix(in_oklab,var(--ashoka),white_20%)]",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon – Sat",
    sub: "9:30am – 6:30pm IST",
    accent: "from-[var(--saffron)] to-[var(--india-green)]",
  },
];

/* -------------------------------------------------------------------------- */
/* Form state                                                                 */
/* -------------------------------------------------------------------------- */
type FormState = "idle" | "submitting" | "success" | "error";

function ContactPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const decorY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!fd.get("name")?.toString().trim()) next.name = "Please tell us your name";
    const email = fd.get("email")?.toString().trim() ?? "";
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "That doesn't look like a valid email";
    if (!fd.get("msg")?.toString().trim()) next.msg = "Add a short message so we can help";
    setErrors(next);
    if (Object.keys(next).length) return;

    setState("submitting");
    // Contact submissions will be wired to the portal backend later.
    setTimeout(() => setState("success"), 500);
  };

  return (
    <PageShell
      eyebrow="Contact"
      title={
        <>
          Let's talk —{" "}
          <span className="text-gradient-tricolor">we're listening.</span>
        </>
      }
      subtitle="Reach out for service queries, center partnerships, media, or general enquiries. We typically respond within one business day."
      crumbs={[{ label: "Contact" }]}
      accent="ashoka"
    >
      {/* Quick contact cards */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="container mx-auto px-4 sm:px-6 -mt-8 sm:-mt-12 relative z-10"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {contactCards.map((c) => {
            const Tag = c.href ? "a" : "div";
            return (
              <motion.div key={c.label} variants={item}>
                <Tag
                  {...(c.href ? { href: c.href } : {})}
                  className="group relative block h-full rounded-2xl border border-border bg-card/95 backdrop-blur p-4 sm:p-5 hover:border-saffron/40 hover:shadow-soft transition-all"
                >
                  <div
                    className={`inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-soft`}
                  >
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="font-semibold text-sm sm:text-base mt-1 leading-snug">
                    {c.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
                  {c.href && (
                    <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  )}
                </Tag>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Form + sidebar */}
      <section ref={sectionRef} className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-5 gap-8 relative">
        {/* Decorative ambient glow */}
        <motion.div
          aria-hidden
          style={{ y: decorY }}
          className="pointer-events-none absolute -z-10 -top-10 right-0 h-80 w-80 rounded-full bg-[var(--saffron)]/12 blur-3xl"
        />
        <motion.div
          aria-hidden
          style={{ y: decorY }}
          className="pointer-events-none absolute -z-10 bottom-10 -left-10 h-80 w-80 rounded-full bg-[var(--india-green)]/12 blur-3xl"
        />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-elegant relative overflow-hidden"
        >
          {/* Tricolor accent strip */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--gradient-tricolor)" }}
          />

          <AnimatePresence mode="wait" initial={false}>
            {state === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-center py-14"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -8, 0] }}
                  transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
                  className="mx-auto h-16 w-16 rounded-full bg-india-green/15 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-9 w-9 text-india-green" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-2xl sm:text-3xl font-bold mt-5"
                >
                  Message received!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-muted-foreground mt-2 max-w-md mx-auto"
                >
                  Thanks for reaching out. Our team will get back to you within one business day.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-7"
                >
                  <Button
                    onClick={() => {
                      setState("idle");
                      setErrors({});
                    }}
                  >
                    Send another message
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={onSubmit}
                noValidate
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 text-saffron" />
                  Send us a message
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="name" label="Full name" error={errors.name}>
                    <Input id="name" name="name" placeholder="Your name" aria-invalid={!!errors.name} />
                  </Field>
                  <Field id="email" label="Email" error={errors.email}>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={!!errors.email}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="phone" label="Phone (optional)">
                    <Input id="phone" name="phone" type="tel" placeholder="+91 …" />
                  </Field>
                  <Field id="topic" label="I'm reaching out about">
                    <select
                      id="topic"
                      name="topic"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--saffron)] focus:ring-offset-1 focus:ring-offset-background"
                      defaultValue="services"
                    >
                      <option value="services">Citizen services</option>
                      <option value="center">Opening a center</option>
                      <option value="partnership">Partnership</option>
                      <option value="media">Media / Press</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                <Field id="msg" label="Message" error={errors.msg}>
                  <Textarea id="msg" name="msg" rows={5} placeholder="How can we help?" aria-invalid={!!errors.msg} />
                </Field>

                {errors.form && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-destructive/30 bg-destructive/8 text-destructive text-sm px-3 py-2"
                  >
                    {errors.form}
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={state === "submitting"}
                    className="w-full sm:w-auto bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white shadow-soft hover:shadow-glow transition-shadow"
                  >
                    {state === "submitting" ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending
                      </>
                    ) : (
                      <>
                        Send message <Send className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-saffron" />
                    We never share your details — promise.
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Side info */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="rounded-3xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 sm:p-7 shadow-soft"
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-saffron/12 text-saffron mb-3">
              <Building2 className="h-3.5 w-3.5" />
              Head Office
            </div>
            <h3 className="font-display text-xl font-bold leading-tight">
              Bharatone Head Office
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Visit our Head Office in Hassan — the single point of contact for citizens
              accessing 100+ services across Karnataka and beyond.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-saffron" />
                <span>{OFFICE_ADDRESS}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-saffron" />
                <span>Open Mon – Sat · 9:30am – 6:30pm IST</span>
              </div>
            </div>
            <a
              href={MAP_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-saffron hover:underline"
            >
              <Navigation className="h-4 w-4" /> Get directions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="rounded-3xl border border-border bg-card p-6 sm:p-7"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Globe className="h-4 w-4 text-india-green" /> Other ways to reach us
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <a
                href="https://wa.me/919611101334"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:border-india-green/50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-india-green animate-pulse" />
                  WhatsApp support
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="mailto:partners@mybharatone.com"
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:border-saffron/50 transition-colors"
              >
                <span>Partnerships</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="mailto:press@mybharatone.com"
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:border-ashoka/50 transition-colors"
              >
                <span>Media &amp; Press</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Map / Location */}
      <section id="location" className="container mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between flex-wrap gap-3 mb-5"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Find us
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              Pin-drop, real location.
            </h2>
          </div>
          <a
            href={MAP_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium rounded-full border border-border bg-background px-4 py-2 hover:border-saffron transition-colors"
          >
            <Navigation className="h-4 w-4 text-saffron" /> Get directions
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden border border-border shadow-elegant aspect-[16/10] sm:aspect-[16/8]"
        >
          {/* Map iframe */}
          <iframe
            title="Bharatone Head Office, Hassan — Google Maps"
            src={MAP_EMBED_SRC}
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          {/* Pin badge overlay */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.45 }}
            className="absolute top-4 left-4 pointer-events-auto"
          >
            <div className="flex items-center gap-2 rounded-full bg-background/95 backdrop-blur border border-border px-3.5 py-2 shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron" />
              </span>
              <span className="text-xs font-semibold">Bharatone Head Office, Hassan</span>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Field — labelled wrapper with inline error                                 */
/* -------------------------------------------------------------------------- */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
