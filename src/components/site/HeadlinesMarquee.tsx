import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EMPTY_MESSAGE = "📢 There are no notifications from BharatOne right now.";

// Turn any http(s) URL inside a headline into a clickable link.
function renderWithLinks(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline underline-offset-2 font-semibold hover:opacity-80"
      >
        {part.replace(/[.,)]+$/, "")}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function HeadlinesMarquee() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("headlines")
        .select("text")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (!on) return;
      setItems(((data as { text: string }[] | null) ?? []).map((d) => d.text));
    })();
    return () => { on = false; };
  }, []);

  // Admin-added headlines when present; otherwise a friendly "no notifications" note.
  const display = items.length ? items : [EMPTY_MESSAGE];

  return (
    <div className="relative bg-gradient-saffron text-primary-foreground overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-4 py-2.5">
        <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-white/30 font-semibold text-xs uppercase tracking-widest">
          <Megaphone className="h-4 w-4 animate-pulse" />
          Headlines
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="marquee whitespace-nowrap text-sm font-medium">
            {[...display, ...display].map((t, i) => (
              <span key={i} className="mx-8 inline-block shrink-0">
                {renderWithLinks(t)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
