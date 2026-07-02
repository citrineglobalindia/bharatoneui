import { supabase } from "@/integrations/supabase/client";

export type RetailerMeta = {
  "User Name": string; "Old Id": string; "Full Name": string; "Pan": string;
  "District": string; "Taluk": string; "Gram Panchayat": string;
};

const EMPTY_META: RetailerMeta = {
  "User Name": "", "Old Id": "", "Full Name": "", "Pan": "",
  "District": "", "Taluk": "", "Gram Panchayat": "",
};

// Canonical export column order (CR 33)
export const EXPORT_COLUMNS = [
  "User Name", "Old Id", "Full Name", "Pan", "District", "Taluk", "Gram Panchayat",
  "Opening Wallet", "CR amount", "DR Amount", "Closing Wallet", "Type",
  "Service Amount", "SP Amount", "Deduction", "Amount", "GST", "TDS",
  "Reference Table", "Reference Id", "Order Id", "Tracking id",
  "Service Department", "Service Remarks", "Creation Date Time",
] as const;

export type ExportRow = Partial<Record<(typeof EXPORT_COLUMNS)[number], string | number>>;

// Constant retailer profile fields used on every exported row
export async function fetchRetailerMeta(): Promise<RetailerMeta> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { ...EMPTY_META };
  const uid = u.user.id;
  const { data: reg } = await supabase
    .from("retailer_registrations")
    .select("username, application_id, first_name, middle_name, surname, pan_number, district, taluk, gram_panchayat")
    .eq("auth_user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reg) {
    const r = reg as Record<string, string | null>;
    return {
      "User Name": r.username || u.user.email || "",
      "Old Id": r.application_id || "",
      "Full Name": [r.first_name, r.middle_name, r.surname].filter(Boolean).join(" "),
      "Pan": r.pan_number || "",
      "District": r.district || "",
      "Taluk": r.taluk || "",
      "Gram Panchayat": r.gram_panchayat || "",
    };
  }
  const { data: p } = await supabase.from("profiles").select("display_name, district, pan_number").eq("id", uid).maybeSingle();
  const pr = (p as Record<string, string | null>) || {};
  return { ...EMPTY_META, "User Name": u.user.email || "", "Full Name": pr.display_name || "", "Pan": pr.pan_number || "", "District": pr.district || "" };
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Numeric money columns default to 0 (never blank) so every cell is populated.
const NUMERIC_COLUMNS = new Set<string>([
  "Opening Wallet", "CR amount", "DR Amount", "Closing Wallet",
  "Service Amount", "SP Amount", "Deduction", "Amount", "GST", "TDS",
]);

export async function downloadWalletCsv(filename: string, items: ExportRow[]) {
  const meta = await fetchRetailerMeta();
  const head = EXPORT_COLUMNS.map(esc).join(",");
  const body = items
    .map((it) =>
      EXPORT_COLUMNS.map((c) => {
        const raw = c in meta ? (meta as Record<string, string>)[c] : it[c];
        const val = raw === undefined || raw === null || raw === "" ? (NUMERIC_COLUMNS.has(c) ? 0 : "") : raw;
        return esc(val);
      }).join(","),
    )
    .join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
