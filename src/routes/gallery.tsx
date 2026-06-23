import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Gallery } from "@/components/site/Gallery";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery — BharatOne" }] }),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <PageShell
      eyebrow="Gallery"
      title={<>Moments from <span className="text-gradient-tricolor">BharatOne</span></>}
      subtitle="A glimpse of our service centers, citizens served, and milestones across India."
      crumbs={[{ label: "Gallery" }]}
    >
      <Gallery embedded />
    </PageShell>
  );
}
