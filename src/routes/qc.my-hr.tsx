import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { MyHR } from "@/components/account/my-hr";

export const Route = createFileRoute("/qc/my-hr")({
  head: () => ({ meta: [{ title: "My HR — QC Portal" }] }),
  component: () => (
    <QcShell>
      <div className="space-y-5">
        <PageHeader icon={<CalendarCheck className="h-5 w-5" />} title="My HR" subtitle="Check in and out, attendance, leave, ID card and payslips" />
        <MyHR />
      </div>
    </QcShell>
  ),
});
