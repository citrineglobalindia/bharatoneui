import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-citizens.jpg";

export function Hero() {
  return (
    <section id="home" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-hero">
      {/* decorative tricolor blobs */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-saffron/20 blur-3xl animate-float"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-india-green/20 blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />

      <div className="container mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center relative">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-soft text-xs font-medium mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-saffron" />
            Trusted by 1,000+ service centers across India
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]"
          >
            Empowering{" "}
            <span className="text-gradient-tricolor">Indian Citizens</span>
            <br />
            with Easy Access to Services
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
          >
            From government paperwork to banking, loans, and welfare schemes — BharatOne brings
            essential services to your neighbourhood. Join our growing network and help bring
            life-changing services closer to millions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <Button size="lg" onClick={() => { window.location.href = "/get-started"; }} className="bg-gradient-saffron text-primary-foreground shadow-soft hover:shadow-glow transition-shadow group">
              Register Your Center
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="border-2">
              Explore Services
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-10 flex flex-wrap gap-6 text-sm"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-india-green" />
              <span className="text-muted-foreground">Govt. Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-saffron" />
              <span className="text-muted-foreground">Fast Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ashoka" />
              <span className="text-muted-foreground">100+ Services</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-saffron/30 to-india-green/30 blur-2xl -z-10" />
          <div className="relative rounded-3xl overflow-hidden shadow-elegant border-4 border-card">
            <img
              src={heroImg}
              alt="Indian citizens using BharatOne digital services on mobile"
              width={1280}
              height={960}
              className="w-full h-auto"
            />
          </div>

          {/* floating cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -left-3 sm:-left-8 top-1/4 glass border border-border rounded-2xl px-4 py-3 shadow-elegant hidden sm:block"
          >
            <div className="text-xs text-muted-foreground">Active Centers</div>
            <div className="font-display font-bold text-2xl text-saffron">1,000+</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="absolute -right-3 sm:-right-8 bottom-10 glass border border-border rounded-2xl px-4 py-3 shadow-elegant hidden sm:block"
          >
            <div className="text-xs text-muted-foreground">Citizens Served</div>
            <div className="font-display font-bold text-2xl text-india-green">10L+</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Counter({ to, suffix = "+" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{n.toLocaleString("en-IN")}{suffix}</span>;
}

export function Stats() {
  const stats = [
    { value: 1000, label: "Service Centers", suffix: "+" },
    { value: 100, label: "Services Offered", suffix: "+" },
    { value: 50, label: "Active & Upcoming Schemes", suffix: "+" },
    { value: 28, label: "States Reached", suffix: "" },
  ];
  return (
    <section className="py-16 sm:py-20 bg-card border-y border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">Trusted by Thousands</h2>
          <p className="text-muted-foreground mt-2">Built for Indian citizens, one center at a time.</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-background border border-border hover:shadow-soft hover:border-saffron/40 transition-all"
            >
              <div className="text-4xl sm:text-5xl font-display font-bold text-gradient-tricolor">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
