// Demo/showcase data for the Distributor Portal. Used as a fallback so every
// screen looks populated when the logged-in distributor has no real activity
// yet (purely for previewing the design). Deterministic (seeded) so the numbers
// stay stable across renders.

export type DemoApp = {
  application_no: string; retailer_name: string; service_name: string; category_name: string;
  service_charge: number; distributor_commission_amount: number; status: string; created_at: string;
};
export type DemoRetailer = { id: string; name: string; retailer_id: string; address: string; district: string; is_active: boolean; created_at: string };

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260708);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const SERVICES: [string, string, number, number][] = [
  // name, category, base charge, commission %
  ["AEPS Cash Withdrawal", "AEPS", 500, 2.0],
  ["Money Transfer (DMT)", "DMT", 2000, 1.2],
  ["Mobile Recharge", "Recharges", 199, 4.5],
  ["DTH Recharge", "Recharges", 300, 3.0],
  ["Electricity Bill", "Bill Payments", 750, 1.5],
  ["Water Bill Payment", "Bill Payments", 200, 2.0],
  ["Insurance Premium", "Insurance", 2000, 6.0],
  ["PAN Card Services", "Government Services", 107, 8.0],
  ["Government Services", "Government Services", 500, 5.0],
  ["Travel Booking", "Travel", 1500, 6.0],
];

const R: [string, string, string][] = [
  ["Sai Online Center", "RET001", "Bengaluru Urban"],
  ["Shree Enterprises", "RET015", "Bengaluru Urban"],
  ["Grama One Center", "RET028", "Mysuru"],
  ["Digital Seva Kendra", "RET042", "Mysuru"],
  ["Karnataka Services Hub", "RET063", "Belagavi"],
  ["Namma CSC Point", "RET071", "Belagavi"],
  ["Janatha Digital", "RET084", "Dharwad"],
  ["Vinayaka Online", "RET090", "Dharwad"],
  ["Sri Lakshmi Center", "RET103", "Hubballi"],
  ["Bharath Seva Kendra", "RET118", "Hubballi"],
  ["Ganesh e-Services", "RET125", "Tumakuru"],
  ["Annapurna Digital", "RET132", "Hassan"],
];

export const demoRetailers: DemoRetailer[] = R.map(([name, rid, district], i) => ({
  id: `demo-ret-${i}`, name, retailer_id: rid, address: `${district}, Karnataka`, district,
  is_active: i % 10 !== 0, created_at: new Date(Date.now() - (400 - i * 12) * 864e5).toISOString(),
}));

const STATUSES = ["completed", "completed", "completed", "approved", "approved", "in_progress", "submitted", "rejected"];

export const demoApps: DemoApp[] = (() => {
  const out: DemoApp[] = [];
  let n = 1000;
  SERVICES.forEach(([name, category, base, comm]) => {
    const count = 12 + Math.floor(rnd() * 18);
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(rnd() * 58);
      const charge = Math.round((base * (0.7 + rnd() * 0.8)) / 10) * 10;
      const status = pick(STATUSES);
      const r = pick(demoRetailers);
      out.push({
        application_no: `APP${n++}`,
        retailer_name: r.name,
        service_name: name,
        category_name: category,
        service_charge: charge,
        distributor_commission_amount: Math.round(charge * (comm / 100)),
        status,
        created_at: new Date(Date.now() - daysAgo * 864e5 - Math.floor(rnd() * 12) * 36e5).toISOString(),
      });
    }
  });
  return out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
})();

const isDone = (s: string) => ["completed", "approved"].includes(s);

export const demoSales = (() => {
  const gross = demoApps.reduce((s, a) => s + a.service_charge, 0);
  const earned = demoApps.filter((a) => isDone(a.status)).reduce((s, a) => s + a.distributor_commission_amount, 0);
  const pending = demoApps.filter((a) => !isDone(a.status)).reduce((s, a) => s + a.distributor_commission_amount, 0);
  const byDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); byDay.set(d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), 0); }
  const from14 = Date.now() - 14 * 864e5;
  demoApps.forEach((a) => { const t = new Date(a.created_at); if (t.getTime() >= from14) { const k = t.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); if (byDay.has(k)) byDay.set(k, (byDay.get(k) || 0) + a.service_charge); } });
  const catMap = new Map<string, { amount: number; cnt: number }>();
  demoApps.forEach((a) => { const e = catMap.get(a.category_name) ?? { amount: 0, cnt: 0 }; e.amount += a.service_charge; e.cnt += 1; catMap.set(a.category_name, e); });
  return {
    gross, earned, pending, apps: demoApps.length,
    daily: Array.from(byDay.entries()).map(([d, amount]) => ({ d, amount })),
    by_category: Array.from(catMap.entries()).map(([name, v]) => ({ name, amount: v.amount, cnt: v.cnt })).sort((a, b) => b.amount - a.amount),
  };
})();

export const demoDashboard = {
  retailers: demoRetailers.length,
  active_retailers: demoRetailers.filter((r) => r.is_active).length,
  tro: 6, dro: 3,
  applications: demoApps.length,
  earned: demoSales.earned,
  pending: demoSales.pending,
};

export const demoWallet = 48650;

// List-shaped fallbacks for the Applications / Commissions / Officers screens.
export const demoAppRows = demoApps.map((a) => ({ ...a, payment_verified: isDone(a.status), service_charge: a.service_charge }));
export const demoCommissionRows = demoApps.slice(0, 60).map((a) => ({
  application_no: a.application_no, retailer_name: a.retailer_name, service_name: a.service_name,
  category_name: a.category_name, amount: a.distributor_commission_amount, status: a.status, earned: isDone(a.status),
}));
const OFF: [string, string, string][] = [
  ["Ravi Shankar", "tro", "Bengaluru Urban"], ["Deepa N", "tro", "Mysuru"], ["Manjunath H", "tro", "Belagavi"],
  ["Suresh Kumar", "tro", "Dharwad"], ["Anitha R", "tro", "Hubballi"], ["Prakash B", "tro", "Tumakuru"],
  ["Girish Rao", "dro", "Bengaluru Division"], ["Lakshmi Devi", "dro", "Mysuru Division"], ["Nagaraj S", "dro", "Belagavi Division"],
];
export const demoOfficers = OFF.map(([name, role, district], i) => ({
  id: `demo-off-${i}`, name, role, district,
  apps: 40 + Math.floor(rnd() * 160), earned: 8000 + Math.floor(rnd() * 40000), is_active: i % 8 !== 0,
}));

// ---- Wallet / Commission / GST demo aggregates (for the report screens) ----

const money = (n: number) => Math.round(n);

// Commission by service (earned / paid / pending) from the category totals.
export const demoCommissionByService = demoSales.by_category.map((c) => {
  const earned = money(c.amount * 0.045 * (0.8 + rnd() * 0.4));
  const paid = money(earned * (0.75 + rnd() * 0.2));
  return { name: c.name, cnt: c.cnt, earned, paid, pending: Math.max(0, earned - paid) };
}).sort((a, b) => b.earned - a.earned);

export const demoCommissionTotals = {
  earned: demoCommissionByService.reduce((s, x) => s + x.earned, 0),
  paid: demoCommissionByService.reduce((s, x) => s + x.paid, 0),
  pending: demoCommissionByService.reduce((s, x) => s + x.pending, 0),
  returned: 0,
};

// Top retailers by commission earned.
export const demoTopRetailersByCommission = (() => {
  const m = new Map<string, { count: number; commission: number }>();
  demoApps.forEach((a) => { const e = m.get(a.retailer_name) ?? { count: 0, commission: 0 }; e.count += 1; e.commission += a.distributor_commission_amount; m.set(a.retailer_name, e); });
  return Array.from(m.entries()).map(([name, v]) => ({ name, count: v.count, commission: v.commission })).sort((a, b) => b.commission - a.commission).slice(0, 5);
})();

// Wallet trend (14 days) shaped like the sales daily series but balance-like.
export const demoWalletTrend = (() => {
  let bal = 32000;
  return demoSales.daily.map((d) => { bal = Math.max(12000, bal + (rnd() - 0.42) * 9000); return { day: d.d, value: money(bal) }; });
})();

export const demoWalletTxns = [
  { txn_id: "WLT2405220001", type: "Added", description: "Wallet Top-up (Online)", amount: 20000, date: "22 May 2026, 10:35 AM", balance: 48650, status: "Success" },
  { txn_id: "WLT2405220002", type: "Used", description: "AEPS Payout — Retailer", amount: -2450, date: "22 May 2026, 09:15 AM", balance: 28650, status: "Success" },
  { txn_id: "WLT2405210003", type: "Used", description: "Mobile Recharge Commission settle", amount: -1250, date: "21 May 2026, 08:45 PM", balance: 31100, status: "Success" },
  { txn_id: "WLT2405210004", type: "Added", description: "Bank Transfer", amount: 20000, date: "21 May 2026, 05:20 PM", balance: 32350, status: "Success" },
  { txn_id: "WLT2405200005", type: "Used", description: "DTH Recharge Commission settle", amount: -980, date: "20 May 2026, 11:30 AM", balance: 12350, status: "Success" },
];

export const demoPayouts = [
  { payout_id: "CPY2405220005", date: "22 May 2026", amount: 25680, mode: "Bank Transfer", utr: "SBIN423143201234", status: "Success" },
  { payout_id: "CPY2405180004", date: "18 May 2026", amount: 24560, mode: "Bank Transfer", utr: "SBIN423167834122", status: "Success" },
  { payout_id: "CPY2405080003", date: "08 May 2026", amount: 21450, mode: "Bank Transfer", utr: "SBIN423272854312", status: "Success" },
  { payout_id: "CPY2405010002", date: "01 May 2026", amount: 18450, mode: "Bank Transfer", utr: "SBIN423119785422", status: "Success" },
];

export const demoWalletTotals = {
  balance: demoWallet, added: 125680, used: 77030, closing: demoWallet, hold: 5250, pending: 8760,
  addedCount: 2, usedCount: 18, holdCount: 2, pendingCount: 3,
};

// GST — derive from taxable value (= service charge) at 18% (CGST9+SGST9 intra / IGST18 inter).
export const demoGst = (() => {
  let taxable = 0, cgst = 0, sgst = 0, igst = 0, invoices = 0;
  const svc = new Map<string, { taxable: number; gst: number }>();
  demoApps.forEach((a) => {
    invoices += 1; taxable += a.service_charge;
    const inter = rnd() < 0.4;
    const g = a.service_charge * 0.18;
    if (inter) igst += g; else { cgst += a.service_charge * 0.09; sgst += a.service_charge * 0.09; }
    const e = svc.get(a.service_name) ?? { taxable: 0, gst: 0 }; e.taxable += a.service_charge; e.gst += g; svc.set(a.service_name, e);
  });
  const total = cgst + sgst + igst;
  const byService = Array.from(svc.entries()).map(([name, v]) => ({ name, taxable: money(v.taxable), gst: money(v.gst) })).sort((a, b) => b.gst - a.gst).slice(0, 6);
  // weekly trend
  const trend = demoSales.daily.slice(-7).map((d) => ({ day: d.d, cgst: money(d.amount * 0.09 * 0.6), sgst: money(d.amount * 0.09 * 0.6), igst: money(d.amount * 0.18 * 0.4) }));
  return { taxable: money(taxable), cgst: money(cgst), sgst: money(sgst), igst: money(igst), total: money(total), invoices, byService, trend };
})();

export const demoGstInvoices = [
  { invoice_no: "INV/25-C/001248", date: "22 May 2026", customer: "Ramesh Kumar", taxable: 12450, gst: 1790, type: "B2C" },
  { invoice_no: "INV/25-C/001247", date: "22 May 2026", customer: "Seema Stores", taxable: 9850, gst: 1418, type: "B2C" },
  { invoice_no: "INV/24-C/001246", date: "21 May 2026", customer: "Gupta Store", taxable: 8750, gst: 1260, type: "B2B" },
  { invoice_no: "INV/24-C/001245", date: "21 May 2026", customer: "Mohan Lal", taxable: 7430, gst: 1069, type: "B2C" },
  { invoice_no: "INV/24-C/001244", date: "20 May 2026", customer: "Pooja Agency", taxable: 6890, gst: 992, type: "B2C" },
];

// Commission structure (max rate per service) for the cards.
export const demoCommissionStructure = [
  { name: "Mobile Recharge", rate: "Up to 3.5%" }, { name: "DTH Recharge", rate: "Up to 4.0%" },
  { name: "Electricity Bill", rate: "Up to 2.5%" }, { name: "AEPS", rate: "Up to ₹2.00" },
  { name: "Money Transfer", rate: "Up to ₹5.00" }, { name: "Others", rate: "Up to 2.0%" },
];
