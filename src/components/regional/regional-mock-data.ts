export type ServiceKey = "AEPS" | "DMT" | "Recharge" | "BBPS" | "PAN" | "GST";

export const SERVICE_META: { key: ServiceKey; label: string; color: string; rate: number }[] = [
  { key: "AEPS", label: "AEPS Cash Withdrawal", color: "#10b981", rate: 12 },
  { key: "DMT", label: "Money Transfer", color: "#0ea5e9", rate: 18 },
  { key: "Recharge", label: "Mobile Recharge", color: "#8b5cf6", rate: 3 },
  { key: "BBPS", label: "BBPS Bill Payment", color: "#f59e0b", rate: 6 },
  { key: "PAN", label: "PAN Card", color: "#f43f5e", rate: 90 },
  { key: "GST", label: "GST Registration", color: "#14b8a6", rate: 250 },
];

export interface RetailerActivity {
  id: string;
  name: string;
  shop: string;
  phone: string;
  taluk: string;
  district: string;
  active: boolean;
  today: Record<ServiceKey, number>;
  revenue: number;
}

export const DISTRICT = "Bengaluru Urban";
export const TALUK = "Anekal";

const mk = (
  id: string,
  name: string,
  shop: string,
  phone: string,
  taluk: string,
  active: boolean,
  s: [number, number, number, number, number, number],
  revenue: number,
): RetailerActivity => ({
  id,
  name,
  shop,
  phone,
  taluk,
  district: DISTRICT,
  active,
  today: { AEPS: s[0], DMT: s[1], Recharge: s[2], BBPS: s[3], PAN: s[4], GST: s[5] },
  revenue,
});

// District-wide retailers across multiple taluks
export const DISTRICT_RETAILERS: RetailerActivity[] = [
  mk("BO-RT-1001", "Harshitha N", "Sri Sai Digital", "9876789876", "Anekal", true, [42, 18, 60, 30, 4, 1], 18420),
  mk("BO-RT-1002", "Ravi Kumar", "Ravi Net Café", "9123456780", "Anekal", true, [28, 10, 75, 22, 2, 0], 12110),
  mk("BO-RT-1003", "Anita Desai", "Anita e-Seva", "9871122334", "Anekal", false, [0, 0, 0, 0, 0, 0], 0),
  mk("BO-RT-1004", "Vikram Singh", "VS Online", "9912345678", "Hoskote", true, [35, 14, 48, 26, 3, 1], 15230),
  mk("BO-RT-1005", "Sunita Rao", "Sunita Mini Bank", "9845001122", "Hoskote", true, [55, 22, 40, 18, 5, 2], 21940),
  mk("BO-RT-1006", "Manoj Gupta", "Manoj Digital Point", "9800223344", "Devanahalli", true, [20, 8, 90, 35, 1, 0], 9870),
  mk("BO-RT-1007", "Lakshmi Iyer", "Lakshmi Seva Kendra", "9810334455", "Devanahalli", true, [48, 16, 52, 28, 6, 3], 19560),
  mk("BO-RT-1008", "Imran Khan", "IK Communications", "9820445566", "Nelamangala", true, [30, 12, 68, 20, 2, 1], 11240),
  mk("BO-RT-1009", "Deepa Nair", "Deepa Digital", "9830556677", "Nelamangala", false, [0, 0, 0, 0, 0, 0], 0),
  mk("BO-RT-1010", "Suresh Babu", "Suresh e-Mitra", "9840667788", "Yelahanka", true, [60, 25, 35, 24, 7, 2], 24330),
  mk("BO-RT-1011", "Pooja Shetty", "Pooja Online Hub", "9850778899", "Yelahanka", true, [38, 15, 58, 30, 3, 1], 14680),
  mk("BO-RT-1012", "Arjun Reddy", "Arjun Net World", "9860889900", "Anekal", true, [25, 9, 80, 18, 1, 0], 10120),
];

// TRO sees only the Anekal taluk retailers
export const TALUK_RETAILERS = DISTRICT_RETAILERS.filter((r) => r.taluk === TALUK);

export const WEEKLY_SERVICES = [
  { day: "Mon", services: 980, revenue: 142000 },
  { day: "Tue", services: 1120, revenue: 168000 },
  { day: "Wed", services: 1340, revenue: 191000 },
  { day: "Thu", services: 1010, revenue: 151000 },
  { day: "Fri", services: 1480, revenue: 214000 },
  { day: "Sat", services: 860, revenue: 119000 },
  { day: "Sun", services: 540, revenue: 78000 },
];

export const inr = (n: number) =>
  "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function serviceTotal(r: RetailerActivity) {
  return SERVICE_META.reduce((sum, s) => sum + r.today[s.key], 0);
}

export function aggregateServices(rows: RetailerActivity[]) {
  return SERVICE_META.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    count: rows.reduce((sum, r) => sum + r.today[s.key], 0),
  }));
}

export function summarize(rows: RetailerActivity[]) {
  const totalRetailers = rows.length;
  const activeToday = rows.filter((r) => r.active).length;
  const inactiveToday = totalRetailers - activeToday;
  const servicesToday = rows.reduce((sum, r) => sum + serviceTotal(r), 0);
  const revenueToday = rows.reduce((sum, r) => sum + r.revenue, 0);
  return { totalRetailers, activeToday, inactiveToday, servicesToday, revenueToday };
}

// Transparent revenue model: revenue per service = transactions × avg commission rate.
export function serviceRevenueModel(rows: RetailerActivity[]) {
  const model = SERVICE_META.map((s) => {
    const count = rows.reduce((sum, r) => sum + r.today[s.key], 0);
    return {
      key: s.key,
      label: s.label,
      color: s.color,
      rate: s.rate,
      count,
      revenue: count * s.rate,
    };
  });
  const totalCount = model.reduce((sum, m) => sum + m.count, 0);
  const totalRevenue = model.reduce((sum, m) => sum + m.revenue, 0);
  return { model, totalCount, totalRevenue };
}

export function topByVolume(rows: RetailerActivity[], n = 6) {
  return [...rows]
    .map((r) => ({ name: r.name, count: serviceTotal(r) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function taluksSummary(rows: RetailerActivity[]) {
  const map = new Map<string, { taluk: string; retailers: number; services: number; revenue: number }>();
  for (const r of rows) {
    const e = map.get(r.taluk) ?? { taluk: r.taluk, retailers: 0, services: 0, revenue: 0 };
    e.retailers += 1;
    e.services += serviceTotal(r);
    e.revenue += r.revenue;
    map.set(r.taluk, e);
  }
  return [...map.values()].sort((a, b) => b.services - a.services);
}

export function exportRetailersCsv(rows: RetailerActivity[], filename: string) {
  const headers = ["Retailer ID", "Name", "Shop", "Phone", "Taluk", "Status", ...SERVICE_META.map((s) => s.key), "Total Services", "Revenue"];
  const lines = rows.map((r) =>
    [
      r.id,
      r.name,
      r.shop,
      r.phone,
      r.taluk,
      r.active ? "Active" : "Inactive",
      ...SERVICE_META.map((s) => String(r.today[s.key])),
      String(serviceTotal(r)),
      String(r.revenue),
    ].join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   Retailer Activity Module — enriched profile / transactions /
   wallet data (deterministic, derived from each retailer's id).
   ============================================================ */

export type RetailerStatus = "Active" | "Inactive" | "Suspended";

export interface ServiceUsage {
  key: string;
  label: string;
  color: string;
  requests: number;
  success: number;
  pending: number;
  failed: number;
  revenue: number;
}

export interface WalletTxn {
  id: string;
  date: string; // ISO
  type: "Credit" | "Debit";
  channel: string;
  amount: number;
  status: "Success" | "Pending" | "Failed";
}

export interface RetailerDetail {
  id: string;
  name: string;
  shop: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  taluk: string;
  registeredOn: string; // ISO
  lastTxnAt: string; // ISO
  status: RetailerStatus;
  serviceCategories: string[];
  // transactions
  totalTxns: number;
  successTxns: number;
  pendingTxns: number;
  failedTxns: number;
  cancelledTxns: number;
  // wallet
  walletBalance: number;
  walletCredit: number;
  walletDebit: number;
  commissionEarned: number;
  chargesDeducted: number;
  // breakdown
  services: ServiceUsage[];
}

// Simple deterministic seeded generator so figures stay stable per retailer.
function seeded(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

// Extended service catalogue used in the retailer detail view.
const EXT_SERVICES: { key: string; label: string; color: string }[] = [
  { key: "AEPS", label: "AEPS", color: "#10b981" },
  { key: "DMT", label: "DMT", color: "#0ea5e9" },
  { key: "BBPS", label: "BBPS", color: "#f59e0b" },
  { key: "Recharge", label: "Recharge", color: "#8b5cf6" },
  { key: "PAN", label: "PAN Services", color: "#f43f5e" },
  { key: "Insurance", label: "Insurance", color: "#14b8a6" },
  { key: "Loan", label: "Loan Services", color: "#6366f1" },
  { key: "Travel", label: "Travel Booking", color: "#ec4899" },
  { key: "Other", label: "Other Services", color: "#64748b" },
];

const STREETS = ["Main Road", "Bazaar Street", "Gandhi Nagar", "Market Complex", "Station Road", "Old Town", "MG Road"];

export function enrichRetailer(r: RetailerActivity): RetailerDetail {
  const rnd = seeded(r.id);
  const baseVolume = serviceTotal(r);
  const status: RetailerStatus = r.active ? "Active" : rnd() > 0.5 ? "Suspended" : "Inactive";

  const services: ServiceUsage[] = EXT_SERVICES.map((s) => {
    const known = (r.today as Record<string, number>)[s.key] ?? 0;
    const reqs = known > 0 ? known * (3 + Math.floor(rnd() * 6)) : Math.floor(rnd() * (r.active ? 30 : 4));
    const failed = Math.floor(reqs * (0.03 + rnd() * 0.07));
    const pending = Math.floor(reqs * (0.02 + rnd() * 0.05));
    const success = Math.max(reqs - failed - pending, 0);
    const rate = [12, 18, 6, 3, 90, 60, 140, 80, 20][EXT_SERVICES.indexOf(s)];
    return { ...s, requests: reqs, success, pending, failed, revenue: success * rate };
  });

  const totalTxns = services.reduce((a, s) => a + s.requests, 0);
  const successTxns = services.reduce((a, s) => a + s.success, 0);
  const pendingTxns = services.reduce((a, s) => a + s.pending, 0);
  const failedTxns = services.reduce((a, s) => a + s.failed, 0);
  const cancelledTxns = Math.floor(failedTxns * (0.3 + rnd() * 0.4));

  const commissionEarned = services.reduce((a, s) => a + s.revenue, 0) || r.revenue;
  const walletCredit = Math.round(commissionEarned * (8 + rnd() * 6));
  const chargesDeducted = Math.round(commissionEarned * (0.04 + rnd() * 0.05));
  const walletDebit = Math.round(walletCredit * (0.55 + rnd() * 0.3)) + chargesDeducted;
  const walletBalance = Math.max(walletCredit - walletDebit, 0);

  const regDaysAgo = 90 + Math.floor(rnd() * 600);
  const lastTxnHrsAgo = r.active ? Math.floor(rnd() * 20) : 240 + Math.floor(rnd() * 1200);
  const registeredOn = new Date(Date.now() - regDaysAgo * 864e5).toISOString();
  const lastTxnAt = new Date(Date.now() - lastTxnHrsAgo * 36e5).toISOString();

  const serviceCategories = services.filter((s) => s.requests > 0).map((s) => s.key);
  const idNum = r.id.replace(/\D/g, "").slice(-4);

  return {
    id: r.id,
    name: r.name,
    shop: r.shop,
    phone: r.phone,
    email: `${r.name.toLowerCase().replace(/[^a-z]/g, ".")}@bharatone.in`,
    address: `${r.shop}, ${STREETS[Math.floor(rnd() * STREETS.length)]}, ${r.taluk}`,
    district: r.district,
    taluk: r.taluk,
    registeredOn,
    lastTxnAt,
    status,
    serviceCategories: serviceCategories.length ? serviceCategories : ["—"],
    totalTxns,
    successTxns,
    pendingTxns,
    failedTxns,
    cancelledTxns,
    walletBalance,
    walletCredit,
    walletDebit,
    commissionEarned,
    chargesDeducted,
    services,
  };
}

export function walletHistory(r: RetailerDetail, count = 14): WalletTxn[] {
  const rnd = seeded(r.id + "wallet");
  const channels = ["AEPS Settlement", "DMT Commission", "Recharge", "BBPS", "Wallet Top-up", "Service Charge", "PAN Fee", "Withdrawal"];
  const statuses: WalletTxn["status"][] = ["Success", "Success", "Success", "Pending", "Failed"];
  const out: WalletTxn[] = [];
  for (let i = 0; i < count; i++) {
    const isCredit = rnd() > 0.5;
    const amt = Math.round((50 + rnd() * 4000) / 10) * 10;
    const hrsAgo = i * (6 + Math.floor(rnd() * 30));
    out.push({
      id: `TXN${(r.id.replace(/\D/g, "").slice(-4) || "0000")}${String(1000 + i)}`,
      date: new Date(Date.now() - hrsAgo * 36e5).toISOString(),
      type: isCredit ? "Credit" : "Debit",
      channel: channels[Math.floor(rnd() * channels.length)],
      amount: amt,
      status: statuses[Math.floor(rnd() * statuses.length)],
    });
  }
  return out;
}

export function findRetailer(id: string): RetailerDetail | undefined {
  const r = DISTRICT_RETAILERS.find((x) => x.id === id);
  return r ? enrichRetailer(r) : undefined;
}

// Aggregate transaction + wallet figures for the dashboard summary cards.
export function activitySummary(rows: RetailerActivity[]) {
  const details = rows.map(enrichRetailer);
  const acc = (f: (d: RetailerDetail) => number) => details.reduce((a, d) => a + f(d), 0);
  return {
    totalRetailers: rows.length,
    activeRetailers: details.filter((d) => d.status === "Active").length,
    inactiveRetailers: details.filter((d) => d.status !== "Active").length,
    totalTxns: acc((d) => d.totalTxns),
    successTxns: acc((d) => d.successTxns),
    pendingTxns: acc((d) => d.pendingTxns),
    failedTxns: acc((d) => d.failedTxns),
    walletBalance: acc((d) => d.walletBalance),
    walletCredit: acc((d) => d.walletCredit),
    walletDebit: acc((d) => d.walletDebit),
    commission: acc((d) => d.commissionEarned),
  };
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/* ============================================================
   TRO Activity / Inactivity tracking for DRO oversight
   ============================================================ */

export interface TroActivity {
  id: string;
  name: string;
  phone: string;
  scope: string;
  droId: string;
  active: boolean;
  lastActiveAt: string; // ISO
  inactiveDays: number;
  reason?: string;
  commissionEarned: number;
  commissionLost: number;
}

export const TRO_ACTIVITIES: TroActivity[] = [
  { id: "TRO-01", name: "Navya", phone: "8974532566", scope: "Anekal Taluk", droId: "DRO-01", active: true, lastActiveAt: new Date(Date.now() - 2 * 36e5).toISOString(), inactiveDays: 0, reason: "", commissionEarned: 12450, commissionLost: 0 },
  { id: "TRO-02", name: "Praveen", phone: "8974544556", scope: "Hoskote Taluk", droId: "DRO-01", active: true, lastActiveAt: new Date(Date.now() - 6 * 36e5).toISOString(), inactiveDays: 0, reason: "", commissionEarned: 9820, commissionLost: 0 },
  { id: "TRO-03", name: "Meghana", phone: "8974566778", scope: "Devanahalli Taluk", droId: "DRO-02", active: false, lastActiveAt: new Date(Date.now() - 5 * 864e5).toISOString(), inactiveDays: 5, reason: "Medical leave", commissionEarned: 8400, commissionLost: 2100 },
  { id: "TRO-04", name: "Suhas", phone: "8974588990", scope: "Nelamangala Taluk", droId: "DRO-02", active: false, lastActiveAt: new Date(Date.now() - 12 * 864e5).toISOString(), inactiveDays: 12, reason: "Field survey — extended", commissionEarned: 6200, commissionLost: 5400 },
  { id: "TRO-05", name: "Ramesh", phone: "8974512345", scope: "Yelahanka Taluk", droId: "DRO-01", active: false, lastActiveAt: new Date(Date.now() - 18 * 864e5).toISOString(), inactiveDays: 18, reason: "No response", commissionEarned: 4300, commissionLost: 8900 },
  { id: "TRO-06", name: "Priya K", phone: "8974567890", scope: "Doddaballapur Taluk", droId: "DRO-02", active: false, lastActiveAt: new Date(Date.now() - 3 * 864e5).toISOString(), inactiveDays: 3, reason: "Training program", commissionEarned: 11200, commissionLost: 1200 },
];

export function inactiveTros(droId: string) {
  return TRO_ACTIVITIES.filter((t) => t.droId === droId && !t.active).sort((a, b) => b.inactiveDays - a.inactiveDays);
}

export function totalCommissionLost(droId: string) {
  return inactiveTros(droId).reduce((sum, t) => sum + t.commissionLost, 0);
}
