import { Upload, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { Field, inputCls, StepHeader } from "../field";

function UploadBox({
  title,
  required,
  subtitle,
}: {
  title: string;
  required?: boolean;
  subtitle: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-sm font-semibold text-foreground">
        {title} {required && <span className="text-primary">*</span>}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="mt-3 flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Upload className="h-4 w-4" />
        {name ?? "Click to upload"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

export function KycDocsStep() {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Upload className="h-5 w-5" />}
        title="KYC Documents"
        description="Upload clear Aadhaar, PAN, and supporting documents manually. Max 5MB per file."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadBox title="PAN Card" required subtitle="Front side clearly visible" />
        <UploadBox title="Aadhaar Card" required subtitle="Front & back or e-Aadhaar" />
        <UploadBox title="Shop Photo" required subtitle="Visible signboard preferred" />
        <UploadBox title="Police Verification (Optional)" subtitle="Police verification certificate" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN Number" icon={<FileText className="h-4 w-4" />}>
          <input className={inputCls} placeholder="ABCDE1234F" maxLength={10} />
        </Field>
        <Field label="Aadhaar Number" icon={<FileText className="h-4 w-4" />}>
          <input className={inputCls} placeholder="12 digit Aadhaar" maxLength={12} />
        </Field>
      </div>
    </div>
  );
}