import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [open, setOpen] = useState<number | null>(null);

  // Only images that actually have a src are openable in the lightbox.
  const openable = items.map((it, i) => ({ ...it, i })).filter((it) => !!it.src);
  const openImage = (i: number) => { if (items[i]?.src) setOpen(i); };
  const step = (dir: 1 | -1) => {
    if (open === null || openable.length === 0) return;
    const pos = openable.findIndex((o) => o.i === open);
    const next = openable[(pos + dir + openable.length) % openable.length];
    setOpen(next.i);
  };

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items]);

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
              onClick={() => openImage(i)}
              className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-soft ${it.src ? "cursor-pointer" : ""}`}
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

      {open !== null && items[open]?.src && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-2 sm:p-3 backdrop-blur-sm"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={items[open].caption || "Gallery image"}
        >
          <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
          {openable.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          <figure onClick={(e) => e.stopPropagation()} className="flex max-h-[98vh] max-w-[98vw] flex-col items-center">
            <img src={items[open].src} alt={items[open].caption} className="max-h-[92vh] w-auto max-w-[98vw] rounded-lg object-contain shadow-2xl" />
            {items[open].caption && <figcaption className="mt-2 text-center text-sm font-semibold text-white/90">{items[open].caption}</figcaption>}
          </figure>
        </div>
      )}
    </section>
  );
}
