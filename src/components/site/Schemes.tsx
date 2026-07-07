import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, GraduationCap, Users, ArrowRight, Sparkles, Quote, Star, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const schemes = [
  {
    icon: Heart,
    title: "Shreerakshe Health Card",
    tag: "Featured",
    desc: "Affordable, quality healthcare when you need it most. Exclusive discounts at trusted medical partners and lifesaving access for your entire family.",
    accent: "from-saffron to-saffron-glow",
  },
  {
    icon: GraduationCap,
    title: "Education Welfare",
    tag: "Active",
    desc: "Scholarship applications, school enrollment support, and educational assistance for students from underserved communities.",
    accent: "from-india-green to-india-green-glow",
  },
  {
    icon: Users,
    title: "Cooperative Society",
    tag: "Upcoming",
    desc: "Cooperative society development programs that empower communities and enable local economic growth across India.",
    accent: "from-ashoka to-primary",
  },
];

export function Schemes() {
  return (
    <section id="schemes" className="py-20 sm:py-28 bg-muted/40">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-india-green/10 text-india-green text-xs font-semibold uppercase tracking-wider mb-4">
            Welfare Schemes
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold">
            Schemes that <span className="text-gradient-tricolor">Uplift India</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Welfare-driven programs designed to empower individuals and communities — from healthcare to education and beyond.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {schemes.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative rounded-3xl bg-card border border-border overflow-hidden group hover:shadow-elegant transition-all"
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

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-saffron via-saffron-glow to-india-green p-10 sm:p-16 text-center shadow-elegant"
        >
          <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <Sparkles className="h-10 w-10 text-primary-foreground mx-auto mb-4" />
          <h2 className="text-3xl sm:text-5xl font-bold text-primary-foreground max-w-2xl mx-auto leading-tight">
            Join Us and Start Your Service Center Today!
          </h2>
          <p className="text-primary-foreground/90 mt-4 max-w-xl mx-auto">
            Be the bridge between your community and essential services. Earn while empowering India.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => { window.location.href = "/get-started"; }} className="cursor-pointer bg-card text-foreground hover:bg-background shadow-elegant">
              Register for a Center
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { window.location.href = "/contact"; }} className="cursor-pointer bg-transparent border-white/40 text-primary-foreground hover:bg-white/10">
              Talk to our team
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

type Award = { name: string; logo: string; certificate?: string };

const AWARDS: Award[] = [
  { name: "ELEVATE 2025", logo: "/awards/elevate-2025.png", certificate: "/awards/elevate-2025-certificate.jpg" },
  { name: "Startup Karnataka", logo: "/awards/startup-karnataka.png", certificate: "/awards/startup-karnataka-certificate.jpg" },
  { name: "Government of Karnataka – Dept. of Electronics, IT & BT", logo: "/awards/govt-karnataka-deitbt.png", certificate: "/awards/govt-karnataka-deitbt-certificate.jpg" },
  { name: "KTCC Karnataka Business Awards", logo: "/awards/ktcc.png", certificate: "/awards/ktcc-certificate.jpg" },
];

export function Awards() {
  const [awards, setAwards] = useState<Award[]>(AWARDS);
  const [active, setActive] = useState<Award | null>(null);
  const [zoom, setZoom] = useState(1);

  // Admin-managed awards override the defaults when present.
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("awards")
        .select("name, logo_path, certificate_path")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (!on || !data || data.length === 0) return;
      const url = (p: string) => supabase.storage.from("gallery").getPublicUrl(p).data.publicUrl;
      setAwards(
        (data as { name: string; logo_path: string; certificate_path: string | null }[]).map((d) => ({
          name: d.name,
          logo: url(d.logo_path),
          certificate: d.certificate_path ? url(d.certificate_path) : undefined,
        })),
      );
    })();
    return () => { on = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [active]);

  const open = (a: Award) => { setZoom(1); setActive(a); };

  return (
    <section className="py-16 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">Awarded &amp; Recognized By</h3>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-8 sm:gap-x-16">
          {awards.map((a, i) => (
            <motion.button
              key={a.name}
              type="button"
              onClick={() => open(a)}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              title={`Open ${a.name} certificate`}
              aria-label={`Open ${a.name} certificate`}
              className="group flex h-16 sm:h-20 items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              <img
                src={a.logo}
                alt={a.name}
                loading="lazy"
                className="max-h-full w-auto max-w-[150px] sm:max-w-[180px] object-contain grayscale opacity-80 transition group-hover:grayscale-0 group-hover:opacity-100 group-hover:drop-shadow-md"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const fb = img.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = "block";
                }}
              />
              <span className="hidden font-display font-bold text-base sm:text-lg text-muted-foreground group-hover:text-foreground">{a.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${active.name} certificate`}
        >
          {/* Controls */}
          <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Zoom out"><ZoomOut className="h-5 w-5" /></button>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Zoom in"><ZoomIn className="h-5 w-5" /></button>
            <button onClick={() => setActive(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
          <div className="max-h-[88vh] max-w-[92vw] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.certificate ?? active.logo}
              alt={`${active.name} certificate`}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
              className="mx-auto block max-h-[88vh] w-auto max-w-full rounded-lg shadow-2xl transition-transform"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const fb = img.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
            <div style={{ display: "none" }} className="mx-auto hidden h-64 w-full max-w-md items-center justify-center rounded-lg border border-white/20 bg-white/5 px-6 text-center text-sm font-medium text-white/80">
              The {active.name} certificate image will be available soon.
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-white/90">{active.name}</p>
          </div>
        </div>
      )}
    </section>
  );
}


export function Testimonials() {
  const items = [
    { name: "Rajesh Kumar", place: "Tumakuru, Karnataka", text: "Becoming a JSKO partner changed my shop. I now serve banking, Aadhaar and bill payments for my whole village — income has doubled.", initials: "RK" },
    { name: "Lakshmi Devi", place: "Hassan, Karnataka", text: "The onboarding was simple and the support team is always there. My customers trust BharatOne for government services.", initials: "LD" },
    { name: "Imran Pasha", place: "Kalaburagi, Karnataka", text: "AEPS and money transfer work smoothly even in my small town. The wallet and ledger make daily accounting effortless.", initials: "IP" },
  ];
  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-saffron shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> Testimonials
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">What Our JSKO Has to Say?</h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Real stories from BharatOne service-center partners building their businesses across India.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <Quote className="h-8 w-8 text-saffron/30" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
              <div className="mt-4 flex items-center gap-0.5 text-saffron">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-saffron text-white font-bold">{t.initials}</div>
                <div>
                  <p className="font-bold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.place}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
