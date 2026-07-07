import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Megaphone, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; text: string; sort_order: number; is_active: boolean };

export function HeadlinesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("headlines").select("*").order("sort_order").order("created_at");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) { toast.error("Enter a headline"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("headlines").insert({ text: text.trim(), sort_order: rows.length });
      if (error) { toast.error("Save failed", { description: error.message }); return; }
      toast.success("Headline added");
      setText("");
      load();
    } finally { setBusy(false); }
  };
  const toggle = async (r: Row) => { await supabase.from("headlines").update({ is_active: !r.is_active }).eq("id", r.id); load(); };
  const remove = async (r: Row) => { if (!confirm("Delete this headline?")) return; await supabase.from("headlines").delete().eq("id", r.id); toast.success("Deleted"); load(); };
  const move = async (r: Row, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.id === r.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("headlines").update({ sort_order: swap.sort_order }).eq("id", r.id),
      supabase.from("headlines").update({ sort_order: r.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><Megaphone className="h-4 w-4 text-saffron" /> Add headline</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Shows in the scrolling ticker at the top of the homepage. You can start with an emoji (e.g. 🎉, 🏦, ✈️).</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. 🎉 New service launched at every BharatOne center"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
          <button onClick={add} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-saffron px-4 h-10 text-sm font-semibold text-white hover:bg-saffron/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-bold">Headlines ({rows.length})</p>
        {loading ? (
          <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No headlines yet. The homepage shows default headlines until you add one.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.id} className={`flex items-center gap-3 rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-50"}`}>
                <span className="min-w-0 flex-1 truncate text-sm">{r.text}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="rounded-md border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => toggle(r)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                    {r.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                  </button>
                  <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
