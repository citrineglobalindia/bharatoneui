import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Megaphone, Eye, EyeOff, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  message: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const input =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-india-green/30";

export function NoticeBoardManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notice_board")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) toast.error("Failed to load notices", { description: error.message });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!msg.trim()) {
      toast.error("Notice message is required");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("notice_board").insert({
        message: msg.trim(),
        link_url: link.trim() || null,
        sort_order: rows.length,
      });
      if (error) {
        toast.error("Could not add notice", { description: error.message });
        return;
      }
      toast.success("Notice added");
      setMsg("");
      setLink("");
      load();
    } finally {
      setBusy(false);
    }
  };

  const save = async (r: Row) => {
    const { error } = await supabase
      .from("notice_board")
      .update({ message: r.message, link_url: r.link_url?.trim() || null })
      .eq("id", r.id);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Notice updated");
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("notice_board").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const remove = async (r: Row) => {
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notice_board").delete().eq("id", r.id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      return;
    }
    toast.success("Notice deleted");
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const patch = (id: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Megaphone className="h-4 w-4 text-india-green" /> Add notice
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Message *</label>
            <textarea
              rows={2}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="e.g. AEPS service will be under maintenance on Sunday 10 PM – 12 AM."
              className={input + " h-auto py-2"}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Link URL (optional)</label>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/offer"
                className={input}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              You can also paste a link directly inside the message — URLs are made clickable automatically.
            </p>
          </div>
          <Button className="bg-india-green text-white" onClick={add} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add notice
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Notices ({rows.length})</p>
        {loading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-india-green" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No notices yet. Add your first message above — it will scroll on the retailer dashboard.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-60"}`}>
                <textarea
                  rows={2}
                  value={r.message}
                  onChange={(e) => patch(r.id, { message: e.target.value })}
                  className={input + " h-auto py-2"}
                />
                <div className="mt-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={r.link_url ?? ""}
                    onChange={(e) => patch(r.id, { link_url: e.target.value })}
                    placeholder="Link URL (optional)"
                    className={input}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" className="bg-india-green text-white" onClick={() => save(r)}>
                    <Check className="h-3.5 w-3.5" /> Save
                  </Button>
                  <button
                    onClick={() => toggle(r)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-muted"
                  >
                    {r.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                  <span className={`ml-auto text-[11px] font-semibold ${r.is_active ? "text-india-green" : "text-muted-foreground"}`}>
                    {r.is_active ? "● Live" : "○ Hidden"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
