import { Upload, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { Field, inputCls, StepHeader } from "../field";
import { useRegistration, type RegFileKey } from "../registration-context";

function UploadBox({
  title,
  required,
  subtitle,
  fileKey,
}: {
  title: string;
  required?: boolean;
  subtitle: string;
  fileKey: RegFileKey;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { files, setFile } = useRegistration();
  const [name, setName] = useState<string | null>(files[fileKey]?.name ?? null);
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          setName(f?.name ?? null);
          setFile(fileKey, f);
        }}
      />
    </div>
  );
}

export function KycDocsStep() {
  const { data, set } = useRegistration();
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Upload className="h-5 w-5" />}
        title="KYC Documents"
        description="Upload clear Aadhaar, PAN, and supporting documents manually. Max 5MB per file."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadBox title="PAN Card" required subtitle="Front side clearly visible" fileKey="pan" />
        <UploadBox title="Aadhaar Card" required subtitle="Front & back or e-Aadhaar" fileKey="aadhaar" />
        <UploadBox title="Shop Photo" required subtitle="Visible signboard preferred" fileKey="shopPhoto" />
        <UploadBox title="Police Verification (Optional)" subtitle="Police verification certificate" fileKey="police" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN Number" required icon={<FileText className="h-4 w-4" />}>
          <input
            className={inputCls}
            placeholder="ABCDE1234F"
            maxLength={10}
            value={data.panNumber}
            onChange={(e) => set({ panNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          />
          {data.panNumber.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.panNumber) && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)</p>
          )}
        </Field>
        <Field label="Aadhaar Number" required icon={<FileText className="h-4 w-4" />}>
          <input
            className={inputCls}
            placeholder="12 digit Aadhaar"
            maxLength={12}
            value={data.aadhaarNumber}
            onChange={(e) => set({ aadhaarNumber: e.target.value.replace(/\D/g, "") })}
          />
          {data.aadhaarNumber.length > 0 && !/^\d{12}$/.test(data.aadhaarNumber) && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Aadhaar must be exactly 12 digits</p>
          )}
        </Field>
      </div>
    </div>
  );
}
