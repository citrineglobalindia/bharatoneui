import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { QcShell } from "@/components/qc/qc-shell";
import { PageHeader } from "@/components/retailer/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/qc/change-password")({
  head: () => ({ meta: [{ title: "Change Password — QC Portal" }] }),
  component: ChangePasswordPage,
});

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-50" />} {label}
    </li>
  );
}

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const rules = {
    len: next.length >= 8,
    upper: /[A-Z]/.test(next),
    lower: /[a-z]/.test(next),
    num: /\d/.test(next),
    sym: /[^A-Za-z0-9]/.test(next),
    match: next.length > 0 && next === confirm,
  };
  const score = Object.values(rules).filter(Boolean).length;
  const strength = score <= 2 ? "Weak" : score <= 4 ? "Good" : "Strong";
  const strengthColor = score <= 2 ? "bg-rose-500" : score <= 4 ? "bg-amber-500" : "bg-emerald-500";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return toast.error("Enter current password");
    if (current !== "Password@66") return toast.error("Current password is incorrect");
    if (score < 5) return toast.error("Password does not meet all requirements");
    if (!rules.match) return toast.error("Passwords do not match");
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Password updated", { description: "Use your new password next time you sign in." });
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => navigate({ to: "/qc/dashboard" }), 600);
    }, 800);
  };

  return (
    <QcShell>
      <div className="max-w-xl space-y-5">
        <PageHeader
          icon={<KeyRound className="h-5 w-5" />}
          title="Change Password"
          subtitle="Use a strong, unique password. Sessions on other devices will be signed out."
        />

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
          {[
            { label: "Current password", value: current, set: setCurrent },
            { label: "New password", value: next, set: setNext },
            { label: "Confirm new password", value: confirm, set: setConfirm },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-bold text-muted-foreground">{f.label}</label>
              <div className="mt-1 relative">
                <input
                  type={show ? "text" : "password"}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-3 pr-10 h-10 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 focus-visible:border-indigo-500"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground" aria-label="Toggle visibility">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Strength</span>
              <span className="text-xs font-bold">{next ? strength : "—"}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${strengthColor} transition-all`} style={{ width: `${(score / 6) * 100}%` }} />
            </div>
            <ul className="grid grid-cols-2 gap-1 mt-3">
              <Rule ok={rules.len} label="At least 8 characters" />
              <Rule ok={rules.upper} label="Uppercase letter" />
              <Rule ok={rules.lower} label="Lowercase letter" />
              <Rule ok={rules.num} label="Number" />
              <Rule ok={rules.sym} label="Symbol" />
              <Rule ok={rules.match} label="Passwords match" />
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Encrypted end-to-end</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/qc/dashboard" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? "Updating…" : "Update password"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </QcShell>
  );
}