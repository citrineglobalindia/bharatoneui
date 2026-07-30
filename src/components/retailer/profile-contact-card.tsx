import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Phone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { notifyCurrentUserChanged } from "@/lib/use-current-user";

const TEN_DIGITS = /^\d{10}$/;

/**
 * Retailer-editable contact details.
 *
 * Only `phone` is writable here. The retailer's own row in `profiles` is
 * updatable under the "Users can update own profile" RLS policy
 * (`auth.uid() = id`), so this needs no privileged RPC.
 *
 * On success we fire `notifyCurrentUserChanged()` so the sidebar and the
 * profile dropdown drop their cached "Nill" and re-render with the new number.
 */
export function ProfileContactCard() {
  const [uid, setUid] = useState<string | null>(null);
  const [saved, setSaved] = useState("");   // what's currently in the database
  const [phone, setPhone] = useState("");   // what's in the input
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        await ensureStaffSession();
        const { data: u } = await supabase.auth.getUser();
        const id = u?.user?.id;
        if (!id || !on) return;
        const { data } = await supabase.from("profiles").select("phone").eq("id", id).maybeSingle();
        if (!on) return;
        const current = ((data as any)?.phone ?? "").trim();
        setUid(id);
        setSaved(current);
        setPhone(current);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const valid = TEN_DIGITS.test(phone);
  const dirty = phone !== saved;
  // An empty box on an account that never had a number is not an error state —
  // only complain once they have actually typed something.
  const showError = phone.length > 0 && !valid;

  const save = async () => {
    if (!uid) return;
    if (!valid) { toast.error("Enter a 10-digit mobile number"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ phone }).eq("id", uid);
      if (error) { toast.error("Could not save your phone number", { description: error.message }); return; }
      setSaved(phone);
      notifyCurrentUserChanged();
      toast.success("Phone number updated");
    } finally {
      setSaving(false);
    }
  };

  const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  if (loading) {
    return (
      <div className="grid h-32 place-items-center rounded-2xl border border-border bg-card shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-india-green" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-4 flex items-center gap-2 text-sm font-bold">
        <Phone className="h-4 w-4 text-india-green" /> Contact details
      </p>

      <div className="sm:max-w-xs">
        <label htmlFor="retailer-phone" className="text-xs font-semibold text-muted-foreground">
          Mobile number
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
          <input
            id="retailer-phone"
            className={`${input} pl-12 font-mono tracking-wide ${showError ? "border-rose-400 focus-visible:ring-rose-300" : ""}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit number"
            aria-invalid={showError}
            aria-describedby="retailer-phone-hint"
          />
        </div>
        <p
          id="retailer-phone-hint"
          className={`mt-1 text-[11px] ${showError ? "text-rose-600" : "text-muted-foreground"}`}
        >
          {showError ? `${phone.length} of 10 digits — enter the full number without +91.` : "Digits only, without the +91 prefix."}
        </p>
      </div>

      <Button onClick={save} disabled={saving || !valid || !dirty} className="mt-4 bg-india-green text-white">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save phone number
      </Button>
    </div>
  );
}
