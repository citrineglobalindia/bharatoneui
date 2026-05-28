export type TxnStatus = "success" | "pending" | "failed";
export type Txn = {
  id: string;
  date: string;
  service: string;
  customer: string;
  amount: number;
  commission: number;
  status: TxnStatus;
};

export const MOCK_TXNS: Txn[] = [
  { id: "TXN20260528001", date: "28 May 2026, 14:32", service: "AEPS Withdrawal", customer: "Ramesh K. (XXXX1234)", amount: 5000, commission: 12.5, status: "success" },
  { id: "TXN20260528002", date: "28 May 2026, 13:55", service: "Mobile Recharge — Jio", customer: "9876543210", amount: 299, commission: 8.97, status: "success" },
  { id: "TXN20260528003", date: "28 May 2026, 12:14", service: "DMT — IMPS", customer: "Suresh / HDFC", amount: 12500, commission: 35.0, status: "pending" },
  { id: "TXN20260528004", date: "28 May 2026, 11:08", service: "Electricity Bill — BESCOM", customer: "BES7821934", amount: 1840, commission: 4.6, status: "success" },
  { id: "TXN20260528005", date: "28 May 2026, 10:21", service: "DTH Recharge — Tata Play", customer: "1023948572", amount: 450, commission: 13.5, status: "failed" },
  { id: "TXN20260527021", date: "27 May 2026, 18:42", service: "AEPS Balance Enquiry", customer: "Lakshmi N. (XXXX5566)", amount: 0, commission: 2.0, status: "success" },
  { id: "TXN20260527020", date: "27 May 2026, 17:15", service: "Gas Bill — IOC", customer: "GAS882134", amount: 1100, commission: 5.5, status: "success" },
  { id: "TXN20260527019", date: "27 May 2026, 16:08", service: "PAN Application", customer: "Manoj P.", amount: 199, commission: 60.0, status: "success" },
  { id: "TXN20260527018", date: "27 May 2026, 14:52", service: "GST Filing — GSTR-3B", customer: "Sundar Traders", amount: 499, commission: 100.0, status: "pending" },
  { id: "TXN20260527017", date: "27 May 2026, 11:33", service: "Money Transfer — NEFT", customer: "Anitha / SBI", amount: 8200, commission: 22.0, status: "success" },
];

export type Application = {
  id: string;
  type: string;
  applicant: string;
  submitted: string;
  status: "Approved" | "In Review" | "Documents Pending" | "Rejected";
};

export const MOCK_APPLICATIONS: Application[] = [
  { id: "APP-GST-1042", type: "GST Registration", applicant: "Sundar Traders", submitted: "24 May 2026", status: "In Review" },
  { id: "APP-PAN-2199", type: "PAN — New Application", applicant: "Manoj P.", submitted: "23 May 2026", status: "Approved" },
  { id: "APP-MSME-0381", type: "Udyam Registration", applicant: "Bharat Kirana", submitted: "22 May 2026", status: "Documents Pending" },
  { id: "APP-ITR-0552", type: "ITR Filing — AY 2025-26", applicant: "Kavya R.", submitted: "20 May 2026", status: "Approved" },
  { id: "APP-FSSAI-0094", type: "FSSAI Basic License", applicant: "Tea Point Cafe", submitted: "18 May 2026", status: "Rejected" },
  { id: "APP-DSC-0210", type: "Digital Signature — Class 3", applicant: "Ravi S.", submitted: "17 May 2026", status: "Approved" },
];

export type Ticket = {
  id: string;
  subject: string;
  category: string;
  created: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved";
};

export const MOCK_TICKETS: Ticket[] = [
  { id: "TKT-9821", subject: "AEPS settlement delayed", category: "Financial", created: "28 May 2026", priority: "High", status: "In Progress" },
  { id: "TKT-9810", subject: "Wallet load not credited", category: "Wallet", created: "27 May 2026", priority: "High", status: "Open" },
  { id: "TKT-9795", subject: "GST filing certificate not received", category: "Business", created: "25 May 2026", priority: "Medium", status: "Resolved" },
  { id: "TKT-9774", subject: "Unable to login on mobile", category: "Account", created: "22 May 2026", priority: "Low", status: "Resolved" },
];

export const WEEKLY_VOLUME = [
  { day: "Mon", txns: 18, value: 24500 },
  { day: "Tue", txns: 24, value: 31800 },
  { day: "Wed", txns: 31, value: 42600 },
  { day: "Thu", txns: 22, value: 28900 },
  { day: "Fri", txns: 38, value: 51200 },
  { day: "Sat", txns: 45, value: 64300 },
  { day: "Sun", txns: 29, value: 36100 },
];

export const SERVICE_SPLIT = [
  { name: "AEPS", value: 42, color: "#0ea5e9" },
  { name: "DMT", value: 23, color: "#f59e0b" },
  { name: "Recharge", value: 18, color: "#10b981" },
  { name: "BBPS", value: 12, color: "#f97316" },
  { name: "Business", value: 5, color: "#8b5cf6" },
];

export const OPERATORS = [
  "Jio", "Airtel", "Vi (Vodafone Idea)", "BSNL", "MTNL",
];

export const DTH_OPERATORS = [
  "Tata Play", "Airtel Digital TV", "Dish TV", "d2h", "Sun Direct",
];

export const BILLERS = [
  { category: "Electricity", names: ["BESCOM", "MSEB", "TNEB", "TSSPDCL", "WBSEDCL"] },
  { category: "Gas", names: ["Indane", "HP Gas", "Bharat Gas", "Adani Gas"] },
  { category: "Water", names: ["BWSSB", "DJB", "BMC Water"] },
  { category: "Broadband", names: ["Jio Fiber", "Airtel Xstream", "ACT Fibernet", "BSNL Broadband"] },
  { category: "Insurance", names: ["LIC India", "HDFC Life", "SBI Life", "ICICI Prudential"] },
];

export const BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank",
  "Bank of Baroda", "Canara Bank", "Union Bank of India", "Kotak Mahindra Bank", "Yes Bank",
];

export function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}