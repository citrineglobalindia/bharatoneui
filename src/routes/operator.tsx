import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for the operator portal. The console itself lives at
// src/routes/operator.index.tsx; the account pages (profile, settings,
// notifications, support, feedback) are siblings under /operator/*. Each page
// wraps itself in OperatorShell, which carries the portal guard.
export const Route = createFileRoute("/operator")({
  head: () => ({ meta: [{ title: "Operator — BharatOne" }] }),
  component: Outlet,
});
