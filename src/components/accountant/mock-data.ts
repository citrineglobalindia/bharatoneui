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

export const REGISTRATION_PAYMENTS: RegistrationPayment[] = [];

export const SERVICES: ServiceRow[] = [];

export const WALLET_REQUESTS: WalletRequest[] = [];

export const WITHDRAWALS: WithdrawalRequest[] = [];

export const MAIN_ACCOUNT_RECHARGES: MainAccountRecharge[] = [];

export const MAIN_ACCOUNT = {
  balance: 0,
  aepsFloat: 0,
  bbpsFloat: 0,
  rechargeFloat: 0,
};

export const ACC_WEEKLY = [
  { day: "Mon", credit: 0, debit: 0 },
  { day: "Tue", credit: 0, debit: 0 },
  { day: "Wed", credit: 0, debit: 0 },
  { day: "Thu", credit: 0, debit: 0 },
  { day: "Fri", credit: 0, debit: 0 },
  { day: "Sat", credit: 0, debit: 0 },
  { day: "Sun", credit: 0, debit: 0 },
];

export const inr = (n: number) =>
  "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function pendingCount<T extends { status: ApprovalStatus }>(rows: T[]) {
  return rows.filter((r) => r.status === "Pending").length;
}
