import { toast } from "sonner";
import { Upload, FileText, Eye, X } from "lucide-react";
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
  const existing = files[fileKey];
  const [name, setName] = useState<string | null>(existing?.name ?? null);
  const [url, setUrl] = useState<string | null>(existing ? URL.createObjectURL(existing) : null);
  const [isImg, setIsImg] = useState<boolean>(!!existing && existing.type.startsWith("image/"));
  const onPick = (f?: File) => {
    if (f && f.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum size is 50 MB." }); return; }
    if (url) URL.revokeObjectURL(url);
    setName(f?.name ?? null); setFile(fileKey, f);
    setUrl(f ? URL.createObjectURL(f) : null); setIsImg(!!f && f.type.startsWith("image/"));
  };
  const clear = () => { onPick(undefined); if (ref.current) ref.current.value = ""; };
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-sm font-semibold text-foreground">{title} {required && <span className="text-primary">*</span>}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
      {url ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <div className="relative grid h-40 w-full place-items-center bg-muted/40">
            {isImg ? <img src={url} alt={name ?? title} className="h-full w-full object-contain" />
              : <div className="flex flex-col items-center gap-1 text-muted-foreground"><FileText className="h-10 w-10" /><span className="text-xs">PDF document</span></div>}
            <button type="button" onClick={clear} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/55 text-white hover:bg-black/70"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-xs font-medium text-india-green">{name}</span>
            <div className="flex shrink-0 gap-2">
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Eye className="h-3.5 w-3.5" /> Preview</a>
              <button type="button" onClick={() => ref.current?.click()} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><Upload className="h-3.5 w-3.5" /> Change</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="mt-3 flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" /> Click to upload
        </button>
      )}
      <input ref={ref} type="file" accept="*/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
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
      <UploadBox title="Passport Size Photo" required subtitle="Recent passport-size photo · plain background, face clearly visible" fileKey="passport" />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadBox title="PAN Card" required subtitle="Front side clearly visible" fileKey="pan" />
        <UploadBox title="Aadhaar Card" required subtitle="Front & back or e-Aadhaar" fileKey="aadhaar" />
        <UploadBox title="Inside Shop Photo" required subtitle="Interior view — counter / setup visible" fileKey="shopPhotoInside" />
        <UploadBox title="Outside Shop Photo" required subtitle="Shopfront with signboard visible" fileKey="shopPhoto" />
        <UploadBox title="Police Verification (Optional)" subtitle="Police verification certificate" fileKey="police" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN Number" required icon={<FileText className="h-4 w-4" />}>
          <input
            className={inputCls} autoComplete="off"
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
            className={inputCls} autoComplete="off"
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
