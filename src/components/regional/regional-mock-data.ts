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