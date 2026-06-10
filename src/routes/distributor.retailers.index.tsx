import { createFileRoute } from "@tanstack/react-router";
import { DistributorRetailers } from "@/components/distributor/distributor-views";

export const Route = createFileRoute("/distributor/retailers/")({
  component: DistributorRetailers,
});
