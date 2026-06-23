import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import {
  Landmark, FileText, CreditCard, Train, Receipt, Heart,
  GraduationCap, Tractor, Building2, IdCard, Wallet,
  ArrowRight, CheckCircle2, Search,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/citizen-services")({
  component: ServicesPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Services — BharatOne | E-Governance, Banking, BBPS & More" },
      {
        name: "description",
        content:
          "Discover 100+ citizen services at BharatOne — E-Governance, Nadakacheri, AEPS banking, BBPS bill payments, IRCTC travel, insurance, RTO and farmer services.",
      },
      { property: "og:title", content: "BharatOne Services" },
      {
        property: "og:description",
        content:
          "One-stop destination for government documents, banking, bill payments and welfare services across India.",
      },
    ],
  }),
});

const categories = [
  { key: "all", label: "All" },
  { key: "gov", label: "Government" },
  { key: "fin", label: "Banking & Finance" },
  { key: "util", label: "Utilities" },
  { key: "welfare", label: "Welfare" },
];

const services = [
  { icon: Landmark, title: "E-Governance", cat: "gov", desc: "Apply for essential government documents — fast, transparent and citizen-friendly.", features: ["Birth & death certificates", "Khata & land records", "Marriage registration"] },
  { icon: FileText, title: "Nadakacheri Services", cat: "gov", desc: "Caste, income & residential certificates processed by local experts.", features: ["Caste certificate", "Income certificate", "Residence proof"] },
  { icon: IdCard, title: "Aadhaar & PAN", cat: "gov", desc: "Linkage, update and verification services in minutes.", features: ["Aadhaar update", "PAN application", "Aadhaar-PAN link"] },
  { icon: Building2, title: "RTO Services", cat: "gov", desc: "License renewal, vehicle registration, HSRP and more.", features: ["DL renewal", "RC transfer", "HSRP plates"] },
  { icon: CreditCard, title: "Banking & AEPS", cat: "fin", desc: "Aadhaar Enabled Payments, Micro ATM, money transfer and mini banking.", features: ["Cash withdrawal", "Balance check", "Money transfer"] },
  { icon: Wallet, title: "Loans & Finance", cat: "fin", desc: "Personal, business and government scheme-based loans.", features: ["Personal loans", "Mudra loans", "Insurance"] },
  { icon: Receipt, title: "Bill Payments (BBPS)", cat: "util", desc: "Electricity, water, gas, DTH, mobile recharges — all in one place.", features: ["Electricity & water", "Gas & LPG", "Recharges & DTH"] },
  { icon: Train, title: "Travel & IRCTC", cat: "util", desc: "Train, flight and bus bookings at every BharatOne service center.", features: ["IRCTC tickets", "Flight booking", "Bus reservation"] },
  { icon: Heart, title: "Health & Insurance", cat: "welfare", desc: "Shreerakshe Health Card and affordable insurance for your family.", features: ["Health card", "Life insurance", "Health insurance"] },
  { icon: GraduationCap, title: "Education & Scholarships", cat: "welfare", desc: "Apply for NSP scholarships and education welfare schemes.", features: ["NSP portal", "State scholarships", "Admission help"] },
  { icon: Tractor, title: "Farmer Services", cat: "welfare", desc: "Subsidies, FASTag, PM-Kisan and agri-document support.", features: ["PM-Kisan", "Crop insurance", "Soil health card"] },
  { icon: FileText, title: "Online FIR", cat: "gov", desc: "Lodge complaints quickly with assisted FIR registration.", features: ["Assisted filing", "Status tracking", "Document upload"] },
];

function ServicesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = services.filter((s) => {
    const matchCat = cat === "all" || s.cat === cat;
    const matchQ = !q || s.title.toLowerCase().includes(q.toLowerCase()) || s.desc.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <PageShell
      eyebrow="Our Services"
      title={
        <>
          100+ services. <span className="text-gradient-tricolor">One trusted center.</span>
        </>
      }
      subtitle="From government paperwork and banking to welfare schemes and bill payments, our network of centers brings every essential service to your neighbourhood."
      crumbs={[{ label: "Services" }]}
    >
      {/* Search + Filters */}
      <section className="border-b border-border bg-card/40 sticky top-[64px] md:top-[64px] z-30 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search services — Aadhaar, PAN, AEPS…"
              className="pl-9 h-11"
              aria-label="Search services"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`shrink-0 px-3.5 py-2 text-sm rounded-full border transition-colors ${
                  cat === c.key
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No services match your search.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s, i) => (
              <motion.article
                key={s.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: (i % 6) * 0.05 }}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:border-saffron/40 hover:shadow-elegant transition-all overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-saffron/10 group-hover:bg-saffron/20 transition-colors" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-saffron flex items-center justify-center text-primary-foreground shadow-soft mb-4">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-india-green shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron group-hover:gap-2.5 transition-all">
                    Find a center <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-[var(--saffron)] via-[var(--saffron-glow)] to-[var(--india-green)] p-8 sm:p-12 text-center text-white shadow-elegant">
          <h2 className="font-display text-2xl sm:text-4xl font-bold">Don't see what you need?</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">Our centers handle 100+ services. Reach out and we'll guide you to the nearest one.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-card text-foreground hover:bg-background">
              <Link to="/contact">Contact us <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10">
              <Link to="/schemes">View welfare schemes</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
