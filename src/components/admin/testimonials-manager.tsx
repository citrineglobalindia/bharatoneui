import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Quote, Eye, EyeOff, ArrowUp, ArrowDown, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name: string; place: string | null; quote: string; rating: number; initials: string | null; sort_order: number; is_active: boolean };

export function TestimonialsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("testimonials").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) { toast.error("Enter the person's name"); return; }
    if (!quote.trim()) { toast.error("Enter the testimonial text"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("testimonials").insert({
        name: name.trim(), place: place.trim() || null, quote: quote.trim(), rating, sort_order: rows.length,
      });
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Testimonial added");
      setName(""); setPlace(""); setQuote(""); setRating(5);
      load();
    } finally { setBusy(false); }
  };
  const toggle = async (r: Row) => { await supabase.from("testimonials").update({ is_active: !r.is_active }).eq("id", r.id); load(); };
  const remove = async (r: Row) => { if (!confirm("Delete this testimonial?")) return; await supabase.from("testimonials").delete().eq("id", r.id); toast.success("Deleted"); load(); };
  const move = async (r: Row, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.id === r.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("testimonials").update({ sort_order: swap.sort_order }).eq("id", r.id),
      supabase.from("testimonials").update({ sort_order: r.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Quote className="h-4 w-4 text-saffron" /> Add testimonial</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Shows in the "What Our JSKO Has to Say?" section on the homepage.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rajesh Kumar" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Place (optional)</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Tumakuru, Karnataka" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-semibold text-muted-foreground">Testimonial</label>
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={3} placeholder="What the partner said…" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Rating</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
                <Star className={`h-5 w-5 ${n <= rating ? "fill-saffron text-saffron" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <button onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-saffron px-4 h-10 text-sm font-semibold text-white hover:bg-saffron/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add testimonial
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Testimonials ({rows.length})</p>
        {loading ? (
          <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No testimonials yet. The homepage shows default testimonials until you add one.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((r, i) => (
              <div key={r.id} className={`rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-0.5 text-saffron">
                  {Array.from({ length: Math.max(1, Math.min(5, r.rating)) }).map((_, k) => <Star key={k} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{r.quote}</p>
                <p className="mt-2 text-sm font-bold">{r.name} <span className="font-normal text-muted-foreground">· {r.place || "—"}</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => toggle(r)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                    {r.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                  </button>
                  <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
