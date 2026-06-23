import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import {
  Menu,
  X,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  Search,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  HeartPulse,
  Banknote,
  Tractor,
  Briefcase,
  Users,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/bharatone-logo.png";

type NavLink = {
  label: string;
  to: string;
  mega?: { icon: typeof ShieldCheck; title: string; desc: string; to: string }[];
};

const links: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Gallery", to: "/gallery" },
  {
    label: "Services",
    to: "/citizen-services",
    mega: [
      { icon: ShieldCheck, title: "Aadhaar & PAN", desc: "Enrolment, updates & linking", to: "/citizen-services" },
      { icon: HeartPulse, title: "Ayushman Bharat", desc: "Health card & insurance", to: "/citizen-services" },
      { icon: GraduationCap, title: "Education", desc: "Scholarships & admissions", to: "/citizen-services" },
      { icon: Banknote, title: "Banking & DBT", desc: "Jan Dhan, pensions, subsidies", to: "/citizen-services" },
      { icon: Tractor, title: "Farmer Services", desc: "PM-KISAN, crop insurance", to: "/citizen-services" },
      { icon: Briefcase, title: "Employment", desc: "Skill India, MGNREGA, jobs", to: "/careers" },
    ],
  },
  {
    label: "Schemes",
    to: "/schemes",
    mega: [
      { icon: Users, title: "Welfare Schemes", desc: "Central & state benefits", to: "/schemes" },
      { icon: FileText, title: "Certificates", desc: "Income, caste, domicile", to: "/citizen-services" },
      { icon: Sparkles, title: "New Launches", desc: "Latest govt. programs", to: "/schemes" },
    ],
  },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: "/contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === "/" ? "/" : "/" + pathname.split("/").filter(Boolean)[0];

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.2 });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 20);
    setHidden(latest > prev && latest > 200 && !open && !openMega);
  });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Top utility bar */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: hidden || scrolled ? -40 : 0, opacity: hidden || scrolled ? 0 : 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-[60] hidden md:block"
      >
        <div className="bg-foreground text-background/90 text-xs">
          <div className="container mx-auto px-6 flex items-center justify-between h-9">
            <div className="flex items-center gap-5">
              <a href="tel:+919611100712" className="flex items-center gap-1.5 hover:text-[var(--saffron-glow)] transition-colors">
                <Phone className="h-3 w-3" /> +91 96111 00712
              </a>
              <a href="mailto:info@mybharatone.com" className="flex items-center gap-1.5 hover:text-[var(--saffron-glow)] transition-colors">
                <Mail className="h-3 w-3" /> info@mybharatone.com
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 hover:text-[var(--saffron-glow)] transition-colors">
                <Globe className="h-3 w-3" /> EN / हिं
              </button>
              <span className="h-3 w-px bg-background/30" />
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--india-green-glow)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--india-green-glow)]" />
                </span>
                Helpdesk Online
              </span>
            </div>
          </div>
          <div className="h-[2px] w-full bg-gradient-to-r from-[var(--saffron)] via-white to-[var(--india-green)]" />
        </div>
      </motion.div>

      {/* Main header */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: hidden ? -120 : 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 z-50 transition-all duration-300 [padding-top:env(safe-area-inset-top)] [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)] ${
          scrolled
            ? "top-0 glass border-b border-border/60 shadow-soft py-2"
            : "top-0 md:top-[38px] bg-background/95 md:bg-transparent backdrop-blur md:backdrop-blur-0 border-b border-border/40 md:border-0 py-2.5 md:py-3"
        }`}
        onMouseLeave={() => setOpenMega(null)}
      >
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo */}
          <Link
            to="/"
            aria-label="BharatOne — Home"
            className="flex items-center gap-2.5 group shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--saffron)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <motion.div
              whileHover={{ rotate: -3 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="absolute -inset-2 bg-gradient-to-tr from-[var(--saffron)]/30 to-[var(--india-green)]/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src={logo} alt="" aria-hidden="true" className="relative h-9 sm:h-11 w-auto" />
            </motion.div>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-1 relative"
            onMouseLeave={() => setHovered(null)}
          >
            {links.map((l) => {
              const isActive = active === l.to;
              const isHover = hovered === l.label;
              return (
                <div
                  key={l.label}
                  className="relative"
                  onMouseEnter={() => {
                    setHovered(l.label);
                    setOpenMega(l.mega ? l.label : null);
                  }}
                >
                  <Link
                    to={l.to}
                    className="relative px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1 transition-colors text-foreground/75 hover:text-foreground"
                  >
                    {isHover && (
                      <motion.span
                        layoutId="nav-hover"
                        className="absolute inset-0 bg-muted rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={isActive ? "text-foreground" : ""}>{l.label}</span>
                    {l.mega && <ChevronDown className="h-3 w-3 opacity-60" />}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
            <button onClick={() => { window.location.href = "/login"; }} className="hidden md:inline-flex items-center h-10 px-4 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              Login
            </button>
            <Button onClick={() => { window.location.href = "/get-started"; }} className="hidden md:inline-flex relative overflow-hidden bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white shadow-soft hover:shadow-glow transition-shadow group">
              <span className="relative z-10 flex items-center gap-1.5">
                Register Center <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </Button>

            <button
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted relative z-[70] outline-none focus-visible:ring-2 focus-visible:ring-[var(--saffron)] focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-drawer"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? "x" : "m"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                  aria-hidden="true"
                >
                  {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {openMega &&
            (() => {
              const link = links.find((l) => l.label === openMega);
              if (!link?.mega) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[min(900px,92vw)] hidden lg:block"
                >
                  <div className="glass rounded-2xl border border-border/60 shadow-elegant p-6 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {link.mega.map((m) => (
                      <Link
                        key={m.title}
                        to={m.to}
                        onClick={() => setOpenMega(null)}
                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/70 transition-colors"
                      >
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 flex items-center justify-center text-[var(--saffron)] group-hover:scale-110 transition-transform">
                          <m.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{m.title}</div>
                          <div className="text-xs text-muted-foreground">{m.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
        </AnimatePresence>

        {/* Scroll progress */}
        <motion.div
          style={{ scaleX: progress }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-[var(--saffron)] via-white to-[var(--india-green)]"
        />
      </motion.header>


      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[65] lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
            />

            {/* Drawer panel */}
            <motion.aside
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 500) setOpen(false);
              }}
              className="absolute top-0 right-0 h-dvh w-[85%] max-w-sm bg-background shadow-elegant flex flex-col overflow-hidden [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)] [padding-right:env(safe-area-inset-right)]"
            >
              {/* Tricolor accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--saffron)] via-white to-[var(--india-green)]" />
              {/* Ambient glow */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[var(--saffron)]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[var(--india-green)]/20 blur-3xl" />

              {/* Drawer header */}
              <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <img src={logo} alt="BharatOne" className="h-9 w-auto" />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="relative flex-1 overflow-y-auto px-6 py-5">
                <motion.nav
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
                  }}
                  className="flex flex-col"
                >
                  {links.map((l, i) => {
                    const isActive = active === l.to;
                    return (
                      <motion.div
                        key={l.label}
                        variants={{
                          hidden: { x: 30, opacity: 0 },
                          show: { x: 0, opacity: 1 },
                        }}
                      >
                        <Link
                          to={l.to}
                          onClick={() => setOpen(false)}
                          className={`group flex items-center justify-between py-4 border-b border-border/50 transition-colors ${
                            isActive ? "text-foreground" : "text-foreground/85"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-muted-foreground w-6">
                              0{i + 1}
                            </span>
                            <span className="text-xl font-display font-semibold">
                              {l.label}
                            </span>
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)]" />
                            )}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>
              </div>

              {/* Drawer footer */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative border-t border-border/60 px-6 py-5 space-y-3 bg-background/80 backdrop-blur"
              >
                <Button
                  variant="outline"
                  onClick={() => { setOpen(false); window.location.href = "/login"; }}
                  className="w-full h-11 border-2"
                >
                  Login
                </Button>
                <Button
                  onClick={() => { setOpen(false); window.location.href = "/get-started"; }}
                  className="w-full h-11 bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white shadow-soft"
                >
                  Register Your Center <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <a
                    href="tel:+919611100712"
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-[var(--saffron)]" /> Call
                  </a>
                  <a
                    href="mailto:info@mybharatone.com"
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-[var(--india-green)]" /> Email
                  </a>
                </div>
              </motion.div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
