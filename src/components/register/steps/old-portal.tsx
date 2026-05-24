import { Lock, Search, AlertTriangle } from "lucide-react";
import { Field, inputCls, Notice, StepHeader } from "../field";
import { Button } from "@/components/ui/button";

export function OldPortalStep() {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Lock className="h-5 w-5" />}
        title="Old Portal Details"
        description="Enter your JSKO Username to auto-fetch your details, then verify your email & mobile."
      />
      <Notice tone="warn" title="⚠ Important Notice">
        Please enter the exact Old JSKO Username and Password used in the previous JSKO portal. Your registered email and mobile will be auto-filled from our records.
      </Notice>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Old JSKO Username" required className="flex-1">
          <input className={inputCls} placeholder="e.g. JSKO101" />
        </Field>
        <Button className="h-11 bg-primary/70 hover:bg-primary">
          <Search className="h-4 w-4" /> Fetch Details
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" /> Make sure your username matches the records in the legacy system.
      </p>
    </div>
  );
}