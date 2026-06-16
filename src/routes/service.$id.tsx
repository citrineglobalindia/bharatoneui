import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plug, ExternalLink, Play } from "lucide-react";
import { RetailerShell } from "@/components/retailer/retailer-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/service/$id")({
  head: () => ({ meta: [{ title: "Service — BharatOne" }] }),
  component: ServiceLauncher,
});

function ServiceLauncher() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [svc, setSvc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
      setSvc(data);
      setLoading(false);
      if (data?.service_type === "backend" && data.backend_route) navigate({ to: data.backend_route as never });
      if (data?.service_type === "inlink" && data.redirect_url) window.location.href = data.redirect_url;
    })();
    // eslint-disable-next-line
  }, [id]);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("service-proxy", { body: { service_id: id } });
      if (error) { setResult("Integration not available yet: " + error.message); return; }
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult("Could not run the service. " + (e instanceof Error ? e.message : String(e)));
    } finally { setRunning(false); }
  };

  if (loading) return <RetailerShell><div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div></RetailerShell>;
  if (!svc) return <RetailerShell><div className="p-6">Service not found. <Link to="/services" className="text-india-green underline">Back to services</Link></div></RetailerShell>;

  return (
    <RetailerShell>
      <div className="space-y-5">
        <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Services</Link>
        <PageHeader icon={<Plug className="h-5 w-5" />} title={svc.name} subtitle={svc.category || "Integrated service"} />
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          {svc.logo_url ? <img src={svc.logo_url} alt={svc.name} className="h-16 w-16 object-contain" /> : <div className="grid h-16 w-16 place-items-center rounded-xl bg-india-green/10 text-india-green text-2xl font-bold">{svc.name[0]}</div>}
          <div>
            <p className="font-display text-lg font-bold">{svc.name}</p>
            <p className="text-sm text-muted-foreground">{svc.service_type === "api" ? "API-integrated service" : svc.service_type === "backend" ? "Backend service" : "External service"}</p>
          </div>
        </div>
        {svc.service_type === "api" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
            <Button onClick={run} disabled={running} className="bg-india-green text-white">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Launch service</Button>
            {result && <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{result}</pre>}
          </div>
        )}
        {svc.service_type === "inlink" && svc.redirect_url && (
          <a href={svc.redirect_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 py-2 text-sm font-semibold text-white">Open <ExternalLink className="h-4 w-4" /></a>
        )}
      </div>
    </RetailerShell>
  );
}
