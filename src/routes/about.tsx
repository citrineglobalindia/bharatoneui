import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useSpring, type Variants } from "framer-motion";
import { useRef } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/site/Counter";
import {
  Target,
  Compass,
  HeartHandshake,
  Award,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Rocket,
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

const values = [
  { icon: Target, title: "Citizen First", desc: "Every service, process and decision begins with the citizen we serve." },
  { icon: ShieldCheck, title: "Trust & Integrity", desc: "Government-approved, transparent and secure from end to end." },
  { icon: HeartHandshake, title: "Inclusive Access", desc: "Bridging the digital divide for rural and urban India alike." },
  { icon: Rocket, title: "Built to Scale", desc: "Engineered to bring 100+ essential services to a billion Indians." },
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
      eyebrow="About Us"
      title={
        <>
          Building the bridge to{" "}
          <span className="text-gradient-tricolor">essential services</span> for every citizen.
        </>
      }
      subtitle="BharatOne is on a mission to bring government, banking, welfare and everyday services within walking distance of every Indian household."
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
            Our story is the story of <span className="text-saffron">Bharat</span>.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mt-5 leading-relaxed">
            For millions of Indians, accessing a simple government document still means lost wages,
            long queues and confusing paperwork. BharatOne was started to fix that — by training
            entrepreneurs in every neighbourhood to deliver 100+ services with empathy and trust.
          </motion.p>
          <motion.p variants={fadeUp} className="text-muted-foreground mt-4 leading-relaxed">
            Today, our network of 1,000+ centers serves citizens across 28 states with everything
            from Aadhaar updates and AEPS banking to insurance and welfare schemes.
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
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 grid md:grid-cols-2 gap-6">
          {[
            { icon: Target, label: "Our Mission", text: "Deliver essential services to every Indian citizen with dignity, transparency and speed." },
            { icon: Compass, label: "Our Vision", text: "A Bharat where access to government, finance and welfare is never more than a 10-minute walk away." },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="rounded-3xl bg-card border border-border p-8 shadow-soft hover:shadow-elegant transition-shadow"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center mb-4">
                <m.icon className="h-6 w-6" />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</div>
              <p className="mt-2 text-lg leading-relaxed">{m.text}</p>
            </motion.div>
          ))}
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
          <h2 className="font-display text-3xl sm:text-4xl font-bold">What we stand for</h2>
          <p className="text-muted-foreground mt-3">
            Four values that guide every center, conversation and service we deliver.
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {values.map((v) => (
            <motion.div
              key={v.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl border border-border bg-card p-6 hover:border-saffron/40 hover:shadow-elegant transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 flex items-center justify-center">
                <v.icon className="h-5 w-5 text-saffron" />
              </div>
              <h3 className="font-display font-semibold text-lg mt-4">{v.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Timeline with scroll-progress line */}
      <Timeline milestones={milestones} />
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
