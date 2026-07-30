import { createFileRoute } from "@tanstack/react-router";
import { VisitorTracker } from "@/components/site/VisitorTracker";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/site/Navbar";
import { HeadlinesMarquee } from "@/components/site/HeadlinesMarquee";
import { Hero, Stats } from "@/components/site/Hero";
// <Services /> is no longer rendered on the homepage — see the comment in the JSX below.
// The module is still needed for its `slugify` export, used by /citizen-services.
import { Schemes, LiveStats, CTA, Awards, Testimonials } from "@/components/site/Schemes";
import { Footer } from "@/components/site/Footer";
import { Chatbot } from "@/components/site/Chatbot";
import { Loader } from "@/components/site/Loader";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
  head: () => ({
    meta: [
      { title: "BharatOne — Empowering Indian Citizens with Easy Access to Services" },
      {
        name: "description",
        content:
          "BharatOne brings government, banking, schemes, and welfare services to your neighbourhood through 1,000+ service centers across India.",
      },
      { property: "og:title", content: "BharatOne — Services for Every Indian Citizen" },
      {
        property: "og:description",
        content:
          "Government paperwork, AEPS banking, bill payments, IRCTC, Shreerakshe Health Card and more — all at your nearest BharatOne center.",
      },
    ],
  }),
});

function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background"><VisitorTracker />
      <AnimatePresence>{loading && <Loader />}</AnimatePresence>
      <Navbar />
      <main className="pt-[64px] md:pt-[112px]">
        <HeadlinesMarquee />
        <Hero />
        <Stats />
        {/* The "Essential Services for Every Citizen" grid was removed from the
            homepage on 30 Jul 2026. The full catalogue still lives at
            /citizen-services; drop <Services /> back in here to restore it. */}
        <Schemes />
        <LiveStats />
        <CTA />
        <Awards />
        <Testimonials />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
