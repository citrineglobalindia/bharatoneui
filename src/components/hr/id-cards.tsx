// BharatOne HR — ID Cards
//
// The screen is driven by the STAFF list, not the card list, so the question HR
// actually has — "who still has no card?" — is answered by looking at it. A
// screen listing only issued cards cannot show an absence.
//
// The card itself keeps almost no data of its own. Name, designation, date of
// birth, joining date and work area are read from the employee record every time
// the card is drawn, so a printed card and the personnel file cannot disagree.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IdCard, Loader2, RefreshCw, Search, Printer, Plus, ShieldOff, ShieldCheck,
  Upload, X, History, AlertTriangle, CheckCircle2, Clock3, ScanLine, Copy,
  LayoutGrid, Rows3, FlipHorizontal2, ZoomIn, ZoomOut, UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSession } from "@/integrations/supabase/ensure-session";
import {
  IdCardFront, IdCardBack, ID_CARD_CSS, type CardData,
} from "@/components/hr/id-card-art";

const db = supabase as any;

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

type Row = {
  user_id: string; name: string; email: string; phone: string | null;
  department: string | null; designation: string | null; district: string | null;
  dob: string | null; date_of_joining: string | null; work_location: string | null;
  card_id: string | null; card_no: string | null; blood_group: string | null;
  photo_path: string | null; issued_on: string | null; valid_until: string | null;
  status: string | null; revoked_reason: string | null; verify_token: string | null;
  expired: boolean | null; card_state: "none" | "active" | "expired" | "revoked" | "lost";
};

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-india-green";

const STATE: Record<string, { label: string; tone: string; icon: any }> = {
  none:    { label: "Not issued", tone: "bg-muted text-muted-foreground",   icon: AlertTriangle },
  active:  { label: "Active",     tone: "bg-emerald-100 text-emerald-700",  icon: CheckCircle2 },
  expired: { label: "Expired",    tone: "bg-amber-100 text-amber-700",      icon: Clock3 },
  revoked: { label: "Revoked",    tone: "bg-rose-100 text-rose-700",        icon: ShieldOff },
  lost:    { label: "Reported lost", tone: "bg-rose-100 text-rose-700",     icon: ShieldOff },
};

const BLOOD = ["A+VE", "A-VE", "B+VE", "B-VE", "AB+VE", "AB-VE", "O+VE", "O-VE"];

/** Thumbnail scales for the gallery. 1 would be the true 54 mm card. */
const ZOOMS = [0.62, 0.82, 1.05];

export function IdCards() {
  const [rows, setRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [issuing, setIssuing] = useState<Row | null>(null);
  const [preview, setPreview] = useState<Row | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [view, setView] = useState<"grid" | "table">("grid");
  const [zoom, setZoom] = useState(1);
  // Which tiles are showing their back, and which have ever been turned over.
  // The back face is only mounted once a card has been flipped, so opening the
  // gallery does not fire a QR request for every member of staff at once.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [everFlipped, setEverFlipped] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    await ensureStaffSession();
    const [{ data, error }, { data: cfg }] = await Promise.all([
      db.rpc("hr_id_card_list", { p_q: q || null, p_state: state || null }),
      db.from("app_settings").select("key,value"),
    ]);
    if (error) toast.error("Could not load ID cards", { description: error.message });
    const list = (data as Row[]) ?? [];
    setRows(list);
    setSettings(Object.fromEntries(((cfg as any[]) ?? []).map((r) => [r.key, r.value])));
    setLoading(false);

    // Photos live in a private bucket, so each one needs a short-lived signed
    // URL. A public bucket would put every staff photograph on a guessable
    // address with no login at all.
    const paths = list.map((r) => r.photo_path).filter(Boolean) as string[];
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("id-photos").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s: any) => { if (s.signedUrl && !s.error) map[s.path] = s.signedUrl; });
      setPhotos(map);
    }
  }, [q, state]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);   // debounce typing
    return () => clearTimeout(t);
  }, [load, q]);

  const counts = useMemo(() => {
    const c = { none: 0, active: 0, expired: 0, revoked: 0, lost: 0 } as Record<string, number>;
    rows.forEach((r) => { c[r.card_state] = (c[r.card_state] ?? 0) + 1; });
    return c;
  }, [rows]);

  const toCardData = useCallback((r: Row): CardData => ({
    name: r.name,
    designation: r.designation,
    card_no: r.card_no ?? "—",
    blood_group: r.blood_group,
    phone: r.phone,
    photo_url: r.photo_path ? photos[r.photo_path] ?? null : null,
    dob: r.dob,
    date_of_joining: r.date_of_joining,
    work_location: r.work_location,
    verify_token: r.verify_token,
    company_name: settings.company_legal_name ?? "BHARATONE SERVICES AND AFFILIATES PVT.LTD",
    company_address: settings.company_address ?? "",
    office_contact: settings.company_office_contact ?? "",
    signature_url: settings.id_card_signature_url ?? null,
    qr_url: r.verify_token ? `${FN_BASE}/id-card-qr?token=${r.verify_token}` : null,
  }), [photos, settings]);

  const printable = rows.filter((r) => picked.has(r.user_id) && r.card_id);

  const printSheet = (list: Row[]) => {
    if (!list.length) return toast.error("Nothing to print");
    printCards(list.map(toCardData));
  };

  const flip = (id: string) => {
    setEverFlipped((s) => new Set(s).add(id));
    setFlipped((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const flipAll = () => {
    const withCards = rows.filter((r) => r.card_id).map((r) => r.user_id);
    const allBack = withCards.length > 0 && withCards.every((id) => flipped.has(id));
    setEverFlipped(new Set(withCards));
    setFlipped(allBack ? new Set() : new Set(withCards));
  };

  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      if (on) n.add(id); else n.delete(id);
      return n;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <IdCard className="h-5 w-5 text-india-green" /> ID Cards
          </h2>
          <p className="text-sm text-muted-foreground">
            Issue, print and cancel staff identity cards. Each card carries a QR that
            proves it is genuine.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => printSheet(printable)} disabled={!printable.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print {printable.length || ""}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Not issued" value={counts.none} tone={counts.none ? "text-amber-600" : "text-emerald-600"} />
        <Stat label="Active" value={counts.active} tone="text-emerald-600" />
        <Stat label="Expired" value={counts.expired} tone={counts.expired ? "text-amber-600" : ""} />
        <Stat label="Revoked or lost" value={counts.revoked + counts.lost}
              tone={counts.revoked + counts.lost ? "text-rose-600" : ""} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input className={`${inp} pl-9`} placeholder="Search name, department or card number"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inp} w-auto`} value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All staff</option>
          <option value="none">Not issued</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
          <option value="lost">Reported lost</option>
        </select>

        <div className="flex rounded-lg border border-border bg-card p-1">
          <button onClick={() => setView("grid")} title="Card gallery"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
              view === "grid" ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button onClick={() => setView("table")} title="List"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
              view === "table" ? "bg-india-green text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Rows3 className="h-3.5 w-3.5" /> List
          </button>
        </div>

        {view === "grid" && (
          <>
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0}
                title="Smaller" className="p-2 hover:bg-muted disabled:opacity-40">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
                disabled={zoom === ZOOMS.length - 1}
                title="Bigger" className="p-2 hover:bg-muted disabled:opacity-40">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={flipAll} title="Turn every card over"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
              <FlipHorizontal2 className="h-3.5 w-3.5" /> Flip all
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-india-green" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No staff match that filter.
        </p>
      ) : view === "grid" ? (
        <>
          <style>{ID_CARD_CSS}</style>
          <div className="flex flex-wrap gap-5">
            {rows.map((r) => (
              <GridTile key={r.user_id} row={r} scale={ZOOMS[zoom]}
                data={r.card_id ? toCardData(r) : null}
                showBack={flipped.has(r.user_id)}
                mountBack={everFlipped.has(r.user_id)}
                selected={picked.has(r.user_id)}
                onSelect={(on) => toggle(r.user_id, on)}
                onFlip={() => flip(r.user_id)}
                onOpen={() => setPreview(r)}
                onIssue={() => setIssuing(r)} />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            These are the real cards at {Math.round(ZOOMS[zoom] * 100)}% of their printed
            size — what you see here is what comes out of the printer. Click a card to
            turn it over.
          </p>
        </>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox"
                    checked={picked.size > 0 && picked.size === rows.filter((r) => r.card_id).length}
                    onChange={(e) => setPicked(e.target.checked
                      ? new Set(rows.filter((r) => r.card_id).map((r) => r.user_id)) : new Set())} />
                </th>
                <th className="px-3 py-2.5">Employee</th>
                <th className="px-3 py-2.5">Card number</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Valid until</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATE[r.card_state];
                const Icon = s.icon;
                return (
                  <tr key={r.user_id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <input type="checkbox" disabled={!r.card_id} checked={picked.has(r.user_id)}
                        onChange={(e) => {
                          const next = new Set(picked);
                          if (e.target.checked) next.add(r.user_id); else next.delete(r.user_id);
                          setPicked(next);
                        }} />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[r.designation, r.department].filter(Boolean).join(" · ") || r.email}
                      </p>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.card_no ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.tone}`}>
                        <Icon className="h-3 w-3" /> {s.label}
                      </span>
                      {r.revoked_reason && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{r.revoked_reason}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.valid_until
                        ? new Date(r.valid_until).toLocaleDateString("en-IN",
                            { day: "2-digit", month: "short", year: "numeric" })
                        : r.card_id ? "No expiry" : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        {r.card_id && (
                          <button onClick={() => setPreview(r)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">
                            View
                          </button>
                        )}
                        <button onClick={() => setIssuing(r)}
                          className="inline-flex items-center gap-1 rounded-lg bg-india-green px-2.5 py-1 text-xs font-bold text-white">
                          <Plus className="h-3 w-3" /> {r.card_id ? "Reissue" : "Issue"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {issuing && (
        <IssueDialog row={issuing} settings={settings}
          onClose={() => setIssuing(null)}
          onDone={() => { setIssuing(null); load(); }} />
      )}
      {preview && (
        <PreviewDialog row={preview} data={toCardData(preview)}
          onClose={() => setPreview(null)}
          onChanged={load}
          onPrint={() => printSheet([preview])} />
      )}
    </div>
  );
}

/* ── gallery tile ─────────────────────────────────────────────────────── */

// One card in the gallery. The card art is the same component the preview and
// the printer use, scaled down — so a tile can never drift out of step with what
// is actually printed. Staff with no card still get a tile, because an empty
// space in the grid is the fastest way to see who has been missed.
function GridTile({ row, data, scale, showBack, mountBack, selected, onSelect, onFlip, onOpen, onIssue }: {
  row: Row; data: CardData | null; scale: number;
  showBack: boolean; mountBack: boolean; selected: boolean;
  onSelect: (on: boolean) => void; onFlip: () => void;
  onOpen: () => void; onIssue: () => void;
}) {
  const s = STATE[row.card_state];
  const Icon = s.icon;
  const w = { width: `calc(53.98mm * ${scale})` };

  return (
    <div className="flex flex-col gap-2" style={w}>
      <div className="relative">
        {data ? (
          <>
            <div
              className="bo-thumb cursor-pointer"
              data-face={showBack ? "back" : "front"}
              style={{ ["--s" as any]: scale }}
              onClick={onFlip}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip(); } }}
              aria-label={`${row.name} — ${s.label}. Activate to turn the card over.`}
            >
              <div className="bo-flip">
                <div className="bo-face"><IdCardFront d={data} /></div>
                {mountBack && (
                  <div className="bo-face bo-face--back"><IdCardBack d={data} /></div>
                )}
              </div>
            </div>

            {/* A cancelled or expired card must be obvious at a glance, even in a
                grid of twenty. Dimming alone is too easy to miss. */}
            {row.card_state !== "active" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[2mm] bg-background/55">
                <span className={`rotate-[-12deg] rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow ${s.tone}`}>
                  {s.label}
                </span>
              </div>
            )}

            <label className="absolute left-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-background/85 shadow"
                   onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={selected}
                     onChange={(e) => onSelect(e.target.checked)} />
            </label>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-[2mm] border-2 border-dashed border-border bg-muted/30 p-4 text-center"
            style={{ height: `calc(85.6mm * ${scale})` }}
          >
            <UserX className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs font-semibold text-muted-foreground">No card issued</p>
            <button onClick={onIssue}
              className="inline-flex items-center gap-1 rounded-lg bg-india-green px-2.5 py-1 text-xs font-bold text-white">
              <Plus className="h-3 w-3" /> Issue
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold" title={row.name}>{row.name}</p>
        <p className="truncate text-[11px] text-muted-foreground" title={row.designation ?? ""}>
          {row.designation || row.department || row.email}
        </p>
        {data && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.tone}`}>
              <Icon className="h-2.5 w-2.5" /> {s.label}
            </span>
            <button onClick={onOpen}
              className="ml-auto rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold hover:bg-muted">
              Open
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── issue / reissue ──────────────────────────────────────────────────── */

function IssueDialog({ row, settings, onClose, onDone }: {
  row: Row; settings: Record<string, string>; onClose: () => void; onDone: () => void;
}) {
  const years = Number(settings.id_card_validity_years ?? 3) || 3;
  const defaultExpiry = (() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  })();

  const [cardNo, setCardNo] = useState(row.card_no ?? "");
  const [blood, setBlood] = useState(row.blood_group ?? "");
  const [validUntil, setValidUntil] = useState(row.valid_until ?? defaultExpiry);
  const [notes, setNotes] = useState("");
  const [photoPath, setPhotoPath] = useState(row.photo_path ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [needCode, setNeedCode] = useState<{ district: string } | null>(null);
  const [districtCode, setDistrictCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const suggest = useCallback(async () => {
    setSuggesting(true);
    const { data } = await db.rpc("hr_id_card_next_no", { p_user: row.user_id });
    setSuggesting(false);
    if (data?.ok) { setCardNo(data.card_no); setNeedCode(null); return; }
    if (data?.reason === "no_district_code") { setNeedCode({ district: data.district }); return; }
    toast.info(data?.message ?? "Could not propose an ID — type one in");
  }, [row.user_id]);

  // Only propose a number for a card that does not have one. Reissuing after a
  // loss keeps the same number, which is what makes the old card traceable.
  useEffect(() => { if (!row.card_no) void suggest(); }, [row.card_no, suggest]);

  const saveDistrictCode = async () => {
    const { data, error } = await db.rpc("hr_id_card_set_district_code", {
      p_district: needCode!.district, p_code: districtCode,
    });
    if (error || !data?.ok) {
      return toast.error("Could not save", { description: error?.message ?? data?.message });
    }
    setNeedCode(null); setDistrictCode(""); suggest();
  };

  const upload = async (file: File) => {
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      return toast.error("Use a JPG, PNG or WebP image");
    }
    if (file.size > 5 * 1024 * 1024) return toast.error("Keep the photo under 5 MB");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${row.user_id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("id-photos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setBusy(false); return toast.error("Upload failed", { description: error.message }); }
    const { data: signed } = await supabase.storage.from("id-photos").createSignedUrl(path, 3600);
    setPhotoPath(path);
    setPhotoUrl(signed?.signedUrl ?? null);
    setBusy(false);
    toast.success("Photo uploaded");
  };

  const issue = async () => {
    if (!cardNo.trim()) return toast.error("The card needs an employee ID");
    setBusy(true);
    const { data, error } = await db.rpc("hr_id_card_issue", {
      p_user: row.user_id, p_card_no: cardNo, p_blood_group: blood,
      p_photo_path: photoPath || null, p_valid_until: validUntil || null, p_notes: notes || null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      return toast.error("Could not issue the card", { description: error?.message ?? data?.message });
    }
    toast.success(row.card_id ? "Card reissued" : "Card issued", {
      description: row.card_id ? "The previous card has been cancelled." : undefined,
    });
    onDone();
  };

  const missing = [
    !row.dob && "date of birth",
    !row.date_of_joining && "joining date",
    !row.work_location && "work area",
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold">
              {row.card_id ? "Reissue card" : "Issue card"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {row.name} · {row.designation || "No designation recorded"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {row.card_id && (
          <p className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900">
            Issuing a new card cancels {row.card_no}. The old card will stop verifying
            immediately, so collect it back if you can.
          </p>
        )}

        {missing.length > 0 && (
          <p className="rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            The back of the card will show a dash for {missing.join(", ")} — those come
            from the employee record. Fill them in under Employees to have them printed.
          </p>
        )}

        <div>
          <Lbl>Photograph</Lbl>
          <div className="flex items-center gap-3">
            <div className="h-24 w-[4.6rem] shrink-0 overflow-hidden rounded-xl bg-muted">
              {photoUrl
                ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                : <div className="grid h-full place-items-center text-[10px] text-muted-foreground">
                    {photoPath ? "Saved" : "No photo"}
                  </div>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60">
                <Upload className="h-3.5 w-3.5" /> Choose photo
              </button>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Portrait, JPG or PNG, under 5 MB. Stored privately.
              </p>
            </div>
          </div>
        </div>

        {needCode ? (
          <div className="space-y-2 rounded-xl border border-india-green/40 bg-card p-3">
            <p className="text-xs">
              No ID code is recorded for <strong>{needCode.district}</strong> yet. The sample
              card uses <strong>13</strong> for Hassan. Enter the code for this district and
              it will be remembered.
            </p>
            <div className="flex gap-2">
              <input className={inp} placeholder="13" value={districtCode}
                     onChange={(e) => setDistrictCode(e.target.value)} />
              <button onClick={saveDistrictCode}
                className="h-10 shrink-0 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
                Save
              </button>
            </div>
          </div>
        ) : (
          <label className="block">
            <Lbl>Employee ID</Lbl>
            <div className="flex gap-2">
              <input className={`${inp} font-mono`} value={cardNo}
                     onChange={(e) => setCardNo(e.target.value)} />
              <button onClick={suggest} disabled={suggesting}
                className="h-10 shrink-0 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60">
                {suggesting ? "…" : "Propose"}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              BO + state + district + role + serial. You can type a different one.
            </p>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Lbl>Blood group</Lbl>
            <select className={inp} value={blood} onChange={(e) => setBlood(e.target.value)}>
              <option value="">Not recorded</option>
              {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="block">
            <Lbl>Valid until</Lbl>
            <input type="date" className={inp} value={validUntil}
                   onChange={(e) => setValidUntil(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <Lbl>Note (not printed)</Lbl>
          <input className={inp} value={notes} placeholder="Replaces card lost on 12 July"
                 onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button onClick={issue} disabled={busy}
            className="h-10 rounded-lg bg-india-green px-5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Working…" : row.card_id ? "Reissue" : "Issue card"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── preview, revoke, history ─────────────────────────────────────────── */

function PreviewDialog({ row, data, onClose, onChanged, onPrint }: {
  row: Row; data: CardData; onClose: () => void; onChanged: () => void; onPrint: () => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.rpc("hr_id_card_history", { p_user: row.user_id })
      .then(({ data: h }: any) => setHistory(h ?? []));
  }, [row.user_id]);

  const setStatus = async (status: string) => {
    const reason = status === "active" ? null
      : window.prompt(status === "lost"
          ? "Note about the loss (optional)"
          : "Why is this card being cancelled? (optional)") ?? "";
    setBusy(true);
    const { data: res, error } = await db.rpc("hr_id_card_revoke", {
      p_id: row.card_id, p_status: status, p_reason: reason,
    });
    setBusy(false);
    if (error || !res?.ok) {
      return toast.error("Could not update", { description: error?.message ?? res?.message });
    }
    toast.success(status === "active" ? "Card reinstated" : "Card cancelled");
    onChanged(); onClose();
  };

  const verifyUrl = row.verify_token
    ? `${window.location.origin}/verify/${row.verify_token}` : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <style>{ID_CARD_CSS}</style>
      <div className="w-full max-w-3xl space-y-4 rounded-2xl bg-background p-6 shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold">{row.name}</h3>
            <p className="font-mono text-xs text-muted-foreground">{row.card_no}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-wrap justify-center gap-6 rounded-2xl bg-muted/40 p-6">
          <div className="bo-card-shadow"><IdCardFront d={data} /></div>
          <div className="bo-card-shadow"><IdCardBack d={data} /></div>
        </div>

        {verifyUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <ScanLine className="h-4 w-4 shrink-0 text-india-green" />
            <span className="text-xs text-muted-foreground">Scanning the QR opens</span>
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px]">{verifyUrl}</code>
            <button onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success("Copied"); }}
              className="rounded-lg border border-border p-1.5 hover:bg-muted">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setShowHistory((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <History className="h-4 w-4" /> History ({history.length})
          </button>
          {row.card_state === "active" ? (
            <>
              <button onClick={() => setStatus("lost")} disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
                <AlertTriangle className="h-4 w-4" /> Report lost
              </button>
              <button onClick={() => setStatus("revoked")} disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                <ShieldOff className="h-4 w-4" /> Cancel card
              </button>
            </>
          ) : (
            <button onClick={() => setStatus("active")} disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
              <ShieldCheck className="h-4 w-4" /> Reinstate
            </button>
          )}
          <button onClick={onPrint}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-india-green px-4 text-sm font-bold text-white">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        {showHistory && (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {history.length === 0 && (
              <li className="p-4 text-center text-xs text-muted-foreground">No earlier cards.</li>
            )}
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                <div>
                  <p className="font-mono font-semibold">{h.card_no}</p>
                  <p className="text-muted-foreground">
                    Issued {new Date(h.issued_on).toLocaleDateString("en-IN")}
                    {h.issued_by_name ? ` by ${h.issued_by_name}` : ""}
                    {h.revoked_reason ? ` · ${h.revoked_reason}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATE[h.status]?.tone ?? ""}`}>
                  {STATE[h.status]?.label ?? h.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── printing ─────────────────────────────────────────────────────────── */

// Printing happens in a detached window rather than the app page. The app's
// stylesheet is full of screen layout that fights a card printer, and hiding all
// of it with print rules is far more fragile than starting from a blank page.
function printCards(cards: CardData[]) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return toast.error("Allow pop-ups to print");

  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>BharatOne ID cards</title>
<style>
  ${ID_CARD_CSS}
  @page { size: A4; margin: 8mm; }
  body { margin:0; font-family:ui-sans-serif,system-ui,sans-serif; background:#fff; }
  .sheet { display:flex; flex-wrap:wrap; gap:6mm; }
  .pair { display:flex; gap:4mm; page-break-inside:avoid; break-inside:avoid; }
  .hint { font-size:11px; color:#555; margin:0 0 6mm; }
  @media print { .hint { display:none; } }
</style></head><body>
<p class="hint">Print at 100% scale — do not use "fit to page", or the cards will not be
card-sized. Each pair is one card: front then back.</p>
<div class="sheet" id="sheet"></div>
<script id="payload" type="application/json">${JSON.stringify(cards).replace(/</g, "\\u003c")}</script>
</body></html>`;

  w.document.write(html);
  w.document.close();

  // Render the cards into the new window using the same markup the preview uses,
  // built as a string so the print window needs no React runtime of its own.
  const render = (d: CardData) => {
    const front = `
<div class="bo-card" data-side="front">
  ${FRAME_FRONT}
  <div class="bo-card-edge">${esc(d.company_name.toUpperCase())}</div>
  <div class="bo-card-body">
    <img src="${esc(LOGO_SRC)}" class="bo-logo" alt="">
    <p class="bo-company">${esc(d.company_name.toUpperCase())}</p>
    <div class="bo-photo">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="">`
      : `<span class="bo-photo-empty">No photo</span>`}</div>
    <p class="bo-name">${esc(d.name.toUpperCase())}</p>
    <p class="bo-role">${esc((d.designation || "EMPLOYEE").toUpperCase())}</p>
    <dl class="bo-fields">
      <dt>EMPLOYEE ID :</dt><dd>${esc(d.card_no)}</dd>
      <dt>BLOOD GROUP :</dt><dd>${esc((d.blood_group || "—").toUpperCase())}</dd>
      <dt>PHONE :</dt><dd>${esc(d.phone ? (/^\d{10}$/.test(d.phone) ? "+91 " + d.phone : d.phone) : "—")}</dd>
    </dl>
    <div class="bo-sign">
      ${d.signature_url ? `<img src="${esc(d.signature_url)}" alt="">` : ""}
      <p>AUTHORIZED SIGNATURE</p>
    </div>
  </div>
</div>`;
    const terms = TERMS_HTML;
    const back = `
<div class="bo-card" data-side="back">
  ${FRAME_BACK}
  <div class="bo-card-edge">${esc(d.company_name.toUpperCase())}</div>
  <div class="bo-card-body bo-back">
    <img src="${esc(LOGO_SRC)}" class="bo-logo bo-logo-sm" alt="">
    <p class="bo-company">${esc(d.company_name.toUpperCase())}</p>
    <p class="bo-address">${esc(d.company_address.toUpperCase())}</p>
    <dl class="bo-meta">
      <dt>DATE OF BIRTH</dt><dd>${esc(fmtPrint(d.dob))}</dd>
      <dt>JOINING DATE</dt><dd>${esc(fmtPrint(d.date_of_joining))}</dd>
      <dt>WORK AREA</dt><dd>${esc((d.work_location || "—").toUpperCase())}</dd>
      <dt>OFFICE CONTACT</dt><dd>${esc(d.office_contact || "—")}</dd>
    </dl>
    <p class="bo-terms-title">TERMS AND CONDITIONS</p>
    <div class="bo-terms">${terms}</div>
    <div class="bo-qr">${d.qr_url ? `<img src="${esc(d.qr_url)}" alt="">`
      : `<div class="bo-qr-empty">QR</div>`}</div>
    <p class="bo-site">🌐 www.mybharatone.com</p>
  </div>
</div>`;
    return `<div class="pair">${front}${back}</div>`;
  };

  const sheet = w.document.getElementById("sheet")!;
  sheet.innerHTML = cards.map(render).join("");

  // Wait for the photos and QR images to arrive. Printing before they load
  // produces cards with blank squares where the photo should be.
  const imgs = Array.from(w.document.images);
  Promise.all(imgs.map((img) => img.complete
    ? Promise.resolve()
    : new Promise((res) => { img.onload = res; img.onerror = res; })))
    .then(() => setTimeout(() => { w.focus(); w.print(); }, 250));
}

const fmtPrint = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${d
    .toLocaleDateString("en-GB", { month: "short" }).toUpperCase()} ${d.getFullYear()}`;
};

const LOGO_SRC = new URL("../../assets/bharatone-logo.png", import.meta.url).href;

// These must stay identical to the <Frame> component in id-card-art.tsx. The
// print window has no React, so the same artwork exists twice; keeping them
// side by side here makes a divergence obvious in review.
const FRAME_FRONT = `<svg viewBox="0 0 540 856" class="bo-card-frame" preserveAspectRatio="none" aria-hidden="true">
<path d="M300 0 Q540 0 540 270" fill="none" stroke="#FF6B1A" stroke-width="46"/>
<path d="M356 0 Q540 0 540 214 L540 0 Z" fill="#0E8A3E"/>
<path d="M0 586 Q0 856 270 856" fill="none" stroke="#0E8A3E" stroke-width="46"/>
<path d="M0 642 Q0 856 214 856 L0 856 Z" fill="#FF6B1A"/>
</svg>`;

const FRAME_BACK = `<svg viewBox="0 0 540 856" class="bo-card-frame" preserveAspectRatio="none" aria-hidden="true">
<path d="M22 -20 Q104 428 22 876" fill="none" stroke="#0E8A3E" stroke-width="54"/>
<path d="M-16 -20 Q58 428 -16 876" fill="none" stroke="#FF6B1A" stroke-width="54"/>
<path d="M540 520 Q432 700 348 856 L540 856 Z" fill="#FF6B1A"/>
<path d="M540 592 Q460 726 402 856 L540 856 Z" fill="#0E8A3E"/>
</svg>`;

const TERMS_HTML = [
  ["Non-Transferable:", "This card is issued to the individual named and is non-transferable. It must not be used by anyone other than the cardholder."],
  ["Property of Issuer:", "The card remains the property of the issuing authority and must be surrendered upon request."],
  ["Loss or Theft:", "In case of loss or theft, the cardholder must notify the issuing authority immediately to prevent unauthorized use."],
  ["Card Validity:", "The card is valid only for the period mentioned and must be renewed upon expiration for continued use."],
  ["Tampering Prohibited:", "Any tampering, alteration, or unauthorized duplication of this card is strictly prohibited and may result in legal action."],
].map(([h, b]) => `<p><strong>${h}</strong> ${b}</p>`).join("");

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</p>
  </div>
);

export default IdCards;
