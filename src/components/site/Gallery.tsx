import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, X, ChevronLeft, ChevronRight, Play, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MediaType = "image" | "video";
type Item = { src?: string; caption: string; type: MediaType };

const PLACEHOLDERS: Item[] = [
  { caption: "Service Center Inauguration", type: "image" },
  { caption: "Citizen Assistance Camp", type: "image" },
  { caption: "Partner Training Session", type: "image" },
  { caption: "Awards & Recognition", type: "image" },
  { caption: "Community Outreach", type: "image" },
  { caption: "Digital Seva Drive", type: "image" },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function Gallery({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<Item[]>(PLACEHOLDERS);
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number }>({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

  // Only items that actually have a src are openable in the lightbox.
  const openable = items.map((it, i) => ({ ...it, i })).filter((it) => !!it.src);
  const openImage = (i: number) => { if (items[i]?.src) setOpen(i); };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const step = (dir: 1 | -1) => {
    if (open === null || openable.length === 0) return;
    const pos = openable.findIndex((o) => o.i === open);
    const next = openable[(pos + dir + openable.length) % openable.length];
    setOpen(next.i);
    resetView();
  };
  const isVideo = open !== null && items[open]?.type === "video";
  const zoomBy = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

  // Reset zoom/pan whenever a new item opens.
  useEffect(() => { resetView(); }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.5);
      else if (e.key === "-" || e.key === "_") zoomBy(-0.5);
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
        .select("image_path, caption, media_type")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (!on || !data || data.length === 0) return;
      setItems(
        (data as { image_path: string; caption: string | null; media_type: string | null }[]).map((d) => ({
          src: supabase.storage.from("gallery").getPublicUrl(d.image_path).data.publicUrl,
          caption: d.caption ?? "",
          type: (d.media_type === "video" ? "video" : "image") as MediaType,
        })),
      );
    })();
    return () => { on = false; };
  }, []);

  // Wheel = zoom images in the lightbox.
  const onWheel = (e: React.WheelEvent) => {
    if (isVideo) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.3 : -0.3);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1 || isVideo) return;
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) });
  };
  const onPointerUp = () => { drag.current.active = false; };

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
                it.type === "video" ? (
                  <>
                    <video src={it.src} muted playsInline preload="metadata" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 translate-x-0.5" />
                      </span>
                    </span>
                  </>
                ) : (
                  <img src={it.src} alt={it.caption} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )
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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-0 backdrop-blur-sm"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={items[open].caption || "Gallery item"}
        >
          <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>

          {!isVideo && (
            <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/15 px-1.5 py-1 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => zoomBy(-0.5)} aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/20 disabled:opacity-40"><ZoomOut className="h-5 w-5" /></button>
              <span className="min-w-[3rem] text-center text-xs font-semibold text-white">{Math.round(zoom * 100)}%</span>
              <button onClick={() => zoomBy(0.5)} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/20 disabled:opacity-40"><ZoomIn className="h-5 w-5" /></button>
            </div>
          )}

          {openable.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
            </>
          )}

          <figure onClick={(e) => e.stopPropagation()} className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {isVideo ? (
              <video src={items[open].src} controls autoPlay playsInline className="max-h-[92vh] max-w-[96vw] shadow-2xl" />
            ) : (
              <img
                src={items[open].src}
                alt={items[open].caption}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={() => (zoom > 1 ? resetView() : setZoom(2))}
                draggable={false}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in", touchAction: "none" }}
                className="max-h-[100vh] max-w-[100vw] w-auto select-none object-contain shadow-2xl transition-transform duration-100"
              />
            )}
            {items[open].caption && <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-center text-sm font-semibold text-white/90">{items[open].caption}</figcaption>}
          </figure>
        </div>
      )}
    </section>
  );
}
