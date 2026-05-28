export type KycStatus = "Pending Review" | "In Review" | "Approved" | "Rejected" | "On Hold";
export type RiskLevel = "Low" | "Medium" | "High";

export interface KycApplicant {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  city: string;
  state: string;
  pincode: string;
  submittedAt: string;
  status: KycStatus;
  risk: RiskLevel;
  matchScore: number; // 0-100 face match
  livenessScore: number;
  channel: "Retailer" | "Distributor" | "Master Distributor";
  aadhaar: string;
  pan: string;
  gst?: string;
  bank: { name: string; ifsc: string; account: string };
  documents: { label: string; type: string; size: string; verified: boolean }[];
  flags: string[];
  assignedTo?: string;
  // ---- Extended onboarding profile ----
  personal?: {
    firstName: string;
    middleName?: string;
    surname: string;
    gender: "Male" | "Female" | "Other";
    fatherName?: string;
    maritalStatus?: string;
    nationality?: string;
  };
  account?: {
    username: string;
    emailVerified: boolean;
    mobileVerified: boolean;
    referralCode?: string;
    registeredOn: string;
  };
  address?: {
    type: "Urban" | "Rural";
    shopName: string;
    building?: string;
    street?: string;
    ward?: string;
    landmark?: string;
    village?: string;
    gramPanchayat?: string;
    hobli?: string;
    postOffice?: string;
    taluk?: string;
    district: string;
    geo?: { lat: number; lng: number; capturedAt: string };
  };
  entity?: {
    name: string;
    type: string;
    dateOfIncorporation?: string;
    pan: string;
    cin?: string;
    gstin?: string;
    website?: string;
    udyam?: string;
    fssai?: string;
  };
  bankDetails?: {
    holder: string;
    accountType: "Savings" | "Current";
    branch?: string;
    reEntered: boolean;
    pennyDropAt?: string;
    pennyDropAmount?: string;
  };
  payment?: {
    method: "UPI" | "NEFT" | "IMPS" | "RTGS";
    date: string;
    utr: string;
    payerName: string;
    payerBank?: string;
    payerAccount?: string;
    amount: string;
    remarks?: string;
    receiptVerified: boolean;
  };
  videoKyc?: {
    completedAt: string;
    durationSec: number;
    agent: string;
    geoMatch: boolean;
    randomCodeMatch: boolean;
    languageSpoken: string;
    randomCode?: string;
    declarationAccepted?: boolean;
    livenessPassed?: boolean;
    faceMatchVsAadhaar?: number;
    idShownOnCamera?: "Aadhaar" | "PAN" | "Both";
    geoCoords?: { lat: number; lng: number };
    videoSizeMB?: number;
  };
  selfie?: {
    capturedAt: string;
    geoMatch: boolean;
    deviceModel: string;
    livenessScore?: number;
    faceMatchVsAadhaar?: number;
    blurScore?: number;
    brightnessScore?: number;
    geoCoords?: { lat: number; lng: number };
    galleryUploadBlocked?: boolean;
  };
  consents?: { label: string; acceptedAt: string }[];
  deviceMeta?: {
    ip: string;
    device: string;
    os: string;
    appVersion: string;
    location: string;
  };
  charges?: {
    plan: string;
    items: { label: string; amount: number; gstPct?: number }[];
    receiptId: string;
    paidAt: string;
    paidVia: string;
  };
}

export const QC_APPLICANTS: KycApplicant[] = [
  {
    id: "BO-KYC-24091",
    name: "Harshitha N",
    phone: "9876789876",
    email: "harshitha@bharatone.in",
    dob: "28/02/2001",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560058",
    submittedAt: "2026-05-27 10:42",
    status: "Pending Review",
    risk: "Low",
    matchScore: 97,
    livenessScore: 99,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 4421",
    pan: "ABCDE1234F",
    gst: "29ABCDE1234F1Z5",
    bank: { name: "HDFC Bank", ifsc: "HDFC0001234", account: "XXXXXX7821" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "412 KB", verified: true },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "388 KB", verified: true },
      { label: "PAN Card", type: "image/jpeg", size: "256 KB", verified: true },
      { label: "Shop Photo", type: "image/jpeg", size: "1.1 MB", verified: true },
      { label: "Cancelled Cheque", type: "application/pdf", size: "188 KB", verified: false },
      { label: "Selfie", type: "image/jpeg", size: "302 KB", verified: true },
      { label: "Video KYC", type: "video/mp4", size: "4.2 MB", verified: true },
    ],
    flags: [],
    personal: {
      firstName: "Harshitha", middleName: "", surname: "N",
      gender: "Female", fatherName: "Narayan Murthy",
      maritalStatus: "Single", nationality: "Indian",
    },
    account: {
      username: "harshitha.n", emailVerified: true, mobileVerified: true,
      referralCode: "BO-REF-2284", registeredOn: "2026-05-27 09:58",
    },
    address: {
      type: "Urban", shopName: "Sri Sai Mobile World",
      building: "#42, 1st Floor, Sai Complex", street: "MG Road",
      ward: "Ward 14", landmark: "Opp Reliance Fresh",
      taluk: "Bengaluru North", district: "Bengaluru Urban",
      geo: { lat: 12.9716, lng: 77.5946, capturedAt: "2026-05-27 10:21" },
    },
    entity: {
      name: "Sri Sai Enterprises", type: "Proprietorship",
      dateOfIncorporation: "2019-04-12", pan: "ABCDE1234F",
      gstin: "29ABCDE1234F1Z5", udyam: "UDYAM-KR-03-0012345",
      fssai: "10012021000123", website: "srisai.example.in",
    },
    bankDetails: {
      holder: "Harshitha N", accountType: "Savings", branch: "Yeshwanthpur",
      reEntered: true, pennyDropAt: "2026-05-27 10:30", pennyDropAmount: "₹1.00",
    },
    payment: {
      method: "UPI", date: "2026-05-27 10:35", utr: "428912776541",
      payerName: "Harshitha N", payerBank: "HDFC Bank",
      payerAccount: "harshitha@okhdfc", amount: "₹2,999",
      remarks: "Onboarding fee", receiptVerified: true,
    },
    videoKyc: {
      completedAt: "2026-05-27 10:40", durationSec: 84, agent: "Agent ID VKA-22",
      geoMatch: true, randomCodeMatch: true, languageSpoken: "Kannada",
    },
    selfie: { capturedAt: "2026-05-27 10:25", geoMatch: true, deviceModel: "Redmi Note 12" },
    consents: [
      { label: "Terms & Conditions", acceptedAt: "2026-05-27 09:58" },
      { label: "Privacy Policy", acceptedAt: "2026-05-27 09:58" },
      { label: "Aadhaar e-KYC Consent", acceptedAt: "2026-05-27 10:05" },
      { label: "Penny-drop Authorisation", acceptedAt: "2026-05-27 10:30" },
    ],
    deviceMeta: {
      ip: "103.21.58.214", device: "Redmi Note 12", os: "Android 13",
      appVersion: "BharatOne v3.4.1", location: "Bengaluru, KA",
    },
  },
  {
    id: "BO-KYC-24090",
    name: "Ravi Kumar",
    phone: "9123456780",
    email: "ravi.kumar@example.in",
    dob: "14/06/1995",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500001",
    submittedAt: "2026-05-27 09:18",
    status: "In Review",
    risk: "Medium",
    matchScore: 82,
    livenessScore: 91,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 9981",
    pan: "PQRSX9876T",
    bank: { name: "SBI", ifsc: "SBIN0008812", account: "XXXXXX1145" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "402 KB", verified: true },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "374 KB", verified: true },
      { label: "PAN Card", type: "image/jpeg", size: "298 KB", verified: true },
      { label: "Selfie", type: "image/jpeg", size: "311 KB", verified: true },
      { label: "Video KYC", type: "video/mp4", size: "3.8 MB", verified: false },
    ],
    flags: ["Address mismatch with Aadhaar"],
    assignedTo: "QC Reviewer",
  },
  {
    id: "BO-KYC-24089",
    name: "Meera Pillai",
    phone: "9000123456",
    email: "meera.p@example.in",
    dob: "02/11/1992",
    city: "Kochi",
    state: "Kerala",
    pincode: "682016",
    submittedAt: "2026-05-27 08:55",
    status: "Pending Review",
    risk: "Low",
    matchScore: 95,
    livenessScore: 96,
    channel: "Distributor",
    aadhaar: "XXXX XXXX 7733",
    pan: "MEEPA4521K",
    gst: "32MEEPA4521K1ZB",
    bank: { name: "Federal Bank", ifsc: "FDRL0001188", account: "XXXXXX5567" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "421 KB", verified: true },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "395 KB", verified: true },
      { label: "PAN Card", type: "image/jpeg", size: "248 KB", verified: true },
      { label: "GST Certificate", type: "application/pdf", size: "612 KB", verified: true },
      { label: "Shop Photo", type: "image/jpeg", size: "980 KB", verified: true },
      { label: "Selfie", type: "image/jpeg", size: "284 KB", verified: true },
      { label: "Video KYC", type: "video/mp4", size: "5.1 MB", verified: true },
    ],
    flags: [],
  },
  {
    id: "BO-KYC-24088",
    name: "Suresh Patil",
    phone: "9988776655",
    email: "suresh.patil@example.in",
    dob: "21/09/1988",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    submittedAt: "2026-05-26 17:22",
    status: "On Hold",
    risk: "High",
    matchScore: 64,
    livenessScore: 71,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 3320",
    pan: "SURPP1199Q",
    bank: { name: "ICICI Bank", ifsc: "ICIC0004411", account: "XXXXXX9921" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "388 KB", verified: false },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "402 KB", verified: false },
      { label: "PAN Card", type: "image/jpeg", size: "276 KB", verified: true },
      { label: "Selfie", type: "image/jpeg", size: "291 KB", verified: false },
      { label: "Video KYC", type: "video/mp4", size: "2.9 MB", verified: false },
    ],
    flags: ["Low face match score", "Blurred Aadhaar image", "Liveness suspicious"],
    assignedTo: "QC Reviewer",
  },
  {
    id: "BO-KYC-24087",
    name: "Anita Desai",
    phone: "9871122334",
    email: "anita.d@example.in",
    dob: "08/03/1990",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    submittedAt: "2026-05-26 14:08",
    status: "Approved",
    risk: "Low",
    matchScore: 98,
    livenessScore: 99,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 5566",
    pan: "ANITA8821B",
    bank: { name: "Axis Bank", ifsc: "UTIB0000045", account: "XXXXXX2210" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "415 KB", verified: true },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "392 KB", verified: true },
      { label: "PAN Card", type: "image/jpeg", size: "260 KB", verified: true },
      { label: "Selfie", type: "image/jpeg", size: "298 KB", verified: true },
      { label: "Video KYC", type: "video/mp4", size: "4.8 MB", verified: true },
    ],
    flags: [],
  },
  {
    id: "BO-KYC-24086",
    name: "Vikram Singh",
    phone: "9912345678",
    email: "vikram.s@example.in",
    dob: "12/12/1985",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    submittedAt: "2026-05-26 12:31",
    status: "Rejected",
    risk: "High",
    matchScore: 52,
    livenessScore: 60,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 2211",
    pan: "VIKRA4422Z",
    bank: { name: "PNB", ifsc: "PUNB0123400", account: "XXXXXX0099" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "362 KB", verified: false },
      { label: "PAN Card", type: "image/jpeg", size: "240 KB", verified: false },
      { label: "Selfie", type: "image/jpeg", size: "280 KB", verified: false },
      { label: "Video KYC", type: "video/mp4", size: "2.1 MB", verified: false },
    ],
    flags: ["Identity mismatch", "Document tampering suspected"],
  },
  {
    id: "BO-KYC-24085",
    name: "Priya Sharma",
    phone: "9090909090",
    email: "priya.s@example.in",
    dob: "30/07/1996",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226001",
    submittedAt: "2026-05-26 11:00",
    status: "Pending Review",
    risk: "Low",
    matchScore: 94,
    livenessScore: 97,
    channel: "Retailer",
    aadhaar: "XXXX XXXX 8844",
    pan: "PRIYA1100M",
    bank: { name: "Kotak Mahindra", ifsc: "KKBK0000789", account: "XXXXXX4488" },
    documents: [
      { label: "Aadhaar (Front)", type: "image/jpeg", size: "418 KB", verified: true },
      { label: "Aadhaar (Back)", type: "image/jpeg", size: "390 KB", verified: true },
      { label: "PAN Card", type: "image/jpeg", size: "252 KB", verified: true },
      { label: "Selfie", type: "image/jpeg", size: "295 KB", verified: true },
      { label: "Video KYC", type: "video/mp4", size: "4.4 MB", verified: true },
    ],
    flags: [],
  },
];

export const QC_WEEKLY = [
  { day: "Mon", approved: 42, rejected: 6, pending: 18 },
  { day: "Tue", approved: 55, rejected: 8, pending: 22 },
  { day: "Wed", approved: 61, rejected: 5, pending: 14 },
  { day: "Thu", approved: 48, rejected: 9, pending: 19 },
  { day: "Fri", approved: 72, rejected: 7, pending: 24 },
  { day: "Sat", approved: 38, rejected: 4, pending: 11 },
  { day: "Sun", approved: 21, rejected: 2, pending: 8 },
];

export const QC_RISK_SPLIT = [
  { name: "Low", value: 312, color: "#10b981" },
  { name: "Medium", value: 88, color: "#f59e0b" },
  { name: "High", value: 21, color: "#ef4444" },
];

export function getApplicant(id: string) {
  return QC_APPLICANTS.find((a) => a.id === id);
}