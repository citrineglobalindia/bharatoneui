import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/distributor/retailers")({
  head: () => ({
    meta: [
      { title: "Retailers — Distributor Portal" },
      { name: "description", content: "All retailers mapped under your officers with daily service activity." },
    ],
  }),
  component: () => <Outlet />,
});
