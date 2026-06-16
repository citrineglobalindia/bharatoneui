import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FormField = {
  key: string;
  label: string;
  type: "text" | "number" | "email" | "tel" | "date" | "textarea" | "select" | "checkbox" | "file";
  required: boolean;
  placeholder?: string;
  options?: string[];
};

const TYPES: FormField["type"][] = ["text", "number", "email", "tel", "date", "textarea", "select", "checkbox", "file"];

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

export function FormBuilder({ value, onChange }: { value: FormField[]; onChange: (v: FormField[]) => void }) {
  const fields = value ?? [];
  const update = (i: number, patch: Partial<FormField>) => {
    const next = fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(next);
  };
  const add = () => onChange([...fields, { key: `field_${fields.length + 1}`, label: "", type: "text", required: false }]);
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= fields.length) return;
    const next = [...fields]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  const input = "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Form fields ({fields.length})</p>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5" /> Add field</Button>
      </div>
      {fields.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No fields yet. Click "Add field" to build the retailer form.</p>}
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_140px]">
                <input className={input} placeholder="Field label (e.g. PAN Number)" value={f.label}
                  onChange={(e) => update(i, { label: e.target.value, key: slug(e.target.value) })} />
                <select className={input} value={f.type} onChange={(e) => update(i, { type: e.target.value as FormField["type"] })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {(f.type === "select") && (
                  <input className={`${input} sm:col-span-2`} placeholder="Options, comma-separated (e.g. Savings, Current)"
                    value={(f.options ?? []).join(", ")} onChange={(e) => update(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                )}
                {f.type !== "checkbox" && f.type !== "file" && (
                  <input className={`${input} sm:col-span-2`} placeholder="Placeholder (optional)" value={f.placeholder ?? ""} onChange={(e) => update(i, { placeholder: e.target.value })} />
                )}
              </div>
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <label className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-3.5 w-3.5 accent-[oklch(0.55_0.12_150)]" /> Required
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
