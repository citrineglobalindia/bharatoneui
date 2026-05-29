export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface RegistrationPayment {
  id: string;
  applicantId: string;
  name: string;
  role: "Retailer" | "Distributor";
  phone: string;
  city: string;
  state: string;
  plan: string;
  amount: number;
  gst: number;
  method: "UPI" | "NEFT" | "IMPS" | "RTGS";
  utr: string;
  payerBank: string;
  submittedAt: string;
  status: ApprovalStatus;
  receiptVerified: boolean;
}

export interface ServiceRow {
  id: string;
  name: string;
  category: "Banking" | "Recharge" | "Bills" | "Government" | "Business";
  retailerCost: number;
  customerPrice: number;
  retailerCommission: number;
  distributorCommission: number;
  companyMargin: number;
  active: boolean;
}

export interface WalletRequest {
  id: string;
  name: string;
  role: "Retailer" | "Distributor";
  phone: string;
  amount: number;
  method: "UPI" | "NEFT" | "IMPS" | "RTGS" | "Cash Deposit";
  utr: string;
  bank: string;
  requestedAt: string;
  status: ApprovalStatus;
}

export interface WithdrawalRequest {
  id: string;
  name: string;
  role: "Retailer" | "Distributor";
  phone: string;
  amount: number;
  walletBalance: number;
  accountNo: string;
  ifsc: string;
  bank: string;
  requestedAt: string;
  status: ApprovalStatus;
}

export interface MainAccountRecharge {
  id: string;
  source: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  status: "Credited" | "Pending";
}

export const REGISTRATION_PAYMENTS: RegistrationPayment[] = [
  { id: "BO-REG-7841", applicantId: "BO-KYC-24091", name: "Harshitha N", role: "Retailer", phone: "9876789876", city: "Bengaluru", state: "Karnataka", plan: "New JSKO Retailer Registration", amount: 2999, gst: 540, method: "UPI", utr: "428912776541", payerBank: "HDFC Bank", submittedAt: "2026-05-27 10:35", status: "Pending", receiptVerified: true },
  { id: "BO-REG-7840", applicantId: "BO-KYC-24089", name: "Meera Pillai", role: "Distributor", phone: "9000123456", city: "Kochi", state: "Kerala", plan: "Distributor Onboarding (Zonal)", amount: 24999, gst: 4500, method: "NEFT", utr: "SBIN9921774", payerBank: "Federal Bank", submittedAt: "2026-05-27 09:02", status: "Pending", receiptVerified: true },
  { id: "BO-REG-7839", applicantId: "BO-KYC-24090", name: "Ravi Kumar", role: "Retailer", phone: "9123456780", city: "Hyderabad", state: "Telangana", plan: "New JSKO Retailer Registration", amount: 2999, gst: 540, method: "IMPS", utr: "IMPS5541230", payerBank: "SBI", submittedAt: "2026-05-27 08:40", status: "Pending", receiptVerified: false },
  { id: "BO-REG-7838", applicantId: "BO-KYC-24087", name: "Anita Desai", role: "Retailer", phone: "9871122334", city: "Ahmedabad", state: "Gujarat", plan: "New JSKO Retailer Registration", amount: 2999, gst: 540, method: "UPI", utr: "428771192233", payerBank: "Axis Bank", submittedAt: "2026-05-26 14:08", status: "Approved", receiptVerified: true },
  { id: "BO-REG-7837", applicantId: "BO-KYC-24086", name: "Vikram Singh", role: "Retailer", phone: "9912345678", city: "Jaipur", state: "Rajasthan", plan: "New JSKO Retailer Registration", amount: 2999, gst: 540, method: "UPI", utr: "428001120099", payerBank: "PNB", submittedAt: "2026-05-26 12:31", status: "Rejected", receiptVerified: false },
  { id: "BO-REG-7836", applicantId: "BO-KYC-24080", name: "Sunita Rao", role: "Distributor", phone: "9845001122", city: "Mysuru", state: "Karnataka", plan: "Distributor Onboarding (Taluk)", amount: 14999, gst: 2700, method: "RTGS", utr: "RTGS7741200", payerBank: "Canara Bank", submittedAt: "2026-05-26 11:15", status: "Approved", receiptVerified: true },
];

export const SERVICES: ServiceRow[] = [
  { id: "SVC-AEPS", name: "AEPS Cash Withdrawal", category: "Banking", retailerCost: 0, customerPrice: 0, retailerCommission: 8, distributorCommission: 2, companyMargin: 5, active: true },
  { id: "SVC-DMT", name: "Money Transfer (DMT)", category: "Banking", retailerCost: 5, customerPrice: 10, retailerCommission: 4, distributorCommission: 1, companyMargin: 5, active: true },
  { id: "SVC-RCH", name: "Mobile Recharge", category: "Recharge", retailerCost: 0, customerPrice: 0, retailerCommission: 3, distributorCommission: 0.5, companyMargin: 1.5, active: true },
  { id: "SVC-BBPS", name: "BBPS Bill Payment", category: "Bills", retailerCost: 0, customerPrice: 0, retailerCommission: 2, distributorCommission: 0.5, companyMargin: 1, active: true },
  { id: "SVC-PAN", name: "PAN Card Application", category: "Government", retailerCost: 107, customerPrice: 150, retailerCommission: 30, distributorCommission: 8, companyMargin: 5, active: true },
  { id: "SVC-GST", name: "GST Registration", category: "Business", retailerCost: 500, customerPrice: 1500, retailerCommission: 700, distributorCommission: 150, companyMargin: 150, active: true },
  { id: "SVC-BIZ", name: "Business Registration", category: "Business", retailerCost: 1000, customerPrice: 3500, retailerCommission: 1800, distributorCommission: 400, companyMargin: 300, active: false },
];

export const WALLET_REQUESTS: WalletRequest[] = [
  { id: "BO-WAL-5521", name: "Harshitha N", role: "Retailer", phone: "9876789876", amount: 25000, method: "UPI", utr: "UPI88231140", bank: "HDFC Bank", requestedAt: "2026-05-27 11:02", status: "Pending" },
  { id: "BO-WAL-5520", name: "Meera Pillai", role: "Distributor", phone: "9000123456", amount: 150000, method: "RTGS", utr: "RTGS5512309", bank: "Federal Bank", requestedAt: "2026-05-27 10:18", status: "Pending" },
  { id: "BO-WAL-5519", name: "Ravi Kumar", role: "Retailer", phone: "9123456780", amount: 10000, method: "IMPS", utr: "IMPS3320991", bank: "SBI", requestedAt: "2026-05-27 09:55", status: "Pending" },
  { id: "BO-WAL-5518", name: "Sunita Rao", role: "Distributor", phone: "9845001122", amount: 80000, method: "NEFT", utr: "NEFT1120093", bank: "Canara Bank", requestedAt: "2026-05-27 08:30", status: "Approved" },
  { id: "BO-WAL-5517", name: "Anita Desai", role: "Retailer", phone: "9871122334", amount: 5000, method: "Cash Deposit", utr: "CDM7741", bank: "Axis Bank", requestedAt: "2026-05-26 17:40", status: "Rejected" },
];

export const WITHDRAWALS: WithdrawalRequest[] = [
  { id: "BO-WDL-3312", name: "Harshitha N", role: "Retailer", phone: "9876789876", amount: 18500, walletBalance: 42300, accountNo: "XXXXXX7821", ifsc: "HDFC0001234", bank: "HDFC Bank", requestedAt: "2026-05-27 11:20", status: "Pending" },
  { id: "BO-WDL-3311", name: "Meera Pillai", role: "Distributor", phone: "9000123456", amount: 95000, walletBalance: 210400, accountNo: "XXXXXX5567", ifsc: "FDRL0001188", bank: "Federal Bank", requestedAt: "2026-05-27 10:45", status: "Pending" },
  { id: "BO-WDL-3310", name: "Ravi Kumar", role: "Retailer", phone: "9123456780", amount: 7200, walletBalance: 9800, accountNo: "XXXXXX1145", ifsc: "SBIN0008812", bank: "SBI", requestedAt: "2026-05-27 09:30", status: "Pending" },
  { id: "BO-WDL-3309", name: "Sunita Rao", role: "Distributor", phone: "9845001122", amount: 50000, walletBalance: 120000, accountNo: "XXXXXX9001", ifsc: "CNRB0002211", bank: "Canara Bank", requestedAt: "2026-05-26 16:10", status: "Approved" },
  { id: "BO-WDL-3308", name: "Anita Desai", role: "Retailer", phone: "9871122334", amount: 3000, walletBalance: 2100, accountNo: "XXXXXX2210", ifsc: "UTIB0000045", bank: "Axis Bank", requestedAt: "2026-05-26 14:55", status: "Rejected" },
];

export const MAIN_ACCOUNT_RECHARGES: MainAccountRecharge[] = [
  { id: "BO-MAR-9001", source: "Aggregator Top-up (NSDL)", amount: 5000000, method: "RTGS", reference: "RTGS90012231", date: "2026-05-27 09:00", status: "Credited" },
  { id: "BO-MAR-9000", source: "AEPS Settlement Pool", amount: 2500000, method: "NEFT", reference: "NEFT88120091", date: "2026-05-26 18:30", status: "Credited" },
  { id: "BO-MAR-8999", source: "BBPS Float Recharge", amount: 1000000, method: "IMPS", reference: "IMPS77310022", date: "2026-05-26 12:10", status: "Pending" },
];

export const MAIN_ACCOUNT = {
  balance: 8245000,
  aepsFloat: 3200000,
  bbpsFloat: 980000,
  rechargeFloat: 1450000,
};

export const ACC_WEEKLY = [
  { day: "Mon", credit: 420000, debit: 180000 },
  { day: "Tue", credit: 555000, debit: 220000 },
  { day: "Wed", credit: 610000, debit: 140000 },
  { day: "Thu", credit: 480000, debit: 190000 },
  { day: "Fri", credit: 720000, debit: 240000 },
  { day: "Sat", credit: 380000, debit: 110000 },
  { day: "Sun", credit: 210000, debit: 80000 },
];

export const inr = (n: number) =>
  "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function pendingCount<T extends { status: ApprovalStatus }>(rows: T[]) {
  return rows.filter((r) => r.status === "Pending").length;
}
