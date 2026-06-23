import { Megaphone } from "lucide-react";

const items = [
  "🎉 Shreerakshe Health Card launched — discounts & lifesaving access for your family",
  "🏦 New: Aadhaar Enabled Payment System (AEPS) & Domestic Money Transfer (DMT)",
  "💳 Micro ATM Services, Bill Payments (BBPS) & Mini Banking now available",
  "✈️ Travel Bookings including IRCTC at every BharatOne center",
  "📞 Contact us: +91 96111 01334",
];

export function HeadlinesMarquee() {
  return (
    <div className="relative bg-gradient-saffron text-primary-foreground overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-4 py-2.5">
        <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-white/30 font-semibold text-xs uppercase tracking-widest">
          <Megaphone className="h-4 w-4 animate-pulse" />
          Headlines
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="marquee whitespace-nowrap text-sm font-medium">
            {[...items, ...items].map((t, i) => (
              <span key={i} className="mx-8 inline-block">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
