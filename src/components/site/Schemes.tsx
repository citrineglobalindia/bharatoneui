import { motion } from "framer-motion";
import { Heart, GraduationCap, Users, ArrowRight, Sparkles, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                <a href="/schemes" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-saffron group-hover:gap-2.5 transition-all">
                  Know more <ArrowRight className="h-3.5 w-3.5" />
                </a>
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
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <Sparkles className="h-10 w-10 text-primary-foreground mx-auto mb-4" />
          <h2 className="text-3xl sm:text-5xl font-bold text-primary-foreground max-w-2xl mx-auto leading-tight">
            Join Us and Start Your Service Center Today!
          </h2>
          <p className="text-primary-foreground/90 mt-4 max-w-xl mx-auto">
            Be the bridge between your community and essential services. Earn while empowering India.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => { window.location.href = "/get-started"; }} className="bg-card text-foreground hover:bg-background shadow-elegant">
              Register for a Center
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { window.location.href = "/contact"; }} className="bg-transparent border-white/40 text-primary-foreground hover:bg-white/10">
              Talk to our team
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Awards() {
  const awards = ["ELEVATE 2025", "Startup Karnataka", "Startup India"];
  return (
    <section className="py-16 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">Awarded & Recognized By</h3>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {awards.map((a, i) => (
            <motion.div
              key={a}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="font-display font-bold text-xl sm:text-2xl text-muted-foreground hover:text-foreground transition-colors"
            >
              {a}
            </motion.div>
          ))}
        </div>
      </div>
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
