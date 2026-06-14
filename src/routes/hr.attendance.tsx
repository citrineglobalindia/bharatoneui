import { createFileRoute } from "@tanstack/react-router";
import { AttendanceLedger } from "@/components/hr/attendance-ledger";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/attendance")({
  head: () => ({ meta: [{ title: "Attendance Ledger — BharatOne HR" }, { name: "description", content: "Monthly employee attendance ledger with daily status and totals." }] }),
  component: AttendancePage,
});

function AttendancePage() {
  return <HrShell><div className="mx-auto max-w-[1800px]"><AttendanceLedger /></div></HrShell>;
}