import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, pick } from "@/lib/use-lang";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { PageShell } from "@/components/site/PageShell";
import { ApplyDialog, type JobMeta } from "@/components/site/ApplyDialog";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Users,
  Rocket,
  Heart,
  GraduationCap,
  Globe,
  ChevronDown,
  Mail,
  Search,
  FileText,
  CheckCircle2,
  Award,
  Coffee,
  Smile,
  Calendar,
  Zap,
  Quote,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/careers")({
  component: CareersPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Careers at BharatOne — Build Bharat With Us" },
      {
        name: "description",
        content:
          "Join BharatOne and help bring essential services to every Indian household. Engineering, ops, design and community roles across India.",
      },
      { property: "og:title", content: "Careers at BharatOne" },
      {
        property: "og:description",
        content: "Open roles at India's fastest-growing citizen services network.",
      },
    ],
  }),
});

/* -------------------------------------------------------------------------- */
const perks = [
  { icon: Heart, title: "Purpose-driven work", desc: "Every center we open and every line of code shipped touches a real citizen's life." },
  { icon: Rocket, title: "Build at scale", desc: "Ship products used by millions of Indians across 28 states." },
  { icon: Users, title: "People-first culture", desc: "Health cover for family, learning budget and flexible work modes." },
  { icon: GraduationCap, title: "Grow with us", desc: "Mentorship, structured career paths, and a real seat at the table." },
  { icon: Globe, title: "Remote-friendly", desc: "Hybrid by default. Pick the setup that lets you do your best work." },
  { icon: Sparkles, title: "Ownership", desc: "ESOPs for full-time roles. We win when you win." },
];

type Job = {
  id: string;
  title: string;
  team: string;
  location: string;
  type: string;
  level: "Junior" | "Mid" | "Senior" | "Lead";
  summary: string;
  responsibilities: string[];
  niceToHave: string[];
};

const jobs: Job[] = [
  {
    id: "fe-senior",
    title: "Senior Frontend Engineer",
    team: "Engineering",
    location: "Bengaluru / Remote (India)",
    type: "Full-time",
    level: "Senior",
    summary:
      "Build the customer-facing surfaces of BharatOne — the citizen portal, partner center dashboard and admin tools used daily across 1,000+ locations.",
    responsibilities: [
      "Own end-to-end delivery of features across React + TypeScript + TanStack Router",
      "Drive performance, accessibility and i18n (Hindi, Kannada, English)",
      "Mentor junior engineers and define frontend conventions",
    ],
    niceToHave: ["Experience with TanStack Start / Vite", "Design-systems sense", "Built consumer products at scale"],
  },
  {
    id: "ops-mgr-south",
    title: "Operations Manager — South",
    team: "Operations",
    location: "Bengaluru",
    type: "Full-time",
    level: "Lead",
    summary:
      "Lead expansion and quality across our southern network — Karnataka, Tamil Nadu, Telangana, Andhra Pradesh and Kerala.",
    responsibilities: [
      "Run weekly business reviews with center partners",
      "Build SOPs for service quality and dispute resolution",
      "Partner with central ops + product to close feedback loops",
    ],
    niceToHave: ["5+ years in field ops or franchise networks", "Fluent in Kannada and English", "Comfort with data dashboards"],
  },
  {
    id: "community-lead",
    title: "Community Lead",
    team: "Community",
    location: "Hyderabad",
    type: "Full-time",
    level: "Mid",
    summary:
      "Build and nurture our partner community — train new center owners, run monthly meet-ups and turn champion partners into advocates.",
    responsibilities: [
      "Design and run partner onboarding and training programs",
      "Organize regional meet-ups and webinars",
      "Capture stories from the field and surface them to leadership",
    ],
    niceToHave: ["Community management experience", "Strong storytelling", "Comfortable with WhatsApp + spreadsheets"],
  },
  {
    id: "product-designer",
    title: "Product Designer",
    team: "Design",
    location: "Remote (India)",
    type: "Full-time",
    level: "Mid",
    summary:
      "Design citizen-facing experiences for users who often see a smartphone for the first time. Simplicity is non-negotiable.",
    responsibilities: [
      "Own end-to-end design from research to handoff",
      "Build and evolve the BharatOne design system",
      "Collaborate closely with engineering and ops",
    ],
    niceToHave: ["Portfolio with shipped consumer products", "Comfort with Figma + prototyping", "Bharat / rural empathy"],
  },
  {
    id: "cs-associate",
    title: "Customer Success Associate",
    team: "Support",
    location: "Bengaluru",
    type: "Full-time",
    level: "Junior",
    summary:
      "First responder to partner centers and citizens. Resolve queries fast, find patterns and turn pain points into product asks.",
    responsibilities: [
      "Handle multi-channel support (call, chat, email)",
      "Tag and triage issues, work with ops + engineering on fixes",
      "Maintain an internal knowledge base",
    ],
    niceToHave: ["1+ years in CX", "Multilingual (Hindi/Kannada/Tamil)", "Calm under pressure"],
  },
];

const hiringSteps = [
  { icon: FileText, title: "Apply", desc: "Submit the form on this page with your resume — takes ~5 minutes." },
  { icon: Users, title: "Recruiter call", desc: "A 30-minute conversation to learn about you, your goals and BharatOne." },
  { icon: Briefcase, title: "Skill assessment", desc: "Role-specific — either a take-home task, work sample or live problem-solving." },
  { icon: Sparkles, title: "Team interviews", desc: "Meet 2-3 people you'd work with. We dig into craft, collaboration and values." },
  { icon: Heart, title: "Founder chat", desc: "A 45-min conversation with leadership about mission, growth and life at BharatOne." },
  { icon: CheckCircle2, title: "Offer", desc: "Detailed offer letter, equity (where applicable), and a warm welcome to the team." },
];

const benefits = [
  { icon: Heart, title: "Health insurance", desc: "Comprehensive cover for you and your dependents — including parents." },
  { icon: Calendar, title: "Generous leave", desc: "24 days paid leave + 12 public holidays + period leave + sick leave." },
  { icon: GraduationCap, title: "Learning budget", desc: "₹50,000/year per person for books, courses, conferences and certifications." },
  { icon: Coffee, title: "Hybrid work", desc: "Office in Hassan, but we trust you to work from wherever you do your best work." },
  { icon: Award, title: "ESOPs", desc: "Equity options for full-time roles. We grow together." },
  { icon: Smile, title: "Mental health", desc: "Confidential counselling and wellness sessions on the company." },
  { icon: Zap, title: "Real impact", desc: "Your work shows up in 1,000+ centers across 28 states — and counting." },
  { icon: Globe, title: "Family-first", desc: "Predictable hours. Generous parental leave. Pet-friendly office." },
];

const faqs = [
  {
    q: "Do I need to relocate to Hassan?",
    a: "Only for roles explicitly tagged 'Bengaluru' or 'Hassan'. Many engineering and design roles are fully remote within India.",
  },
  {
    q: "What's your hiring timeline?",
    a: "From application to offer typically 2-3 weeks. We respect your time — slow processes are bad business and worse hospitality.",
  },
  {
    q: "Do you sponsor international candidates?",
    a: "We currently hire only candidates with existing work authorisation in India.",
  },
  {
    q: "What if my role isn't listed?",
    a: "Send a note to careers@mybharatone.com with your CV and a paragraph on what you'd build with us. We read every email.",
  },
  {
    q: "What does compensation look like?",
    a: "Competitive cash + ESOPs for full-time roles. We benchmark against top-tier Indian startups and adjust regularly. Numbers are shared early in the first call.",
  },
];

const TEAMS = ["All", "Engineering", "Operations", "Community", "Design", "Support"] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "•";

function CareersPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [applyFor, setApplyFor] = useState<JobMeta | null>(null);
  const [team, setTeam] = useState<(typeof TEAMS)[number]>("All");
  const [q, setQ] = useState("");
  // "Life at BharatOne" team testimonials — admin-managed (Website Gallery → Careers).
  const lang = useLang();
  const [teamTestimonials, setTeamTestimonials] = useState<{ quote: string; quote_kn?: string | null; quote_hi?: string | null; name: string; role: string; role_kn?: string | null; role_hi?: string | null; avatar: string }[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("name, place, quote, initials, quote_kn, quote_hi, place_kn, place_hi")
        .eq("is_active", true)
        .eq("kind", "team")
        .order("sort_order")
        .order("created_at");
      if (!on || !data) return;
      setTeamTestimonials(
        (data as { name: string; place: string | null; quote: string; initials: string | null; quote_kn: string | null; quote_hi: string | null; place_kn: string | null; place_hi: string | null }[]).map((d) => ({
          quote: d.quote,
          quote_kn: d.quote_kn,
          quote_hi: d.quote_hi,
          name: d.name,
          role: d.place ?? "",
          role_kn: d.place_kn,
          role_hi: d.place_hi,
          avatar: d.initials?.trim() || initialsOf(d.name),
        })),
      );
    })();
    return () => { on = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (team !== "All" && j.team !== team) return false;
      if (!needle) return true;
      return (
        j.title.toLowerCase().includes(needle) ||
        j.team.toLowerCase().includes(needle) ||
        j.location.toLowerCase().includes(needle)
      );
    });
  }, [team, q]);

  return (
    <PageShell
      eyebrow="Careers"
      title={
        <>
          Build <span className="text-gradient-tricolor">Bharat</span> with us.
        </>
      }
      subtitle="We're hiring engineers, designers, operators and storytellers who want to put government, banking and welfare services within walking distance of every Indian household."
      crumbs={[{ label: "Careers" }]}
      accent="green"
    >
      {/* Perks */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Why join BharatOne</h2>
          <p className="text-muted-foreground mt-3">
            A place where craftsmanship, kindness and country come together.
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {perks.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl border border-border bg-card p-6 hover:border-saffron/40 hover:shadow-elegant transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 flex items-center justify-center">
                <p.icon className="h-5 w-5 text-saffron" />
              </div>
              <h3 className="font-display font-semibold text-lg mt-4">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Open roles */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Open positions
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mt-1">
                {filtered.length} role{filtered.length === 1 ? "" : "s"} open
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Team filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TEAMS.map((t) => {
              const active = t === team;
              return (
                <button
                  key={t}
                  onClick={() => setTeam(t)}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? "border-saffron text-saffron"
                      : "border-border text-foreground/70 hover:border-saffron/40"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="team-pill"
                      className="absolute inset-0 rounded-full bg-saffron/12 -z-10"
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    />
                  )}
                  {t}
                </button>
              );
            })}
          </div>

          {/* Job list */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Briefcase className="h-9 w-9 mx-auto text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold mt-3">No roles match that filter</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We're growing fast — write to us anyway, we'd love to hear from you.
              </p>
              <Button
                asChild
                className="mt-5 bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white"
              >
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <AnimatePresence>
                {filtered.map((job) => {
                  const open = openId === job.id;
                  return (
                    <motion.div
                      key={job.id}
                      layout
                      variants={fadeUp}
                      className="rounded-2xl border border-border bg-card overflow-hidden hover:border-saffron/40 transition-colors"
                    >
                      <button
                        onClick={() => setOpenId(open ? null : job.id)}
                        className="w-full text-left p-5 sm:p-6 flex items-start sm:items-center gap-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-display font-semibold text-lg">{job.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {job.level}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {job.team}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-6 sm:p-8 bg-muted/30 grid lg:grid-cols-3 gap-8">
                              <div className="lg:col-span-2 space-y-5">
                                <p className="text-sm leading-relaxed text-foreground/90">
                                  {job.summary}
                                </p>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    What you'll do
                                  </div>
                                  <ul className="space-y-1.5 text-sm">
                                    {job.responsibilities.map((r) => (
                                      <li key={r} className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-saffron shrink-0" />
                                        <span>{r}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Bonus points
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {job.niceToHave.map((t) => (
                                      <span
                                        key={t}
                                        className="text-xs px-2.5 py-1 rounded-full bg-card border border-border"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <Button
                                  size="lg"
                                  onClick={() => setApplyFor({ id: job.id, title: job.title, team: job.team })}
                                  className="w-full bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white"
                                >
                                  Apply now <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                  <Link to="/contact">Ask a question</Link>
                                </Button>
                                <div className="text-[11px] text-muted-foreground text-center pt-2">
                                  We respond to every application within 5 business days.
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Hiring process */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-saffron">
            How we hire
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">
            From application to offer in 2-3 weeks
          </h2>
          <p className="text-muted-foreground mt-3">
            We respect your time. No leetcode marathons, no ghosting — just a real conversation
            about real work.
          </p>
        </motion.div>
        <div className="relative max-w-4xl mx-auto">
          <div
            aria-hidden
            className="absolute left-5 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--saffron)] via-border to-[var(--india-green)]"
          />
          <div className="space-y-8 sm:space-y-12">
            {hiringSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                className={`relative pl-14 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-12 ${
                  i % 2 === 0 ? "" : "sm:[&>*:first-child]:order-2"
                }`}
              >
                <div className={`${i % 2 === 0 ? "sm:text-right sm:pr-12" : "sm:pl-12"}`}>
                  <div className="text-xs font-mono text-saffron font-semibold">
                    Step {i + 1}
                  </div>
                  <h3 className="font-display text-xl font-semibold mt-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="hidden sm:block" />
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
                  className="absolute left-5 sm:left-1/2 top-1.5 -translate-x-1/2 h-10 w-10 rounded-full bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center ring-4 ring-background"
                >
                  <step.icon className="h-4 w-4" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center mb-12"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-india-green">
              What you get
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">
              Benefits that actually help
            </h2>
            <p className="text-muted-foreground mt-3">
              Real comp, real time off, real care for your family and growth.
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="rounded-2xl border border-border bg-card p-5 hover:border-saffron/40 hover:shadow-soft transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-saffron" />
                </div>
                <h3 className="font-display font-semibold text-base mt-3">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials — admin-managed; hidden until at least one is added */}
      {teamTestimonials.length > 0 && (
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ashoka">
            Life at BharatOne
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">
            From the people building it
          </h2>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-4 sm:gap-6"
        >
          {teamTestimonials.map((t) => (
            <motion.figure
              key={t.name}
              variants={fadeUp}
              className="rounded-3xl border border-border bg-card p-6 sm:p-7 relative hover:shadow-elegant transition-shadow"
            >
              <Quote className="absolute top-5 right-5 h-6 w-6 text-saffron/30" />
              <blockquote className="text-sm leading-relaxed text-foreground/85" translate="no">
                "{pick(lang, t.quote, t.quote_kn, t.quote_hi)}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white text-sm font-semibold flex items-center justify-center">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm" translate="no">{t.name}</div>
                  <div className="text-xs text-muted-foreground" translate="no">{pick(lang, t.role, t.role_kn, t.role_hi)}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </section>
      )}

      {/* FAQ */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center mb-10"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-saffron">
              FAQ
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">
              Quick answers for applicants
            </h2>
          </motion.div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center shadow-elegant relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--gradient-tricolor)" }}
          />
          <h3 className="font-display text-2xl sm:text-3xl font-bold">
            Didn't find the right role?
          </h3>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            We're always looking for kind, curious people who care about Bharat. Tell us what you do
            best — we'll find a way to build something together.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-7 bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white"
          >
            <a href="mailto:careers@mybharatone.com">
              <Mail className="mr-2 h-4 w-4" /> Send us a note
            </a>
          </Button>
        </motion.div>
      </section>

      <ApplyDialog
        open={applyFor !== null}
        onClose={() => setApplyFor(null)}
        job={applyFor}
      />
    </PageShell>
  );
}

function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-5 flex items-start sm:items-center gap-3 hover:bg-muted/40 transition-colors"
      >
        <HelpCircle className="h-4 w-4 text-saffron mt-1 sm:mt-0 shrink-0" />
        <span className="flex-1 font-semibold text-sm sm:text-base">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
