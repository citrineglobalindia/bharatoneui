import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useSpring, type Variants } from "framer-motion";
import { useRef } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Gallery } from "@/components/site/Gallery";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/site/Counter";
import {
  Target,
  Eye,
  Award,
  Users,
  MapPin,
  Sparkles,
  ExternalLink,
  Landmark,
  Headphones,
  Zap,
  Wallet,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "About BharatOne — Our Mission to Empower Indian Citizens" },
      {
        name: "description",
        content:
          "Learn how BharatOne is bridging the digital divide with 1,000+ service centers, bringing government, banking and welfare services to every Indian neighbourhood.",
      },
      { property: "og:title", content: "About BharatOne" },
      {
        property: "og:description",
        content: "Our story, mission and the people behind India's fastest-growing citizen services network.",
      },
    ],
  }),
});

// CR-142 — "Why Choose BharatOne?" reasons.
const reasons = [
  {
    icon: Landmark,
    title: "Govt Approved Services",
    tone: "text-india-green",
    chip: "bg-india-green",
    desc: "We are an officially recognized provider of essential government services including Aadhaar updates, PAN applications, certificates, and welfare schemes.",
  },
  {
    icon: Headphones,
    title: "Local & 24/7 Support",
    tone: "text-saffron",
    chip: "bg-saffron",
    desc: "Our local service agents are available to guide you in person, while our support helpline is open 24/7 for any queries or technical help.",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    tone: "text-purple-600",
    chip: "bg-purple-600",
    desc: "With streamlined digital operations and direct integration with government portals, we ensure quick application and processing of your requests.",
  },
  {
    icon: Wallet,
    title: "Affordable Fees",
    tone: "text-blue-600",
    chip: "bg-blue-500",
    desc: "We believe in fair pricing. Our service charges are minimal, transparent, and designed to be accessible for all income groups.",
  },
  {
    icon: Globe,
    title: "Digital Rural Reach",
    tone: "text-rose-600",
    chip: "bg-rose-600",
    desc: "We are committed to bridging the digital divide by offering doorstep digital services even in the most remote villages through local partners.",
  },
  {
    icon: Users,
    title: "Trusted by Thousands",
    tone: "text-emerald-600",
    chip: "bg-emerald-500",
    desc: "Thousands of satisfied users trust BharatOne for secure, fast, and reliable service delivery every day.",
  },
];

const milestones = [
  { year: "2021", title: "BharatOne founded", desc: "Started with a single service center in Karnataka." },
  { year: "2022", title: "100 centers", desc: "Expanded across South India with citizen-first services." },
  { year: "2024", title: "1,000+ centers", desc: "Recognized by Startup India and ELEVATE Karnataka." },
  { year: "2025", title: "Shreerakshe Health Card", desc: "Launched our flagship welfare initiative for families." },
];

const stats = [
  { icon: Users, value: 1000000, suffix: "+", format: (n: number) => `${(n / 100000).toFixed(0)}L`, label: "Citizens served" },
  { icon: MapPin, value: 28, suffix: "", label: "States reached" },
  { icon: Award, value: 1000, suffix: "+", label: "Active centers" },
  { icon: Sparkles, value: 100, suffix: "+", label: "Services offered" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AboutPage() {
  return (
    <PageShell
      eyebrow="About BharatOne"
      centered
      divider
      title={
        <>
          Serving Indian Citizens with{" "}
          <span className="text-saffron">Accessible</span>,{" "}
          <span className="text-india-green">Essential Services</span>
        </>
      }
      subtitle="At BharatOne Services and Affiliates Pvt. Ltd., we believe in empowering Indian citizens by simplifying access to essential government, banking, and financial services. Through technology, transparency, and a strong partner network, we are committed to helping every citizen take control of their everyday needs — efficiently, securely, and with confidence."
      actions={
        <Button asChild size="lg" className="bg-saffron text-white hover:bg-saffron/90">
          <Link to="/citizen-services">
            Explore Services <ExternalLink className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      }
      crumbs={[{ label: "About" }]}
    >
      {/* Story + stats */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-start">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-4xl font-bold leading-tight">
            About <span className="text-saffron">BharatOne</span> — Serving Indian Citizens
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg font-semibold italic text-india-green">
            &ldquo;Empowering Every Indian with Easy, Reliable Access to Essential Services&rdquo;
          </motion.p>
          <motion.p variants={fadeUp} className="text-muted-foreground mt-5 leading-relaxed">
            BharatOne Services and Affiliates Pvt. Ltd. is committed to creating an accessible
            ecosystem where individuals across India can effortlessly access a variety of essential
            services.
          </motion.p>
          <motion.p variants={fadeUp} className="text-muted-foreground mt-4 leading-relaxed">
            We aim to bridge the gap between the government, banks, and the people by offering a wide
            range of services through our network of registered service centers. Whether it&rsquo;s
            applying for a loan, accessing e-government services, or seeking support at an RTO center,
            we are here to serve every Indian citizen with ease and transparency.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white">
              <Link to="/citizen-services">Explore Services <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Talk to our team</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-2 gap-4"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft relative overflow-hidden group"
            >
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-saffron/8 group-hover:bg-saffron/14 transition-colors" />
              <s.icon className="h-5 w-5 text-saffron relative" />
              <div className="mt-3 font-display text-2xl sm:text-3xl font-bold relative">
                <Counter
                  value={s.value}
                  suffix={s.suffix}
                  {...(s.format ? { format: s.format } : {})}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1 relative">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission / Vision */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center font-display text-3xl sm:text-4xl font-bold mb-10"
          >
            Our <span className="text-india-green">Mission</span> &amp;{" "}
            <span className="text-saffron">Vision</span>
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Target,
                label: "Mission",
                bar: "bg-saffron",
                chip: "bg-saffron",
                text: "Our mission is to democratize digital services and bring government schemes, financial access, and identity services to every corner of India through an efficient, transparent, and reliable platform.",
              },
              {
                icon: Eye,
                label: "Vision",
                bar: "bg-india-green",
                chip: "bg-india-green",
                text: "Our vision is to be India's most trusted and accessible platform for citizen-centric services by revolutionizing the delivery of governance and welfare schemes through technology and human touch.",
              },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="overflow-hidden rounded-2xl bg-card border border-border shadow-soft hover:shadow-elegant transition-shadow"
              >
                <div className={`h-1.5 w-full ${m.bar}`} />
                <div className="p-8 text-center">
                  <div className={`mx-auto h-14 w-14 rounded-full ${m.chip} text-white flex items-center justify-center`}>
                    <m.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold">{m.label}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{m.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Why Choose <span className="text-india-green">BharatOne</span>?
          </h2>
          <p className="text-muted-foreground mt-3">
            Your trusted partner for all government and public services across India
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {reasons.map((v) => (
            <motion.div
              key={v.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl border border-border bg-card p-6 text-center hover:border-saffron/40 hover:shadow-elegant transition-all"
            >
              <div className={`mx-auto h-12 w-12 rounded-full ${v.chip} text-white flex items-center justify-center`}>
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className={`font-display font-semibold text-lg mt-4 ${v.tone}`}>{v.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Timeline with scroll-progress line */}
      <Timeline milestones={milestones} />
      <Gallery />
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Timeline — line fills as user scrolls through the section                  */
/* -------------------------------------------------------------------------- */
function Timeline({ milestones }: { milestones: typeof milestones extends infer T ? T : never } & { milestones: { year: string; title: string; desc: string }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 70%", "end 30%"],
  });
  const lineScaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 30, mass: 0.4 });

  return (
    <section className="bg-muted/40 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Our journey</h2>
          <p className="text-muted-foreground mt-3">
            Milestones on the road to serving every Indian household.
          </p>
        </motion.div>

        <div ref={containerRef} className="relative max-w-3xl mx-auto">
          {/* Track */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border" />
          {/* Progress line */}
          <motion.div
            style={{ scaleY: lineScaleY, transformOrigin: "top" }}
            className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--saffron)] via-[var(--india-green)] to-[var(--ashoka)]"
          />

          <div className="space-y-10">
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55 }}
                className={`relative pl-12 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-10 ${
                  i % 2 === 0 ? "" : "sm:[&>*:first-child]:order-2"
                }`}
              >
                <div className={`${i % 2 === 0 ? "sm:text-right sm:pr-10" : "sm:pl-10"}`}>
                  <div className="text-xs font-mono text-saffron font-semibold">{m.year}</div>
                  <div className="font-display text-xl font-semibold mt-1">{m.title}</div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{m.desc}</p>
                </div>
                <div className="hidden sm:block" />
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
                  className="absolute left-4 sm:left-1/2 top-1.5 -translate-x-1/2 h-3 w-3 rounded-full bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] ring-4 ring-muted/40"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
