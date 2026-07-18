import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, X, ChevronLeft, ChevronRight, Play, ZoomIn, ZoomOut, ChevronDown, LayoutGrid, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MediaType = "image" | "video";
type Item = { src?: string; caption: string; type: MediaType; category: string; date: string | null };

const PLACEHOLDERS: Item[] = [
  { caption: "Service Center Inauguration", type: "image", category: "Events", date: null },
  { caption: "Citizen Assistance Camp", type: "image", category: "Community", date: null },
  { caption: "Partner Training Session", type: "image", category: "Service Centers", date: null },
  { caption: "Awards & Recognition", type: "image", category: "Awards", date: null },
  { caption: "Community Outreach", type: "image", category: "Community", date: null },
  { caption: "Digital Seva Drive", type: "image", category: "Events", date: null },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const PAGE = 10;
const UNCATEGORISED = "Uncategorised";

export function Gallery({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<Item[]>(PLACEHOLDERS);
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<"latest" | "oldest" | "az">("latest");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number }>({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

  // Only items that actually have a src are openable in the lightbox.
  const openable = items.map((it, i) => ({ ...it, i })).filter((it) => !!it.src);

  // CR-143 — category list, filtering and sorting. Indices stay tied to `items`
  // so the lightbox keeps working regardless of the active filter.
  const categories = useMemo(
    () => Array.from(new Set(items.map((it) => it.category))).filter(Boolean).sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const rows = items.map((it, i) => ({ it, i })).filter(({ it }) => cat === "All" || it.category === cat);
    const time = (v: string | null) => (v ? new Date(v).getTime() : 0);
    if (sort === "az") rows.sort((a, b) => a.it.caption.localeCompare(b.it.caption));
    else if (sort === "oldest") rows.sort((a, b) => time(a.it.date) - time(b.it.date));
    else rows.sort((a, b) => time(b.it.date) - time(a.it.date));
    return rows;
  }, [items, cat, sort]);
  const visible = filtered.slice(0, shown);
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
        .select("image_path, caption, media_type, category, created_at")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (!on || !data || data.length === 0) return;
      setItems(
        (data as { image_path: string; caption: string | null; media_type: string | null; category: string | null; created_at: string | null }[]).map((d) => ({
          src: supabase.storage.from("gallery").getPublicUrl(d.image_path).data.publicUrl,
          caption: d.caption ?? "",
          type: (d.media_type === "video" ? "video" : "image") as MediaType,
          category: (d.category ?? "").trim() || UNCATEGORISED,
          date: d.created_at,
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
        {/* CR-143 — category filter + sort */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={cat}
                onChange={(e) => { setCat(e.target.value); setShown(PAGE); }}
                className="h-10 appearance-none rounded-lg border border-border bg-background pl-9 pr-9 text-sm font-medium"
                aria-label="Filter by category"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {["All", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => { setCat(c); setShown(PAGE); }}
                className={`h-10 rounded-lg px-3.5 text-sm font-semibold transition ${
                  cat === c ? "bg-saffron text-white shadow-soft" : "border border-border bg-background hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Sort by:</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm font-medium"
              aria-label="Sort gallery"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A – Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map(({ it, i }, n) => (
            <motion.div
              key={`${i}-${it.caption}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (n % 10) * 0.05 }}
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
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-xs font-semibold text-white">{it.caption}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/75">
                    {it.date ? new Date(it.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : it.category}
                  </span>
                  {it.type === "video"
                    ? <Video className="h-3.5 w-3.5 text-saffron" />
                    : <ImageIcon className="h-3.5 w-3.5 text-saffron" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No items in this category yet.</p>
        )}

        {shown < filtered.length && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShown((s) => s + PAGE)}
              className="inline-flex items-center gap-2 rounded-xl border border-saffron/50 bg-saffron/5 px-6 h-11 text-sm font-semibold text-saffron hover:bg-saffron hover:text-white transition-colors"
            >
              Load More <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
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
