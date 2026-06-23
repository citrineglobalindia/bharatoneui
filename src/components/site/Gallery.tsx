import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PLACEHOLDERS: { src?: string; caption: string }[] = [
  { caption: "Service Center Inauguration" },
  { caption: "Citizen Assistance Camp" },
  { caption: "Partner Training Session" },
  { caption: "Awards & Recognition" },
  { caption: "Community Outreach" },
  { caption: "Digital Seva Drive" },
];

export function Gallery({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<{ src?: string; caption: string }[]>(PLACEHOLDERS);
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("gallery_images")
        .select("image_path, caption")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (!on || !data || data.length === 0) return;
      setItems(
        (data as { image_path: string; caption: string | null }[]).map((d) => ({
          src: supabase.storage.from("gallery").getPublicUrl(d.image_path).data.publicUrl,
          caption: d.caption ?? "",
        })),
      );
    })();
    return () => { on = false; };
  }, []);
  return (
    <section id="gallery" className="border-t border-border bg-muted/30 py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        {!embedded && (
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-saffron shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> Gallery
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">Moments from BharatOne</h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              A glimpse of our service centers, citizens served, and milestones across India.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              {it.src ? (
                <img src={it.src} alt={it.caption} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--india-green)]/15 text-muted-foreground">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-xs font-semibold text-white">{it.caption}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
