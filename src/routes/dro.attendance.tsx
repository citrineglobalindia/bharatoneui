import { createFileRoute } from "@tanstack/react-router";
import { AttendanceLedger } from "@/components/regional/attendance-views";
import { DRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/dro/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance & Check-in — DRO Portal" },
      { name: "description", content: "Daily check-in/check-out and attendance ledger." },
    ],
  }),
  component: () => <AttendanceLedger cfg={DRO_CONFIG} />,
});
