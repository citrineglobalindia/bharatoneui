import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Loader2, Save, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import { useAuth } from "@/hooks/use-auth";

export function AccountProfile() {
  const { user, roles } = useAuth();
  const [p, setP] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await ensureStaffSession();
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? user?.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      setP({ ...(data || { id: uid }), email: u.user?.email });
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!p?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: p.display_name, department: p.department, designation: p.designation,
      }).eq("id", p.id);
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Profile updated");
    } finally { setSaving(false); }
  };
  const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

  if (loading) return <div className="grid h-48 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-india-green" /></div>;
  if (!p) return <p className="text-sm text-muted-foreground">Sign in to view your profile.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-saffron-gradient text-2xl font-extrabold text-white">{(p.display_name?.[0] ?? p.email?.[0] ?? "U").toUpperCase()}</div>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold">{p.display_name || "—"}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {p.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">{(roles ?? []).map((r) => <span key={r} className="inline-flex items-center gap-1 rounded-full bg-india-green/10 px-2 py-0.5 text-[10px] font-bold text-india-green"><Shield className="h-3 w-3" />{r}</span>)}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><User className="h-4 w-4 text-india-green" /> Edit profile</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-semibold text-muted-foreground">Display name</label><input className={input} value={p.display_name ?? ""} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Department</label><input className={input} value={p.department ?? ""} onChange={(e) => setP({ ...p, department: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Designation</label><input className={input} value={p.designation ?? ""} onChange={(e) => setP({ ...p, designation: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Employee code</label><input className={`${input} bg-muted/50`} value={p.employee_code ?? "—"} disabled /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Email</label><input className={`${input} bg-muted/50`} value={p.email ?? ""} disabled /></div>
        </div>
        <Button onClick={save} disabled={saving} className="mt-4 bg-india-green text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes</Button>
      </div>
    </div>
  );
}
