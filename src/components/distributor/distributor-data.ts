export type ServiceKey = "AEPS" | "DMT" | "Recharge" | "BBPS" | "PAN" | "GST";

export const SERVICE_META: { key: ServiceKey; label: string; color: string; rate: number }[] = [
  { key: "AEPS", label: "AEPS Cash Withdrawal", color: "#10b981", rate: 6 },
  { key: "DMT", label: "Money Transfer", color: "#0ea5e9", rate: 9 },
  { key: "Recharge", label: "Mobile Recharge", color: "#8b5cf6", rate: 2 },
  { key: "BBPS", label: "BBPS Bill Payment", color: "#f59e0b", rate: 3 },
  { key: "PAN", label: "PAN Card", color: "#f43f5e", rate: 40 },
  { key: "GST", label: "GST Registration", color: "#14b8a6", rate: 120 },
];

export type OfficerRole = "DRO" | "TRO";

export interface Retailer {
  id: string;
  name: string;
  shop: string;
  phone: string;
  taluk: string;
  district: string;
  troId: string;
  droId: string;
  active: boolean;
  today: Record<ServiceKey, number>;
  week: number;
  month: number;
  revenue: number;
}

export interface Officer {
  id: string;
  role: OfficerRole;
  name: string;
  phone: string;
  scope: string;
  parentId?: string;
  active?: boolean;
}

export const inr = (n: number) =>
  "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const OFFICERS: Officer[] = [
  { id: "DRO-01", role: "DRO", name: "Kavya", phone: "8974532567", scope: "Bengaluru Urban District", active: true },
  { id: "DRO-02", role: "DRO", name: "Rahul Verma", phone: "8974511223", scope: "Bengaluru Rural District", active: false },
  { id: "TRO-01", role: "TRO", name: "Navya", phone: "8974532566", scope: "Anekal Taluk", parentId: "DRO-01", active: true },
  { id: "TRO-02", role: "TRO", name: "Praveen", phone: "8974544556", scope: "Hoskote Taluk", parentId: "DRO-01", active: true },
  { id: "TRO-03", role: "TRO", name: "Meghana", phone: "8974566778", scope: "Devanahalli Taluk", parentId: "DRO-02", active: false },
  { id: "TRO-04", role: "TRO", name: "Suhas", phone: "8974588990", scope: "Nelamangala Taluk", parentId: "DRO-02", active: true },
];

const mk = (
  id: string, name: string, shop: string, phone: string,
  taluk: string, troId: string, droId: string, active: boolean,
  s: [number, number, number, number, number, number],
  week: number, month: number, revenue: number,
): Retailer => ({
  id, name, shop, phone, taluk, district: "Bengaluru",
  troId, droId, active,
  today: { AEPS: s[0], DMT: s[1], Recharge: s[2], BBPS: s[3], PAN: s[4], GST: s[5] },
  week, month, revenue,
});

export const RETAILERS: Retailer[] = [
  mk("BO-RT-1001", "Harshitha N", "Sri Sai Digital", "9876789876", "Anekal", "TRO-01", "DRO-01", true, [42, 18, 60, 30, 4, 1], 980, 4120, 18420),
  mk("BO-RT-1002", "Ravi Kumar", "Ravi Net Café", "9123456780", "Anekal", "TRO-01", "DRO-01", true, [28, 10, 75, 22, 2, 0], 720, 3020, 12110),
  mk("BO-RT-1012", "Arjun Reddy", "Arjun Net World", "9860889900", "Anekal", "TRO-01", "DRO-01", true, [25, 9, 80, 18, 1, 0], 640, 2710, 10120),
  mk("BO-RT-1004", "Vikram Singh", "VS Online", "9912345678", "Hoskote", "TRO-02", "DRO-01", true, [35, 14, 48, 26, 3, 1], 820, 3460, 15230),
  mk("BO-RT-1005", "Sunita Rao", "Sunita Mini Bank", "9845001122", "Hoskote", "TRO-02", "DRO-01", true, [55, 22, 40, 18, 5, 2], 1140, 4880, 21940),
  mk("BO-RT-1006", "Manoj Gupta", "Manoj Digital Point", "9800223344", "Devanahalli", "TRO-03", "DRO-02", true, [20, 8, 90, 35, 1, 0], 690, 2980, 9870),
  mk("BO-RT-1007", "Lakshmi Iyer", "Lakshmi Seva Kendra", "9810334455", "Devanahalli", "TRO-03", "DRO-02", true, [48, 16, 52, 28, 6, 3], 1020, 4360, 19560),
  mk("BO-RT-1003", "Anita Desai", "Anita e-Seva", "9871122334", "Devanahalli", "TRO-03", "DRO-02", false, [0, 0, 0, 0, 0, 0], 0, 1240, 0),
  mk("BO-RT-1008", "Imran Khan", "IK Communications", "9820445566", "Nelamangala", "TRO-04", "DRO-02", true, [30, 12, 68, 20, 2, 1], 760, 3220, 11240),
  mk("BO-RT-1010", "Suresh Babu", "Suresh e-Mitra", "9840667788", "Nelamangala", "TRO-04", "DRO-02", true, [60, 25, 35, 24, 7, 2], 1260, 5310, 24330),
  mk("BO-RT-1011", "Pooja Shetty", "Pooja Online Hub", "9850778899", "Nelamangala", "TRO-04", "DRO-02", true, [38, 15, 58, 30, 3, 1], 880, 3740, 14680),
  mk("BO-RT-1009", "Deepa Nair", "Deepa Digital", "9830556677", "Nelamangala", "TRO-04", "DRO-02", false, [0, 0, 0, 0, 0, 0], 0, 980, 0),
];

export const WEEKLY = [
  { day: "Mon", services: 980, revenue: 142000, commission: 9800 },
  { day: "Tue", services: 1120, revenue: 168000, commission: 11200 },
  { day: "Wed", services: 1340, revenue: 191000, commission: 13400 },
  { day: "Thu", services: 1010, revenue: 151000, commission: 10100 },
  { day: "Fri", services: 1480, revenue: 214000, commission: 14800 },
  { day: "Sat", services: 860, revenue: 119000, commission: 8600 },
  { day: "Sun", services: 540, revenue: 78000, commission: 5400 },
];

export const MONTHLY = [
  { month: "Jan", services: 24800, commission: 248000 },
  { month: "Feb", services: 22100, commission: 221000 },
  { month: "Mar", services: 27600, commission: 276000 },
  { month: "Apr", services: 25900, commission: 259000 },
  { month: "May", services: 29400, commission: 294000 },
  { month: "Jun", services: 31200, commission: 312000 },
];

export function serviceTotal(r: Retailer) {
  return SERVICE_META.reduce((sum, s) => sum + r.today[s.key], 0);
}

export function retailerCommission(r: Retailer) {
  return SERVICE_META.reduce((sum, s) => sum + r.today[s.key] * s.rate, 0);
}

// Commission tax model: 5% TDS + 18% GST deducted from gross commission.
export const COMMISSION_TDS = 0.05;
export const COMMISSION_GST = 0.18;

export function commissionBreakdown(r: Retailer) {
  const gross = Math.round(retailerCommission(r));
  const tds = Math.round(gross * COMMISSION_TDS);
  const gst = Math.round(gross * COMMISSION_GST);
  const payable = gross - tds - gst;
  return { gross, tds, gst, payable };
}

export function servicesUsed(r: Retailer) {
  return SERVICE_META.filter((s) => r.today[s.key] > 0).length;
}

// GP / Ward / Locality mapping per retailer.
export const RETAILER_LOCALITY: Record<string, string> = {
  "BO-RT-1001": "Attibele GP",
  "BO-RT-1002": "Sarjapura Ward 4",
  "BO-RT-1012": "Chandapura Locality",
  "BO-RT-1004": "Sulibele GP",
  "BO-RT-1005": "Nandagudi Ward 2",
  "BO-RT-1006": "Vijayapura GP",
  "BO-RT-1007": "Channarayapatna Ward 7",
  "BO-RT-1003": "Bettakote Locality",
  "BO-RT-1008": "Dabaspete GP",
  "BO-RT-1010": "Thyamagondlu Ward 3",
  "BO-RT-1011": "Sompura Locality",
  "BO-RT-1009": "Solur GP",
};

export function retailerLocality(r: Retailer) {
  return RETAILER_LOCALITY[r.id] ?? `${r.taluk} Locality`;
}

export function aggregateServices(rows: Retailer[]) {
  return SERVICE_META.map((s) => ({
    key: s.key, label: s.label, color: s.color, rate: s.rate,
    count: rows.reduce((sum, r) => sum + r.today[s.key], 0),
    commission: rows.reduce((sum, r) => sum + r.today[s.key] * s.rate, 0),
  }));
}

export function summarize(rows: Retailer[]) {
  return {
    totalRetailers: rows.length,
    activeToday: rows.filter((r) => r.active).length,
    servicesToday: rows.reduce((sum, r) => sum + serviceTotal(r), 0),
    revenueToday: rows.reduce((sum, r) => sum + r.revenue, 0),
    commissionToday: rows.reduce((sum, r) => sum + retailerCommission(r), 0),
    weekServices: rows.reduce((sum, r) => sum + r.week, 0),
    monthServices: rows.reduce((sum, r) => sum + r.month, 0),
  };
}

export function officerSummary(officerId: string) {
  const isDro = officerId.startsWith("DRO");
  const rows = RETAILERS.filter((r) => (isDro ? r.droId === officerId : r.troId === officerId));
  return {
    retailers: rows.length,
    active: rows.filter((r) => r.active).length,
    services: rows.reduce((sum, r) => sum + serviceTotal(r), 0),
    commission: rows.reduce((sum, r) => sum + retailerCommission(r), 0),
    revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
  };
}

export function topRetailers(rows: Retailer[], n = 6) {
  return [...rows]
    .map((r) => ({ name: r.name, count: serviceTotal(r) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function officerCounts() {
  const dros = OFFICERS.filter((o) => o.role === "DRO");
  const tros = OFFICERS.filter((o) => o.role === "TRO");
  return {
    droTotal: dros.length,
    droActive: dros.filter((o) => o.active).length,
    droInactive: dros.filter((o) => !o.active).length,
    troTotal: tros.length,
    troActive: tros.filter((o) => o.active).length,
    troInactive: tros.filter((o) => !o.active).length,
  };
}

export function retailerCounts(rows: Retailer[]) {
  const active = rows.filter((r) => r.active).length;
  const inactive = rows.length - active;
  const pct = rows.length ? Math.round((active / rows.length) * 100) : 0;
  return { total: rows.length, active, inactive, activePct: pct, inactivePct: 100 - pct };
}

export type PeriodKey = "Daily" | "Weekly" | "Monthly" | "Custom";

// Distributor keeps a margin (~22%) of retailer commission as its own revenue.
export const DISTRIBUTOR_MARGIN = 0.22;

export function periodFigures(rows: Retailer[]) {
  const daily = {
    services: rows.reduce((sum, r) => sum + serviceTotal(r), 0),
    commission: rows.reduce((sum, r) => sum + retailerCommission(r), 0),
    revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
  };
  const weeklyServices = rows.reduce((sum, r) => sum + r.week, 0);
  const monthlyServices = rows.reduce((sum, r) => sum + r.month, 0);
  const commPerService = daily.services ? daily.commission / daily.services : 0;
  const revPerService = daily.services ? daily.revenue / daily.services : 0;
  const build = (services: number) => ({
    services,
    commission: Math.round(services * commPerService),
    retailerRevenue: Math.round(services * revPerService),
    distributorRevenue: Math.round(services * commPerService * DISTRIBUTOR_MARGIN),
  });
  return {
    Daily: build(daily.services),
    Weekly: build(weeklyServices),
    Monthly: build(monthlyServices),
  };
}

export function exportRetailersCsv(rows: Retailer[], filename: string) {
  const headers = ["Retailer ID", "Name", "Shop", "Phone", "Taluk", "DRO", "TRO", "Status", ...SERVICE_META.map((s) => s.key), "Total", "Week", "Month", "Revenue", "Commission"];
  const lines = rows.map((r) =>
    [r.id, r.name, r.shop, r.phone, r.taluk,
      OFFICERS.find((o) => o.id === r.droId)?.name ?? "",
      OFFICERS.find((o) => o.id === r.troId)?.name ?? "",
      r.active ? "Active" : "Inactive",
      ...SERVICE_META.map((s) => String(r.today[s.key])),
      String(serviceTotal(r)), String(r.week), String(r.month), String(r.revenue), String(retailerCommission(r)),
    ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
