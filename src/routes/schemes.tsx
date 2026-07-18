import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Heart, GraduationCap, Users, Tractor, Briefcase, Home as HomeIcon,
  ArrowRight, Sparkles, Search, LayoutGrid, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/schemes")({
  component: SchemesPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welfare Schemes — BharatOne | Health, Education & More" },
      {
        name: "description",
        content:
          "Explore welfare schemes powered by BharatOne — Shreerakshe Health Card, education scholarships, cooperative societies, farmer benefits and housing.",
      },
      { property: "og:title", content: "BharatOne Welfare Schemes" },
      {
        property: "og:description",
        content:
          "Welfare-driven programs designed to empower individuals and communities across India.",
      },
    ],
  }),
});

const featured = [
  {
    icon: Heart,
    title: "Shreerakshe Health Card",
    tag: "Featured",
    desc: "Affordable, quality healthcare when you need it most. Exclusive discounts at trusted medical partners and lifesaving access for your entire family.",
    accent: "from-[var(--saffron)] to-[var(--saffron-glow)]",
    benefits: ["Cashless network", "Family coverage", "OPD discounts"],
    cat: "Health",
  },
  {
    icon: GraduationCap,
    title: "Education Welfare",
    tag: "Active",
    desc: "Scholarship applications, school enrollment support and educational assistance for students from underserved communities.",
    accent: "from-[var(--india-green)] to-[var(--india-green-glow)]",
    benefits: ["NSP scholarships", "Fee assistance", "Admission help"],
    cat: "Education",
  },
  {
    icon: Users,
    title: "Cooperative Society",
    tag: "Upcoming",
    desc: "Cooperative society development programs that empower communities and enable local economic growth across India.",
    accent: "from-[var(--ashoka)] to-primary",
    benefits: ["Group savings", "Micro-credit", "Skill training"],
    cat: "Community",
  },
];

const more = [
  { icon: Tractor, title: "PM-Kisan & Agri", desc: "Direct benefit transfers, crop insurance and farmer welfare.", cat: "Agriculture", tag: "Active" },
  { icon: HomeIcon, title: "PM Awas Yojana", desc: "Affordable housing assistance for eligible families.", cat: "Housing", tag: "Active" },
  { icon: Briefcase, title: "Skill India", desc: "Skilling and employment programs for youth across Bharat.", cat: "Employment", tag: "Upcoming" },
];

const SCHEME_CATEGORIES = ["Health", "Education", "Community", "Agriculture", "Housing", "Employment"];
const SCHEME_STATUSES = ["Featured", "Active", "Upcoming"];

function SchemesPage() {
  // CR-146 — search + category + status filters.
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");

  const match = (s: { title: string; desc: string; cat: string; tag: string }) => {
    const needle = q.trim().toLowerCase();
    const matchQ =
      !needle ||
      s.title.toLowerCase().includes(needle) ||
      s.desc.toLowerCase().includes(needle) ||
      s.cat.toLowerCase().includes(needle);
    return matchQ && (cat === "all" || s.cat === cat) && (status === "all" || s.tag === status);
  };

  const featuredShown = featured.filter(match);
  const moreShown = more.filter(match);
  const nothing = featuredShown.length === 0 && moreShown.length === 0;

  return (
    <PageShell
      centered
      eyebrow="Welfare Schemes"
      title={
        <>
          Schemes that <span className="text-gradient-tricolor">uplift Bharat</span>.
        </>
      }
      subtitle="Welfare-driven programs designed to empower individuals and communities — from healthcare and education to housing and livelihoods."
      crumbs={[{ label: "Schemes" }]}
      accent="green"
    >
      {/* CR-146 — search & filter bar */}
      <section className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search schemes by name, category, or keyword…"
                aria-label="Search schemes"
                className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                aria-label="Filter by category"
                className="h-11 w-full appearance-none rounded-lg border border-border bg-background pl-9 pr-9 text-sm font-medium sm:w-auto"
              >
                <option value="all">All Categories</option>
                {SCHEME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="h-11 w-full appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm font-medium sm:w-auto"
              >
                <option value="all">All Status</option>
                {SCHEME_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {(q || cat !== "all" || status !== "all") && (
              <button
                onClick={() => { setQ(""); setCat("all"); setStatus("all"); }}
                className="h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        {nothing && (
          <p className="py-10 text-center text-muted-foreground">No schemes match your search.</p>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          {featuredShown.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-3xl bg-card border border-border overflow-hidden hover:shadow-elegant transition-all"
            >
              <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${s.accent} opacity-90`} />
              <div className="relative p-6 pt-20">
                <div className="absolute top-6 left-6 h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-elegant flex items-center justify-center">
                  <s.icon className="h-7 w-7 text-foreground" />
                </div>
                <div className="absolute top-6 right-6 text-[10px] uppercase tracking-widest bg-card/90 backdrop-blur px-2.5 py-1 rounded-full font-semibold">
                  {s.tag}
                </div>
                <h3 className="font-display font-semibold text-xl mt-4">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{s.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.benefits.map((b) => (
                    <li key={b} className="text-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
                      {b}
                    </li>
                  ))}
                </ul>
                <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-saffron hover:gap-2.5 transition-all">
                  Know more <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* More schemes */}
      <section className={`bg-muted/40 border-y border-border ${moreShown.length === 0 ? "hidden" : ""}`}>
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">More schemes we facilitate</h2>
            <p className="text-muted-foreground mt-3">Central & state welfare programs accessible at every BharatOne center.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {moreShown.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6 hover:border-india-green/40 hover:shadow-soft transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-india-green/10 text-india-green flex items-center justify-center mb-3">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility / How to apply */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">How to apply</h2>
          <p className="text-muted-foreground mt-3 text-center">Three simple steps to enroll in any welfare scheme at your nearest BharatOne center.</p>

          <ol className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { n: "01", t: "Visit a center", d: "Locate your nearest BharatOne center and walk in with your documents." },
              { n: "02", t: "Get assisted", d: "Our trained operator verifies eligibility and submits the application." },
              { n: "03", t: "Track approval", d: "Receive SMS updates and collect benefits directly through the scheme." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-mono text-saffron">{s.n}</div>
                <div className="font-display font-semibold text-lg mt-1">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-3xl bg-gradient-to-br from-[var(--india-green)] to-[var(--saffron)] p-8 text-white text-center shadow-elegant">
            <Sparkles className="h-8 w-8 mx-auto mb-3" />
            <h3 className="font-display text-2xl font-bold">Need help choosing a scheme?</h3>
            <p className="mt-2 text-white/90">Our team will guide you to the right welfare programs for your family.</p>
            <Button asChild size="lg" className="mt-5 bg-card text-foreground hover:bg-background">
              <Link to="/contact">Talk to us <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
