import { motion } from "framer-motion";
import {
  Landmark, FileText, CreditCard, Train, Receipt, Heart,
  GraduationCap, Tractor, ArrowRight, Building2, IdCard, Wallet,
} from "lucide-react";

// Shared with /citizen-services so "View Details" scrolls to the matching card.
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const services = [
  { icon: Landmark, title: "E-Governance", desc: "Apply for essential government documents fast, transparent, and citizen-friendly." },
  { icon: FileText, title: "Nadakacheri Services", desc: "Caste, income & residential certificates processed by local experts." },
  { icon: CreditCard, title: "Banking & AEPS", desc: "Aadhaar Enabled Payments, Micro ATM, Money Transfer & mini banking." },
  { icon: Receipt, title: "Bill Payments (BBPS)", desc: "Electricity, water, gas, DTH, mobile recharges — all in one place." },
  { icon: Train, title: "Travel & IRCTC", desc: "Train, flight & bus bookings at every BharatOne service center." },
  { icon: Heart, title: "Health & Insurance", desc: "Shreerakshe Health Card and affordable insurance for your family." },
  { icon: GraduationCap, title: "Education & Scholarships", desc: "Apply for NSP scholarships and education welfare schemes." },
  { icon: Tractor, title: "Farmer Services", desc: "Subsidies, FASTag, PM-Kisan, and agri-document support." },
  { icon: IdCard, title: "Aadhaar & PAN", desc: "Linkage, update, and verification services in minutes." },
  { icon: Building2, title: "RTO Services", desc: "License renewal, vehicle registration, HSRP and more." },
  { icon: Wallet, title: "Loans & Finance", desc: "Personal, business, and government scheme-based loans." },
  { icon: FileText, title: "Online FIR", desc: "Lodge complaints quickly with assisted FIR registration." },
];

export function Services() {
  return (
    <section id="services" className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron/10 text-saffron text-xs font-semibold uppercase tracking-wider mb-4">
            Our Services
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold leading-tight">
            Essential Services for <span className="text-gradient-tricolor">Every Citizen</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            From government applications to banking — our centers are equipped to guide and assist citizens every step.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: (i % 6) * 0.06 }}
              whileHover={{ y: -6 }}
              className="group relative p-4 sm:p-6 rounded-2xl bg-card border border-border hover:border-saffron/40 hover:shadow-elegant transition-all overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-saffron/10 group-hover:bg-saffron/20 transition-colors" />
              <div className="relative">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-saffron flex items-center justify-center text-primary-foreground shadow-soft mb-3 sm:mb-4">
                  <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="font-display font-semibold text-sm sm:text-lg mb-1 sm:mb-1.5">{s.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                <a
                  href={`/citizen-services#${slugify(s.title)}`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-saffron/40 px-3 py-1.5 text-xs sm:text-sm font-semibold text-saffron hover:bg-saffron hover:text-primary-foreground transition-colors"
                >
                  View Details <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
