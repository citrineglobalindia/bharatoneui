import { useState } from "react";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Read-only star row — shown wherever a rated ticket appears. */
export function Stars({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-${size} w-${size} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

/**
 * The raiser's one-shot verdict on a resolved ticket. Interactive until
 * submitted; the RPC enforces raiser-only, resolved-only, once-only.
 */
export function RateTicket({ ticketId, onRated }: { ticketId: string; onRated?: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!picked) return toast.error("Tap a star first");
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("rate_support_ticket", {
        p_id: ticketId, p_rating: picked, p_comment: comment.trim() || null,
      });
      if (error) return toast.error("Could not save rating", { description: error.message });
      toast.success("Thank you for the rating!");
      onRated?.(picked);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-bold">How was the help you received?</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setPicked(i)}
            aria-label={`${i} star${i === 1 ? "" : "s"}`}>
            <Star className={`h-7 w-7 transition ${(hover || picked) >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
          </button>
        ))}
        {picked > 0 && <span className="ml-1 text-xs font-semibold text-muted-foreground">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][picked]}</span>}
      </div>
      <input
        className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none"
        placeholder="Anything to add? (optional)"
        maxLength={300}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={busy || !picked} className="mt-2 bg-amber-500 text-white hover:bg-amber-600">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />} Submit rating
      </Button>
      <p className="mt-1.5 text-[10px] text-muted-foreground">A rating is final — it cannot be changed later.</p>
    </div>
  );
}

/** Rating + comment as a compact display block. */
export function RatingBadge({ rating, comment, ratedAt }: { rating: number; comment?: string | null; ratedAt?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <Stars rating={rating} />
        <span className="text-xs font-bold">{rating}/5</span>
        {ratedAt && <span className="text-[10px] text-muted-foreground">· {new Date(ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>}
      </div>
      {comment && <p className="mt-1 text-xs text-muted-foreground">“{comment}”</p>}
    </div>
  );
}
