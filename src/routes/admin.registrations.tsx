import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { PageHeader } from "@/components/retailer/page-header";
import { RegistrationsReview } from "@/components/registrations/registrations-review";
import { NotificationsBell } from "@/components/retailer/notifications-bell";
import { usePortalGuard, PortalAuthGate } from "@/lib/portal-guard";

export const Route = createFileRoute("/admin/registrations")({
  head: () => ({ meta: [{ title: "Retailer Approvals — BharatOne Admin" }] }),
  component: AdminRegistrationsPage,
});

function AdminRegistrationsPage() {
  const ready = usePortalGuard("/admin-login", ["admin"]);
  if (!ready) return <PortalAuthGate />;
  return (
    <div className="min-h-screen bg-tricolor">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-center px-4">
          <Link to="/admin" aria-label="Back to admin" className="absolute left-4 inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo size="lg" />
          <div className="absolute right-4 flex items-center gap-2">
            <NotificationsBell />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-5">
          <PageHeader
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Retailer Approvals"
            subtitle="Final approval after accountant payment check + QC verification. Approving generates the retailer ID & password."
          />
          <RegistrationsReview />
        </div>
      </main>
    </div>
  );
}
