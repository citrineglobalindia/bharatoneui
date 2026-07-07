import { useEffect, useState } from "react";
import { Megaphone, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Notice = { id: string; message: string; link_url: string | null };

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const isUrl = (s: string) => /^(https?:\/\/|www\.)/i.test(s);
const href = (s: string) => (s.startsWith("http") ? s : `https://${s}`);

// Render a message, turning any inline URLs into clickable links.
function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    isUrl(part) ? (
      <a key={i} href={href(part)} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2 hover:text-white">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [active, setActive] = useState<Notice | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("notice_board")
        .select("id,message,link_url")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (on) setNotices((data as Notice[]) ?? []);
    })();
    return () => {
      on = false;
    };
  }, []);

  if (notices.length === 0) return null;

  const seq = [...notices, ...notices];

  return (
    <div className="nb-bar relative flex items-stretch overflow-hidden rounded-xl bg-saffron-gradient text-white shadow-soft">
      <style>{`
        @keyframes nb-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .nb-track { animation: nb-scroll 36s linear infinite; }
        .nb-bar:hover .nb-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .nb-track { animation: none; } }
      `}</style>
      <div className="z-10 flex shrink-0 items-center gap-1.5 bg-black/15 px-3 text-[11px] font-bold uppercase tracking-wide">
        <Megaphone className="h-4 w-4" /> Notice
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="nb-track flex w-max gap-12 whitespace-nowrap py-2 pl-6 text-sm">
          {seq.map((n, i) => (
            <span key={`${n.id}-${i}`} className="flex items-center gap-12">
              <button type="button" onClick={() => setActive(n)} title="Click to read full notice" className="font-medium underline-offset-2 hover:underline cursor-pointer">
                {n.message}
              </button>
              <span aria-hidden className="text-white/60">●</span>
            </span>
          ))}
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card text-foreground shadow-elev" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-india-green"><Megaphone className="h-4 w-4" /> Notice from BharatOne</p>
              <button type="button" onClick={() => setActive(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{linkify(active.message)}</p>
              {active.link_url && (
                <a href={href(active.link_url)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 h-9 text-sm font-semibold text-white hover:opacity-90">
                  <ExternalLink className="h-4 w-4" /> Open link
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
