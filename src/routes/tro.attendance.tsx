import { createFileRoute } from "@tanstack/react-router";
import { AttendanceLedger } from "@/components/regional/attendance-views";
import { TRO_CONFIG } from "@/components/regional/regional-shell";

export const Route = createFileRoute("/tro/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance & Check-in — TRO Portal" },
      { name: "description", content: "Daily check-in/check-out and attendance ledger." },
    ],
  }),
  component: () => <AttendanceLedger cfg={TRO_CONFIG} />,
});
