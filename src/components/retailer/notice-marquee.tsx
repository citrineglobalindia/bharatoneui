import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
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

function NoticeItem({ n }: { n: Notice }) {
  if (n.link_url) {
    return (
      <a href={href(n.link_url)} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline">
        {n.message}
      </a>
    );
  }
  return <span className="font-medium">{linkify(n.message)}</span>;
}

export function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);

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
              <NoticeItem n={n} />
              <span aria-hidden className="text-white/60">●</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
