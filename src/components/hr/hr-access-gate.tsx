import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHrAccess, type HrAccess } from "@/lib/hr-access.functions";

export function HrAccessGate({ children }: { children: (access: HrAccess) => React.ReactNode }) {
  const fetchAccess = useServerFn(getHrAccess);
  const accessQuery = useQuery({
    queryKey: ["hr-access"],
    queryFn: () => fetchAccess(),
    retry: false,
  });

  if (accessQuery.isPending) {
    return <div className="grid min-h-screen place-items-center bg-background"><div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-hr"/><p className="mt-3 text-sm text-muted-foreground">Verifying workforce access…</p></div></div>;
  }

  if (accessQuery.isError || !accessQuery.data) {
    return <div className="grid min-h-screen place-items-center bg-background px-4"><section className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-destructive/10 text-destructive"><LockKeyhole/></span><h1 className="mt-4 font-display text-xl font-extrabold">Access restricted</h1><p className="mt-2 text-sm text-muted-foreground">Sign in with an active HR staff or manager account to open this command center.</p><Button asChild className="mt-6 bg-hr text-hr-foreground"><Link to="/hr-login">Go to HR sign in</Link></Button></section></div>;
  }

  return <>{children(accessQuery.data)}</>;
}