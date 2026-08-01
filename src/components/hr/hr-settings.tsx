// BharatOne HR — Settings
//
// The rules the rest of HR runs on: leave types and their yearly entitlements, and the
// holiday calendar. Both feed straight into leave applications — a day listed here as
// a holiday never consumes anyone's balance.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Settings2,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  CalendarDays,
  Palmtree,
  Save,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";

const db = supabase as any;

type LeaveType = {
  code: string;
  name: string;
  annual_days: number;
  paid: boolean;
  requires_proof: boolean;
  proof_after_days: number | null;
  colour: string;
  active: boolean;
  sort_order: number;
};
type Holiday = { id: string; holiday_on: string; name: string; optional: boolean };

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function HrSettings() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [newHol, setNewHol] = useState({ holiday_on: "", name: "", optional: false });
  const [newType, setNewType] = useState({ code: "", name: "", annual_days: 0, colour: "#0ea5e9" });

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data: t }, { data: h }] = await Promise.all([
      db.from("hr_leave_types").select("*").order("sort_order"),
      db.from("hr_holidays").select("*").order("holiday_on"),
    ]);
    setTypes((t as LeaveType[]) ?? []);
    setHolidays((h as Holiday[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const saveType = async (t: LeaveType) => {
    setSavingCode(t.code);
    const { error } = await db
      .from("hr_leave_types")
      .update({
        name: t.name,
        annual_days: t.annual_days,
        paid: t.paid,
        requires_proof: t.requires_proof,
        proof_after_days: t.proof_after_days,
        colour: t.colour,
        active: t.active,
      })
      .eq("code", t.code);
    setSavingCode(null);
    if (error) return toast.error("Could not save", { description: error.message });
    toast.success(`${t.name} saved`);
    load();
  };

  const addType = async () => {
    const code = newType.code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    if (!code || !newType.name.trim()) return toast.error("A code and a name are needed");
    const { error } = await db.from("hr_leave_types").insert({
      code,
      name: newType.name.trim(),
      annual_days: Number(newType.annual_days) || 0,
      colour: newType.colour,
      sort_order: types.length + 1,
    });
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Leave type added");
    setNewType({ code: "", name: "", annual_days: 0, colour: "#0ea5e9" });
    load();
  };

  const addHoliday = async () => {
    if (!newHol.holiday_on || !newHol.name.trim())
      return toast.error("Pick a date and give it a name");
    const { error } = await db.from("hr_holidays").insert({
      holiday_on: newHol.holiday_on,
      name: newHol.name.trim(),
      optional: newHol.optional,
    });
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Holiday added");
    setNewHol({ holiday_on: "", name: "", optional: false });
    load();
  };

  const removeHoliday = async (h: Holiday) => {
    if (
      !confirm(
        `Remove ${h.name} on ${d(h.holiday_on)}? Leave already approved is not recalculated.`,
      )
    )
      return;
    const { error } = await db.from("hr_holidays").delete().eq("id", h.id);
    if (error) return toast.error("Could not remove", { description: error.message });
    toast.success("Holiday removed");
    load();
  };

  const yearHolidays = useMemo(
    () => holidays.filter((h) => new Date(h.holiday_on).getFullYear() === year),
    [holidays, year],
  );
  const years = useMemo(() => {
    const set = new Set(holidays.map((h) => new Date(h.holiday_on).getFullYear()));
    set.add(new Date().getFullYear());
    return [...set].sort();
  }, [holidays]);

  if (loading) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-india-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Settings2 className="h-5 w-5 text-india-green" /> HR Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Leave entitlements and the holiday calendar. Changes apply to new leave applications
            immediately.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* ---------------------------------------------- leave types */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <CalendarDays className="h-4 w-4 text-india-green" /> Leave types and entitlements
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Days per employee per year. Set an entitlement to 0 for unpaid leave, which is never
          balance-checked.
        </p>

        <div className="mt-4 space-y-2">
          {types.map((t, i) => (
            <div
              key={t.code}
              className="grid items-end gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.4fr_repeat(3,minmax(0,0.7fr))_auto]"
            >
              <label className="block">
                <Lbl>Name</Lbl>
                <input
                  className={inp}
                  value={t.name}
                  onChange={(e) =>
                    setTypes(types.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
              </label>
              <label className="block">
                <Lbl>Days / year</Lbl>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={inp}
                  value={t.annual_days}
                  onChange={(e) =>
                    setTypes(
                      types.map((x, j) =>
                        j === i ? { ...x, annual_days: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </label>
              <label className="block">
                <Lbl>Colour</Lbl>
                <input
                  type="color"
                  className="h-10 w-full rounded-lg border border-border bg-background px-1"
                  value={t.colour}
                  onChange={(e) =>
                    setTypes(types.map((x, j) => (j === i ? { ...x, colour: e.target.value } : x)))
                  }
                />
              </label>
              <div className="space-y-1 pb-1">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-india-green"
                    checked={t.paid}
                    onChange={(e) =>
                      setTypes(
                        types.map((x, j) => (j === i ? { ...x, paid: e.target.checked } : x)),
                      )
                    }
                  />
                  Paid
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-india-green"
                    checked={t.active}
                    onChange={(e) =>
                      setTypes(
                        types.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)),
                      )
                    }
                  />
                  In use
                </label>
              </div>
              <button
                onClick={() => saveType(t)}
                disabled={savingCode === t.code}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {savingCode === t.code ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 grid items-end gap-3 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[0.8fr_1.4fr_0.7fr_0.7fr_auto]">
          <label className="block">
            <Lbl>Code</Lbl>
            <input
              className={inp}
              value={newType.code}
              placeholder="maternity"
              onChange={(e) => setNewType({ ...newType, code: e.target.value })}
            />
          </label>
          <label className="block">
            <Lbl>Name</Lbl>
            <input
              className={inp}
              value={newType.name}
              placeholder="Maternity Leave"
              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
            />
          </label>
          <label className="block">
            <Lbl>Days / year</Lbl>
            <input
              type="number"
              min={0}
              className={inp}
              value={newType.annual_days}
              onChange={(e) => setNewType({ ...newType, annual_days: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <Lbl>Colour</Lbl>
            <input
              type="color"
              className="h-10 w-full rounded-lg border border-border bg-background px-1"
              value={newType.colour}
              onChange={(e) => setNewType({ ...newType, colour: e.target.value })}
            />
          </label>
          <button
            onClick={addType}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      {/* ---------------------------------------------- holidays */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Palmtree className="h-4 w-4 text-india-green" /> Holiday calendar
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Declared holidays and Sundays are never counted against a leave balance.
            </p>
          </div>
          <select
            className={`${inp} w-auto`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid items-end gap-3 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[0.9fr_1.6fr_auto_auto]">
          <label className="block">
            <Lbl>Date</Lbl>
            <input
              type="date"
              className={inp}
              value={newHol.holiday_on}
              onChange={(e) => setNewHol({ ...newHol, holiday_on: e.target.value })}
            />
          </label>
          <label className="block">
            <Lbl>Occasion</Lbl>
            <input
              className={inp}
              value={newHol.name}
              placeholder="Independence Day"
              onChange={(e) => setNewHol({ ...newHol, name: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-1.5 pb-3 text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-india-green"
              checked={newHol.optional}
              onChange={(e) => setNewHol({ ...newHol, optional: e.target.checked })}
            />
            Optional
          </label>
          <button
            onClick={addHoliday}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-3 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {yearHolidays.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
            No holidays declared for {year}. Until you add them, every weekday counts as a working
            day.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {yearHolidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{h.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d(h.holiday_on)}
                    {h.optional && " · optional"}
                  </p>
                </div>
                <button
                  onClick={() => removeHoliday(h)}
                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          An optional holiday still counts as a working day — mark restricted holidays optional so
          staff must apply for leave to take them.
        </p>
      </section>
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
    {children}
  </span>
);

export default HrSettings;
