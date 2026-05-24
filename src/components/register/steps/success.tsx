import { CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SuccessStep() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.95_0.05_150)] text-[oklch(0.45_0.15_150)]">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold text-foreground">Application Submitted</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your BharatOne onboarding has been received. Our team will review your KYC and notify you on your registered email and mobile.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">Back to Home</Link>
        </Button>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
}