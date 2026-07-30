import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FranchiseTerms } from "@/components/register/franchise-terms";

/**
 * Standalone, linkable copy of the Franchise Application Details & Terms.
 * Accepting here records the consent and forwards to the new-retailer registration.
 * /register?type=new enforces the same gate on its own, so this page is a convenience
 * entry point rather than the only way the terms are shown.
 */
export const Route = createFileRoute("/franchise-terms")({
  head: () => ({
    meta: [
      { title: "Franchise Application Details & Terms — BharatOne" },
      {
        name: "description",
        content:
          "BharatOne franchise details, responsibilities, branding standards, refund policy and terms and conditions for prospective franchise partners.",
      },
    ],
  }),
  component: FranchiseTermsPage,
});

function FranchiseTermsPage() {
  const navigate = useNavigate();
  return <FranchiseTerms onAccept={() => navigate({ to: "/register", search: { type: "new" } })} />;
}
