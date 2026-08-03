import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/store-shell";
import { AgentsPanel } from "@/components/estore/agents-panel";

export const Route = createFileRoute("/store/agents")({
  head: () => ({ meta: [{ title: "Delivery Agents — BharatOne" }] }),
  component: () => <StoreShell><AgentsPanel /></StoreShell>,
});
