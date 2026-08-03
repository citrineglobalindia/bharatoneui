import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/store-shell";
import { ReturnsPanel } from "@/components/estore/returns-panel";

export const Route = createFileRoute("/store/returns")({
  head: () => ({ meta: [{ title: "Store Returns — BharatOne" }] }),
  component: () => <StoreShell><ReturnsPanel /></StoreShell>,
});
