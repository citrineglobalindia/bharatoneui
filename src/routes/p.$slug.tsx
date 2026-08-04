import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, FileText, Calendar } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$slug")({
  component: DynamicPage,
  ssr: false,
});

type PageData = { slug: string; title: string; subtitle: string | null; content: string; meta_description: string | null; updated_at: string };

/** Renders a very small subset of markdown: ## headings, - bullets, paragraphs. */
function render(content: string) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`u${k}`} className="mb-4 space-y-1.5 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground/85">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-india-green" />
            <span>{b}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  content.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(i); return; }
    if (line.startsWith("## ")) {
      flush(i);
      blocks.push(<h2 key={i} className="mb-2 mt-7 font-display text-xl font-bold text-foreground sm:text-2xl">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flush(i);
      blocks.push(<h2 key={i} className="mb-2 mt-7 font-display text-2xl font-bold">{line.slice(2)}</h2>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      bullets.push(line.slice(2));
    } else {
      flush(i);
      blocks.push(<p key={i} className="mb-3 text-[15px] leading-relaxed text-foreground/85">{line}</p>);
    }
  });
  flush(9999);
  return blocks;
}

function DynamicPage() {
  const { slug } = useParams({ from: "/p/$slug" });
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc("site_page", { p_slug: slug });
      if (!on) return;
      setPage((data as PageData) ?? null);
      setLoading(false);
      if (data?.title) document.title = `${data.title} — BharatOne`;
    })();
    return () => { on = false; };
  }, [slug]);

  return (
    <PageShell
      title={page?.title ?? (loading ? "Loading…" : "Page not found")}
      subtitle={page?.subtitle ?? undefined}
      accent="ashoka"
    >
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {loading ? (
          <div className="grid h-52 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
        ) : !page ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">This page isn't available</h2>
            <p className="mt-2 text-sm text-muted-foreground">The page you're looking for may have been moved or unpublished.</p>
            <a href="/" className="mt-5 inline-block rounded-lg bg-india-green px-5 py-2.5 text-sm font-bold text-white">Back to home</a>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-9"
          >
            <div aria-hidden className="mb-6 h-1 w-full rounded-full" style={{ background: "var(--gradient-tricolor)" }} />
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-saffron" />
              Last updated: <span className="font-medium text-foreground">{new Date(page.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <div>{render(page.content)}</div>
          </motion.article>
        )}
      </section>
    </PageShell>
  );
}
