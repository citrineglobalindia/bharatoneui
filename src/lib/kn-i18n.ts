// Native English → Kannada / Hindi translation for the portal — no Google
// Translate. A curated dictionary translates exact text nodes; numbers/amounts
// (digits) are left untouched, so ₹ values stay in Latin digits with translated
// labels. A MutationObserver keeps translating content that React renders after
// route changes or data loads. Any language can be switched to any other:
// the current text node is first normalised back to English, then mapped to the
// target language, so en⇄kn⇄hi all work without a page reload.

export type Lang = "en" | "kn" | "hi";
const STORAGE_KEY = "bharatone:lang";

// English → Kannada. Keys are matched against trimmed text-node content (exact).
export const EN_TO_KN: Record<string, string> = {
  // Sidebar sections + items
  "MAIN": "ಮುಖ್ಯ",
  "Main": "ಮುಖ್ಯ",
  "Services": "ಸೇವೆಗಳು",
  "Finance": "ಹಣಕಾಸು",
  "Support": "ಬೆಂಬಲ",
  "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
  "KYC Docs": "KYC ದಾಖಲೆಗಳು",
  "KYC Documents": "KYC ದಾಖಲೆಗಳು",
  "My Services": "ನನ್ನ ಸೇವೆಗಳು",
  "New Application": "ಹೊಸ ಅರ್ಜಿ",
  "My Applications": "ನನ್ನ ಅರ್ಜಿಗಳು",
  "Wallet": "ವಾಲೆಟ್",
  "AEPS Banking": "AEPS ಬ್ಯಾಂಕಿಂಗ್",
  "Transactions": "ವಹಿವಾಟುಗಳು",
  "Reports": "ವರದಿಗಳು",
  "Support Tickets": "ಬೆಂಬಲ ಟಿಕೆಟ್‌ಗಳು",
  "Feedback": "ಪ್ರತಿಕ್ರಿಯೆ",
  "Notifications": "ಅಧಿಸೂಚನೆಗಳು",

  // Dashboard header
  "Here's what's happening with your business today.": "ಇಂದು ನಿಮ್ಮ ವ್ಯವಹಾರದಲ್ಲಿ ಏನು ನಡೆಯುತ್ತಿದೆ ಎಂಬುದು ಇಲ್ಲಿದೆ.",
  "My Wallet": "ನನ್ನ ವಾಲೆಟ್",
  "New Request": "ಹೊಸ ವಿನಂತಿ",
  "+ New Request": "+ ಹೊಸ ವಿನಂತಿ",

  // Stat cards
  "Wallet Balance": "ವಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್",
  "Today's Transactions": "ಇಂದಿನ ವಹಿವಾಟುಗಳು",
  "Earned Commission": "ಗಳಿಸಿದ ಕಮಿಷನ್",
  "Applications": "ಅರ್ಜಿಗಳು",
  "Services & Applications": "ಸೇವೆಗಳು ಮತ್ತು ಅರ್ಜಿಗಳು",
  "This month": "ಈ ತಿಂಗಳು",
  "Today": "ಇಂದು",
  "Total": "ಒಟ್ಟು",
  "Pending": "ಬಾಕಿ ಇದೆ",
  "Approved": "ಅನುಮೋದಿಸಲಾಗಿದೆ",
  "Rejected": "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
  "Completed": "ಪೂರ್ಣಗೊಂಡಿದೆ",
  "In Progress": "ಪ್ರಗತಿಯಲ್ಲಿದೆ",
  "Credit": "ಜಮಾ",
  "Debit": "ಖರ್ಚು",

  // KYC card
  "Verify the Aadhaar, PAN, Shop Photo and Video KYC status you submitted during registration.":
    "ನೋಂದಣಿ ಸಮಯದಲ್ಲಿ ನೀವು ಸಲ್ಲಿಸಿದ ಆಧಾರ್, ಪ್ಯಾನ್, ಅಂಗಡಿ ಫೋಟೋ ಮತ್ತು ವೀಡಿಯೊ KYC ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
  "View documents": "ದಾಖಲೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ",

  // Notice + summary
  "Important Notice from BharatOne": "ಭಾರತ್‌ಒನ್‌ನಿಂದ ಪ್ರಮುಖ ಸೂಚನೆ",
  "Dear Retailer,": "ಪ್ರಿಯ ಚಿಲ್ಲರೆ ವ್ಯಾಪಾರಿ,",
  "Transaction Summary": "ವಹಿವಾಟಿನ ಸಾರಾಂಶ",
  "Your transaction performance": "ನಿಮ್ಮ ವಹಿವಾಟಿನ ಕಾರ್ಯಕ್ಷಮತೆ",
  "Monthly Target Progress": "ಮಾಸಿಕ ಗುರಿ ಪ್ರಗತಿ",

  // Profile menu
  "My Profile": "ನನ್ನ ಪ್ರೊಫೈಲ್",
  "Personal details": "ವೈಯಕ್ತಿಕ ವಿವರಗಳು",
  "Identity & verification": "ಗುರುತು ಮತ್ತು ಪರಿಶೀಲನೆ",
  "Balance & top-up": "ಬ್ಯಾಲೆನ್ಸ್ ಮತ್ತು ಟಾಪ್-ಅಪ್",
  "Service requests": "ಸೇವಾ ವಿನಂತಿಗಳು",
  "Security": "ಭದ್ರತೆ",
  "Password & 2FA": "ಪಾಸ್‌ವರ್ಡ್ ಮತ್ತು 2FA",
  "Settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
  "Sign out": "ಸೈನ್ ಔಟ್",
  "Retailer": "ಚಿಲ್ಲರೆ ವ್ಯಾಪಾರಿ",

  // Common actions / labels
  "Refresh": "ರಿಫ್ರೆಶ್",
  "Save": "ಉಳಿಸಿ",
  "Cancel": "ರದ್ದುಮಾಡಿ",
  "Submit": "ಸಲ್ಲಿಸಿ",
  "Continue": "ಮುಂದುವರಿಸಿ",
  "Back": "ಹಿಂದೆ",
  "Next": "ಮುಂದೆ",
  "Close": "ಮುಚ್ಚಿ",
  "Search": "ಹುಡುಕಿ",
  "Amount": "ಮೊತ್ತ",
  "Balance": "ಬ್ಯಾಲೆನ್ಸ್",
  "Date": "ದಿನಾಂಕ",
  "Status": "ಸ್ಥಿತಿ",
  "Details": "ವಿವರಗಳು",
  "Description": "ವಿವರಣೆ",
  "Type": "ಪ್ರಕಾರ",
  "Recharge": "ರೀಚಾರ್ಜ್",
  "Request Top-up": "ಟಾಪ್-ಅಪ್ ವಿನಂತಿಸಿ",
  "Top-up": "ಟಾಪ್-ಅಪ್",
  "Withdraw": "ಹಿಂಪಡೆಯಿರಿ",
  "Pay online": "ಆನ್‌ಲೈನ್ ಪಾವತಿಸಿ",
  "Recent Transactions": "ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು",
  "No transactions yet.": "ಇನ್ನೂ ಯಾವುದೇ ವಹಿವಾಟುಗಳಿಲ್ಲ.",
  "Loading…": "ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
  "Loading...": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",

  // Dashboard
  "All Services": "ಎಲ್ಲಾ ಸೇವೆಗಳು",
  "All time": "ಎಲ್ಲಾ ಸಮಯ",
  "Custom range": "ಕಸ್ಟಮ್ ಶ್ರೇಣಿ",
  "Last 7 days": "ಕಳೆದ 7 ದಿನಗಳು",
  "Last 30 days": "ಕಳೆದ 30 ದಿನಗಳು",
  "Last 7 days · service charges": "ಕಳೆದ 7 ದಿನಗಳು · ಸೇವಾ ಶುಲ್ಕಗಳು",
  "Commission & Applications:": "ಕಮಿಷನ್ ಮತ್ತು ಅರ್ಜಿಗಳು:",
  "GST, PAN, Business registration status": "ಜಿಎಸ್‌ಟಿ, ಪ್ಯಾನ್, ವ್ಯಾಪಾರ ನೋಂದಣಿ ಸ್ಥಿತಿ",
  "KYC Verified": "KYC ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
  "Recent Applications": "ಇತ್ತೀಚಿನ ಅರ್ಜಿಗಳು",
  "No applications yet": "ಇನ್ನೂ ಯಾವುದೇ ಅರ್ಜಿಗಳಿಲ್ಲ",
  "No applications yet. Start with “+ New Request”.": "ಇನ್ನೂ ಯಾವುದೇ ಅರ್ಜಿಗಳಿಲ್ಲ. “+ ಹೊಸ ವಿನಂತಿ” ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ.",
  "Service Mix": "ಸೇವಾ ಮಿಶ್ರಣ",
  "Share by category": "ವರ್ಗದ ಪ್ರಕಾರ ಹಂಚಿಕೆ",
  "Weekly Application Volume": "ಸಾಪ್ತಾಹಿಕ ಅರ್ಜಿ ಪ್ರಮಾಣ",
  "Citizen Participation": "ನಾಗರಿಕ ಭಾಗವಹಿಸುವಿಕೆ",
  "Branding": "ಬ್ರ್ಯಾಂಡಿಂಗ್",
  "Timings": "ಸಮಯಗಳು",
  "Low wallet balance.": "ವಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್ ಕಡಿಮೆ ಇದೆ.",

  // Wallet
  "Add funds": "ಹಣ ಸೇರಿಸಿ",
  "Add Funds": "ಹಣ ಸೇರಿಸಿ",
  "Withdraw Funds": "ಹಣ ಹಿಂಪಡೆಯಿರಿ",
  "Available Balance": "ಲಭ್ಯ ಬ್ಯಾಲೆನ್ಸ್",
  "Main account balance": "ಮುಖ್ಯ ಖಾತೆ ಬ್ಯಾಲೆನ್ಸ್",
  "Top-up Requests": "ಟಾಪ್-ಅಪ್ ವಿನಂತಿಗಳು",
  "Transaction Receipt": "ವಹಿವಾಟು ರಸೀದಿ",
  "Upload receipt": "ರಸೀದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
  "Date of Transaction": "ವಹಿವಾಟಿನ ದಿನಾಂಕ",
  "Reference / UTR": "ಉಲ್ಲೇಖ / UTR",
  "Request Withdrawal": "ಹಿಂಪಡೆಯುವಿಕೆಗೆ ವಿನಂತಿಸಿ",
  "Pay online (Razorpay)": "ಆನ್‌ಲೈನ್ ಪಾವತಿಸಿ (Razorpay)",
  "Cash Deposit": "ನಗದು ಠೇವಣಿ",
  "Bank Transfer": "ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ",
  "Wallet Amount": "ವಾಲೆಟ್ ಮೊತ್ತ",
  "Deducted Amount": "ಕಡಿತಗೊಳಿಸಿದ ಮೊತ್ತ",
  "after the accountant verifies the payment": "ಅಕೌಂಟೆಂಟ್ ಪಾವತಿಯನ್ನು ಪರಿಶೀಲಿಸಿದ ನಂತರ",

  // Table headers / common labels
  "Application ID": "ಅರ್ಜಿ ಐಡಿ",
  "Service Name": "ಸೇವೆಯ ಹೆಸರು",
  "Reference": "ಉಲ್ಲೇಖ",
  "Method": "ವಿಧಾನ",
  "Time": "ಸಮಯ",
  "Both": "ಎರಡೂ",
  "Verified": "ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
  "Requested": "ವಿನಂತಿಸಲಾಗಿದೆ",
  "Verify": "ಪರಿಶೀಲಿಸಿ",
  "Reject": "ತಿರಸ್ಕರಿಸಿ",
  "Approve": "ಅನುಮೋದಿಸಿ",
  "View": "ವೀಕ್ಷಿಸಿ",
  "Open": "ತೆರೆಯಿರಿ",
  "Download": "ಡೌನ್‌ಲೋಡ್",
  "Export": "ರಫ್ತು",
  "All": "ಎಲ್ಲಾ",
  "Name": "ಹೆಸರು",
  "Phone": "ಫೋನ್",
  "Email": "ಇಮೇಲ್",
  "Address": "ವಿಳಾಸ",
  "Subject": "ವಿಷಯ",
  "Message": "ಸಂದೇಶ",
  "Attachments": "ಲಗತ್ತುಗಳು",
  "Submit Ticket": "ಟಿಕೆಟ್ ಸಲ್ಲಿಸಿ",
  "Raise a Ticket": "ಟಿಕೆಟ್ ಎತ್ತಿ",
  "Category": "ವರ್ಗ",
  "Sub-Category": "ಉಪ-ವರ್ಗ",
  "Product / Service": "ಉತ್ಪನ್ನ / ಸೇವೆ",
  "Describe the issue": "ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ",
  "My Tickets": "ನನ್ನ ಟಿಕೆಟ್‌ಗಳು",
  "Assigned to me": "ನನಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ",
  "Call us": "ನಮಗೆ ಕರೆ ಮಾಡಿ",
  "Live Chat": "ಲೈವ್ ಚಾಟ್",
  "Your Tickets": "ನಿಮ್ಮ ಟಿಕೆಟ್‌ಗಳು",
};

// ── Public / pre-login marketing pages (Navbar, Hero, Services, Schemes, About,
// Contact, Careers, Footer, Login, Get-started, Register). Merged into EN_TO_KN.
const PUBLIC_KN: Record<string, string> = {
  // Navbar
  "Home": "ಮುಖಪುಟ",
  "About": "ನಮ್ಮ ಬಗ್ಗೆ",
  "Gallery": "ಗ್ಯಾಲರಿ",
  "Schemes": "ಯೋಜನೆಗಳು",
  "Careers": "ವೃತ್ತಿ ಅವಕಾಶಗಳು",
  "Contact": "ಸಂಪರ್ಕ",
  "Login": "ಲಾಗಿನ್",
  "Register Center": "ಕೇಂದ್ರ ನೋಂದಣಿ",
  "Register Your Center": "ನಿಮ್ಮ ಕೇಂದ್ರವನ್ನು ನೋಂದಾಯಿಸಿ",
  "Aadhaar & PAN": "ಆಧಾರ್ ಮತ್ತು ಪ್ಯಾನ್",
  "Enrolment, updates & linking": "ನೋಂದಣಿ, ನವೀಕರಣ ಮತ್ತು ಜೋಡಣೆ",
  "Ayushman Bharat": "ಆಯುಷ್ಮಾನ್ ಭಾರತ್",
  "Health card & insurance": "ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಮತ್ತು ವಿಮೆ",
  "Education": "ಶಿಕ್ಷಣ",
  "Scholarships & admissions": "ವಿದ್ಯಾರ್ಥಿವೇತನ ಮತ್ತು ಪ್ರವೇಶ",
  "Banking & DBT": "ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಡಿಬಿಟಿ",
  "Jan Dhan, pensions, subsidies": "ಜನ್ ಧನ್, ಪಿಂಚಣಿ, ಸಬ್ಸಿಡಿಗಳು",
  "Farmer Services": "ರೈತ ಸೇವೆಗಳು",
  "PM-KISAN, crop insurance": "ಪಿಎಂ-ಕಿಸಾನ್, ಬೆಳೆ ವಿಮೆ",
  "Employment": "ಉದ್ಯೋಗ",
  "Skill India, MGNREGA, jobs": "ಸ್ಕಿಲ್ ಇಂಡಿಯಾ, ಎಂಜಿಎನ್‌ಆರ್‌ಇಜಿಎ, ಉದ್ಯೋಗಗಳು",
  "Welfare Schemes": "ಕಲ್ಯಾಣ ಯೋಜನೆಗಳು",
  "Central & state benefits": "ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಪ್ರಯೋಜನಗಳು",
  "Certificates": "ಪ್ರಮಾಣಪತ್ರಗಳು",
  "Income, caste, domicile": "ಆದಾಯ, ಜಾತಿ, ವಾಸಸ್ಥಳ",
  "New Launches": "ಹೊಸ ಬಿಡುಗಡೆಗಳು",
  "Latest govt. programs": "ಇತ್ತೀಚಿನ ಸರ್ಕಾರಿ ಕಾರ್ಯಕ್ರಮಗಳು",

  // Hero
  "Trusted by 1,000+ service centers across India": "ಭಾರತದಾದ್ಯಂತ 1,000+ ಸೇವಾ ಕೇಂದ್ರಗಳಿಂದ ವಿಶ್ವಾಸಾರ್ಹ",
  "Empowering": "ಸಶಕ್ತೀಕರಣ",
  "Indian Citizens": "ಭಾರತೀಯ ನಾಗರಿಕರು",
  "with Easy Access to Services": "ಸೇವೆಗಳಿಗೆ ಸುಲಭ ಪ್ರವೇಶದೊಂದಿಗೆ",
  "Explore Services": "ಸೇವೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
  "Govt. Approved": "ಸರ್ಕಾರದಿಂದ ಅನುಮೋದಿತ",
  "Fast Processing": "ವೇಗದ ಪ್ರಕ್ರಿಯೆ",
  "100+ Services": "100+ ಸೇವೆಗಳು",
  "Active Centers": "ಸಕ್ರಿಯ ಕೇಂದ್ರಗಳು",
  "Citizens Served": "ಸೇವೆ ಸಲ್ಲಿಸಿದ ನಾಗರಿಕರು",
  "Service Centers": "ಸೇವಾ ಕೇಂದ್ರಗಳು",
  "Services Offered": "ನೀಡಲಾದ ಸೇವೆಗಳು",
  "Active & Upcoming Schemes": "ಸಕ್ರಿಯ ಮತ್ತು ಮುಂಬರುವ ಯೋಜನೆಗಳು",
  "States Reached": "ತಲುಪಿದ ರಾಜ್ಯಗಳು",
  "Trusted by Thousands": "ಸಾವಿರಾರು ಜನರಿಂದ ವಿಶ್ವಾಸಾರ್ಹ",
  "Built for Indian citizens, one center at a time.": "ಭಾರತೀಯ ನಾಗರಿಕರಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ, ಒಂದೊಂದೇ ಕೇಂದ್ರ.",

  // Services / Schemes section headings + cards
  "Our Services": "ನಮ್ಮ ಸೇವೆಗಳು",
  "Learn more": "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",
  "Know more": "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",
  "E-Governance": "ಇ-ಆಡಳಿತ",
  "Nadakacheri Services": "ನಾಡಕಚೇರಿ ಸೇವೆಗಳು",
  "Banking & AEPS": "ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು AEPS",
  "Bill Payments (BBPS)": "ಬಿಲ್ ಪಾವತಿಗಳು (BBPS)",
  "Travel & IRCTC": "ಪ್ರಯಾಣ ಮತ್ತು IRCTC",
  "Health & Insurance": "ಆರೋಗ್ಯ ಮತ್ತು ವಿಮೆ",
  "Education & Scholarships": "ಶಿಕ್ಷಣ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನ",
  "RTO Services": "ಆರ್‌ಟಿಒ ಸೇವೆಗಳು",
  "Loans & Finance": "ಸಾಲ ಮತ್ತು ಹಣಕಾಸು",
  "Online FIR": "ಆನ್‌ಲೈನ್ ಎಫ್‌ಐಆರ್",
  "Featured": "ವೈಶಿಷ್ಟ್ಯ",
  "Active": "ಸಕ್ರಿಯ",
  "Upcoming": "ಮುಂಬರುವ",
  "Awarded & Recognized By": "ಪ್ರಶಸ್ತಿ ಮತ್ತು ಮಾನ್ಯತೆ ನೀಡಿದವರು",
  "Testimonials": "ಅಭಿಪ್ರಾಯಗಳು",
  "Zoom out": "ಜೂಮ್ ಔಟ್",
  "Zoom in": "ಜೂಮ್ ಇನ್",
  "Register for a Center": "ಕೇಂದ್ರಕ್ಕೆ ನೋಂದಾಯಿಸಿ",
  "Talk to our team": "ನಮ್ಮ ತಂಡದೊಂದಿಗೆ ಮಾತನಾಡಿ",
  "Talk to us": "ನಮ್ಮೊಂದಿಗೆ ಮಾತನಾಡಿ",

  // Footer
  "Your email": "ನಿಮ್ಮ ಇಮೇಲ್",
  "Subscribe": "ಚಂದಾದಾರರಾಗಿ",
  "Joined!": "ಸೇರಿದ್ದೀರಿ!",
  "Back to top": "ಮೇಲಕ್ಕೆ ಹಿಂತಿರುಗಿ",
  "Stay in the loop": "ಮಾಹಿತಿಯಲ್ಲಿ ಇರಿ",
  "Company": "ಕಂಪನಿ",
  "About Us": "ನಮ್ಮ ಬಗ್ಗೆ",
  "Terms & Conditions": "ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು",
  "Reach Us": "ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ",
  "All rights reserved.": "ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",
  "Privacy": "ಗೌಪ್ಯತೆ",
  "Terms": "ನಿಯಮಗಳು",
  "Designed & Developed by": "ವಿನ್ಯಾಸ ಮತ್ತು ಅಭಿವೃದ್ಧಿ",

  // Contact / forms
  "Contact BharatOne": "ಭಾರತ್‌ಒನ್ ಸಂಪರ್ಕಿಸಿ",
  "Send us a message": "ನಮಗೆ ಸಂದೇಶ ಕಳುಹಿಸಿ",
  "Send message": "ಸಂದೇಶ ಕಳುಹಿಸಿ",
  "Send another message": "ಇನ್ನೊಂದು ಸಂದೇಶ ಕಳುಹಿಸಿ",
  "Full name": "ಪೂರ್ಣ ಹೆಸರು",
  "Your name": "ನಿಮ್ಮ ಹೆಸರು",
  "Phone (optional)": "ಫೋನ್ (ಐಚ್ಛಿಕ)",
  "How can we help?": "ನಾವು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  "Sending": "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ",
  "Visit Us": "ನಮ್ಮನ್ನು ಭೇಟಿ ಮಾಡಿ",
  "Head Office": "ಮುಖ್ಯ ಕಚೇರಿ",
  "Hours": "ಸಮಯ",
  "Get directions": "ಮಾರ್ಗಸೂಚಿ ಪಡೆಯಿರಿ",
  "Partnership": "ಪಾಲುದಾರಿಕೆ",
  "Partnerships": "ಪಾಲುದಾರಿಕೆಗಳು",
  "Media / Press": "ಮಾಧ್ಯಮ / ಪತ್ರಿಕಾ",
  "Media & Press": "ಮಾಧ್ಯಮ ಮತ್ತು ಪತ್ರಿಕಾ",
  "Other": "ಇತರೆ",
  "Citizen services": "ನಾಗರಿಕ ಸೇವೆಗಳು",
  "Opening a center": "ಕೇಂದ್ರ ತೆರೆಯುವುದು",

  // Careers
  "Careers at BharatOne": "ಭಾರತ್‌ಒನ್‌ನಲ್ಲಿ ವೃತ್ತಿ ಅವಕಾಶಗಳು",
  "Open positions": "ತೆರೆದ ಹುದ್ದೆಗಳು",
  "Apply now": "ಈಗ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
  "Apply": "ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
  "How we hire": "ನಾವು ಹೇಗೆ ನೇಮಕ ಮಾಡುತ್ತೇವೆ",
  "Benefits that actually help": "ನಿಜವಾಗಿ ಸಹಾಯ ಮಾಡುವ ಪ್ರಯೋಜನಗಳು",
  "Full-time": "ಪೂರ್ಣ ಸಮಯ",
  "Engineering": "ಇಂಜಿನಿಯರಿಂಗ್",
  "Operations": "ಕಾರ್ಯಾಚರಣೆಗಳು",
  "Design": "ವಿನ್ಯಾಸ",
  "Community": "ಸಮುದಾಯ",
  "FAQ": "ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು",

  // Login
  "Log in to your account": "ನಿಮ್ಮ ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ",
  "Username or Email": "ಬಳಕೆದಾರಹೆಸರು ಅಥವಾ ಇಮೇಲ್",
  "Password": "ಪಾಸ್‌ವರ್ಡ್",
  "Refresh captcha": "ಕ್ಯಾಪ್ಚಾ ರಿಫ್ರೆಶ್ ಮಾಡಿ",
  "Enter Captcha Text": "ಕ್ಯಾಪ್ಚಾ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ",
  "Forgot password?": "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?",
  "Log In": "ಲಾಗಿನ್",
  "New to BharatOne?": "ಭಾರತ್‌ಒನ್‌ಗೆ ಹೊಸಬರೇ?",
  "Create New JSKO Account": "ಹೊಸ JSKO ಖಾತೆ ರಚಿಸಿ",
  "Track Your JSKO Application": "ನಿಮ್ಮ JSKO ಅರ್ಜಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
  "Check registration status": "ನೋಂದಣಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ",
  "Privacy Policy": "ಗೌಪ್ಯತಾ ನೀತಿ",
  "Welcome back": "ಮತ್ತೆ ಸ್ವಾಗತ",
  "Go back": "ಹಿಂತಿರುಗಿ",
  "Banking": "ಬ್ಯಾಂಕಿಂಗ್",
  "Travel": "ಪ್ರಯಾಣ",
  "Insurance": "ವಿಮೆ",
  "Aadhaar": "ಆಧಾರ್",

  // Get-started / Register
  "Continue": "ಮುಂದುವರಿಸಿ",
  "Most popular": "ಅತ್ಯಂತ ಜನಪ್ರಿಯ",
  "New": "ಹೊಸ",
  "Migrate": "ವರ್ಗಾಯಿಸಿ",
  "Encrypted KYC": "ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ KYC",
  "Under 7 minutes": "7 ನಿಮಿಷಗಳ ಒಳಗೆ",
  "Average completion": "ಸರಾಸರಿ ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ",
  "Account": "ಖಾತೆ",
  "Personal": "ವೈಯಕ್ತಿಕ",
  "Business": "ವ್ಯವಹಾರ",
  "Selfie Verification": "ಸೆಲ್ಫಿ ಪರಿಶೀಲನೆ",
  "Video KYC": "ವೀಡಿಯೊ KYC",
  "Payment & Submit": "ಪಾವತಿ ಮತ್ತು ಸಲ್ಲಿಸಿ",
  "Change Option": "ಆಯ್ಕೆ ಬದಲಾಯಿಸಿ",
  "Application submitted!": "ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!",
  "Back to Home": "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
  "Distributor": "ವಿತರಕ",

  // Chatbot quick prompts
  "What services do you offer?": "ನೀವು ಯಾವ ಸೇವೆಗಳನ್ನು ನೀಡುತ್ತೀರಿ?",
  "How to register a service center?": "ಸೇವಾ ಕೇಂದ್ರವನ್ನು ಹೇಗೆ ನೋಂದಾಯಿಸುವುದು?",
  "Contact information": "ಸಂಪರ್ಕ ಮಾಹಿತಿ",
  "Close chat": "ಚಾಟ್ ಮುಚ್ಚಿ",
  "Online · Replies instantly": "ಆನ್‌ಲೈನ್ · ತಕ್ಷಣ ಉತ್ತರಿಸುತ್ತದೆ",
};
Object.assign(EN_TO_KN, PUBLIC_KN);

// ── English → Hindi. Covers pre-login public pages + shared UI labels.
export const EN_TO_HI: Record<string, string> = {
  // Navbar
  "Home": "होम",
  "About": "हमारे बारे में",
  "Gallery": "गैलरी",
  "Services": "सेवाएं",
  "Schemes": "योजनाएं",
  "Careers": "करियर",
  "Contact": "संपर्क",
  "Login": "लॉगिन",
  "Register Center": "केंद्र पंजीकरण",
  "Register Your Center": "अपना केंद्र पंजीकृत करें",
  "Search": "खोजें",
  "Aadhaar & PAN": "आधार और पैन",
  "Enrolment, updates & linking": "नामांकन, अपडेट और लिंकिंग",
  "Ayushman Bharat": "आयुष्मान भारत",
  "Health card & insurance": "हेल्थ कार्ड और बीमा",
  "Education": "शिक्षा",
  "Scholarships & admissions": "छात्रवृत्ति और प्रवेश",
  "Banking & DBT": "बैंकिंग और डीबीटी",
  "Jan Dhan, pensions, subsidies": "जन धन, पेंशन, सब्सिडी",
  "Farmer Services": "किसान सेवाएं",
  "PM-KISAN, crop insurance": "पीएम-किसान, फसल बीमा",
  "Employment": "रोजगार",
  "Skill India, MGNREGA, jobs": "स्किल इंडिया, मनरेगा, नौकरियां",
  "Welfare Schemes": "कल्याण योजनाएं",
  "Central & state benefits": "केंद्र और राज्य लाभ",
  "Certificates": "प्रमाणपत्र",
  "Income, caste, domicile": "आय, जाति, निवास",
  "New Launches": "नए लॉन्च",
  "Latest govt. programs": "नवीनतम सरकारी कार्यक्रम",

  // Hero
  "Trusted by 1,000+ service centers across India": "पूरे भारत में 1,000+ सेवा केंद्रों का भरोसा",
  "Empowering": "सशक्त बनाना",
  "Indian Citizens": "भारतीय नागरिक",
  "with Easy Access to Services": "सेवाओं तक आसान पहुंच के साथ",
  "Explore Services": "सेवाएं देखें",
  "Govt. Approved": "सरकार द्वारा अनुमोदित",
  "Fast Processing": "तेज़ प्रोसेसिंग",
  "100+ Services": "100+ सेवाएं",
  "Active Centers": "सक्रिय केंद्र",
  "Citizens Served": "सेवा प्राप्त नागरिक",
  "Service Centers": "सेवा केंद्र",
  "Services Offered": "प्रदान की गई सेवाएं",
  "Active & Upcoming Schemes": "सक्रिय और आगामी योजनाएं",
  "States Reached": "पहुंचे हुए राज्य",
  "Trusted by Thousands": "हजारों का भरोसा",
  "Built for Indian citizens, one center at a time.": "भारतीय नागरिकों के लिए बनाया गया, एक-एक केंद्र।",

  // Services / Schemes
  "Our Services": "हमारी सेवाएं",
  "Learn more": "और जानें",
  "Know more": "और जानें",
  "E-Governance": "ई-गवर्नेंस",
  "Nadakacheri Services": "नादकचेरी सेवाएं",
  "Banking & AEPS": "बैंकिंग और AEPS",
  "Bill Payments (BBPS)": "बिल भुगतान (BBPS)",
  "Travel & IRCTC": "यात्रा और IRCTC",
  "Health & Insurance": "स्वास्थ्य और बीमा",
  "Education & Scholarships": "शिक्षा और छात्रवृत्ति",
  "RTO Services": "आरटीओ सेवाएं",
  "Loans & Finance": "ऋण और वित्त",
  "Online FIR": "ऑनलाइन एफआईआर",
  "Featured": "विशेष",
  "Active": "सक्रिय",
  "Upcoming": "आगामी",
  "Awarded & Recognized By": "पुरस्कृत और मान्यता प्राप्त",
  "Testimonials": "प्रशंसापत्र",
  "Zoom out": "ज़ूम आउट",
  "Zoom in": "ज़ूम इन",
  "Register for a Center": "केंद्र के लिए पंजीकरण करें",
  "Talk to our team": "हमारी टीम से बात करें",
  "Talk to us": "हमसे बात करें",

  // Footer
  "Your email": "आपका ईमेल",
  "Subscribe": "सदस्यता लें",
  "Joined!": "जुड़ गए!",
  "Back to top": "ऊपर जाएं",
  "Stay in the loop": "जुड़े रहें",
  "Company": "कंपनी",
  "About Us": "हमारे बारे में",
  "Terms & Conditions": "नियम और शर्तें",
  "Reach Us": "हमसे संपर्क करें",
  "All rights reserved.": "सर्वाधिकार सुरक्षित।",
  "Privacy": "गोपनीयता",
  "Terms": "नियम",
  "Designed & Developed by": "डिज़ाइन और विकसित द्वारा",

  // Contact / forms
  "Contact BharatOne": "भारतवन से संपर्क करें",
  "Send us a message": "हमें संदेश भेजें",
  "Send message": "संदेश भेजें",
  "Send another message": "एक और संदेश भेजें",
  "Full name": "पूरा नाम",
  "Your name": "आपका नाम",
  "Phone (optional)": "फ़ोन (वैकल्पिक)",
  "How can we help?": "हम कैसे मदद कर सकते हैं?",
  "Sending": "भेजा जा रहा है",
  "Visit Us": "हमसे मिलें",
  "Head Office": "प्रधान कार्यालय",
  "Hours": "समय",
  "Get directions": "दिशा-निर्देश प्राप्त करें",
  "Partnership": "साझेदारी",
  "Partnerships": "साझेदारियां",
  "Media / Press": "मीडिया / प्रेस",
  "Media & Press": "मीडिया और प्रेस",
  "Other": "अन्य",
  "Citizen services": "नागरिक सेवाएं",
  "Opening a center": "केंद्र खोलना",

  // Careers
  "Careers at BharatOne": "भारतवन में करियर",
  "Open positions": "रिक्त पद",
  "Apply now": "अभी आवेदन करें",
  "Apply": "आवेदन करें",
  "How we hire": "हम कैसे भर्ती करते हैं",
  "Benefits that actually help": "वास्तव में मदद करने वाले लाभ",
  "Full-time": "पूर्णकालिक",
  "Engineering": "इंजीनियरिंग",
  "Operations": "संचालन",
  "Design": "डिज़ाइन",
  "Community": "समुदाय",
  "FAQ": "अक्सर पूछे जाने वाले प्रश्न",

  // Login
  "Log in to your account": "अपने खाते में लॉगिन करें",
  "Username or Email": "उपयोगकर्ता नाम या ईमेल",
  "Password": "पासवर्ड",
  "Refresh captcha": "कैप्चा रिफ्रेश करें",
  "Enter Captcha Text": "कैप्चा टेक्स्ट दर्ज करें",
  "Forgot password?": "पासवर्ड भूल गए?",
  "Log In": "लॉगिन",
  "New to BharatOne?": "भारतवन पर नए हैं?",
  "Create New JSKO Account": "नया JSKO खाता बनाएं",
  "Track Your JSKO Application": "अपना JSKO आवेदन ट्रैक करें",
  "Check registration status": "पंजीकरण स्थिति जांचें",
  "Privacy Policy": "गोपनीयता नीति",
  "Welcome back": "पुनः स्वागत है",
  "Go back": "वापस जाएं",
  "Banking": "बैंकिंग",
  "Travel": "यात्रा",
  "Insurance": "बीमा",
  "Aadhaar": "आधार",

  // Get-started / Register
  "Continue": "जारी रखें",
  "Most popular": "सबसे लोकप्रिय",
  "New": "नया",
  "Migrate": "माइग्रेट करें",
  "Encrypted KYC": "एन्क्रिप्टेड KYC",
  "Under 7 minutes": "7 मिनट से कम",
  "Average completion": "औसत पूर्णता",
  "Account": "खाता",
  "Personal": "व्यक्तिगत",
  "Business": "व्यवसाय",
  "Selfie Verification": "सेल्फी सत्यापन",
  "Video KYC": "वीडियो KYC",
  "Payment & Submit": "भुगतान और सबमिट",
  "Change Option": "विकल्प बदलें",
  "Application submitted!": "आवेदन सबमिट किया गया!",
  "Back to Home": "होम पर वापस जाएं",
  "Distributor": "वितरक",

  // Chatbot quick prompts
  "What services do you offer?": "आप कौन सी सेवाएं प्रदान करते हैं?",
  "How to register a service center?": "सेवा केंद्र कैसे पंजीकृत करें?",
  "Contact information": "संपर्क जानकारी",
  "Close chat": "चैट बंद करें",
  "Online · Replies instantly": "ऑनलाइन · तुरंत उत्तर",

  // Shared UI labels (also used pre-login)
  "Save": "सहेजें",
  "Cancel": "रद्द करें",
  "Submit": "सबमिट करें",
  "Back": "पीछे",
  "Next": "आगे",
  "Close": "बंद करें",
  "Name": "नाम",
  "Phone": "फ़ोन",
  "Email": "ईमेल",
  "Address": "पता",
  "Subject": "विषय",
  "Message": "संदेश",
  "Category": "श्रेणी",
  "Status": "स्थिति",
  "Download": "डाउनलोड",
  "View": "देखें",
  "Loading…": "लोड हो रहा है…",
  "Loading...": "लोड हो रहा है...",
  "Sign out": "साइन आउट",
};

// Reverse maps for normalising any translated text node back to English.
const KN_TO_EN: Record<string, string> = {};
for (const [en, kn] of Object.entries(EN_TO_KN)) if (!(kn in KN_TO_EN)) KN_TO_EN[kn] = en;
const HI_TO_EN: Record<string, string> = {};
for (const [en, hi] of Object.entries(EN_TO_HI)) if (!(hi in HI_TO_EN)) HI_TO_EN[hi] = en;

const FORWARD: Record<Exclude<Lang, "en">, Record<string, string>> = { kn: EN_TO_KN, hi: EN_TO_HI };

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE"]);

let observer: MutationObserver | null = null;

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "kn" || v === "hi" ? v : "en";
  } catch { return "en"; }
}

function shouldSkip(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    // svg tags report lowercase; skip anything inside an <svg>
    if (el.namespaceURI === "http://www.w3.org/2000/svg") return true;
    if (el.getAttribute && (el.getAttribute("translate") === "no" || el.classList?.contains("notranslate"))) return true;
    el = el.parentElement;
  }
  return false;
}

function mapText(raw: string, lang: Lang): string | null {
  const key = raw.trim();
  if (!key) return null;
  // Normalise the current node back to its English source (it may currently be
  // English, Kannada or Hindi), then map to the requested target language.
  const english = KN_TO_EN[key] ?? HI_TO_EN[key] ?? key;
  const target = lang === "en" ? english : (FORWARD[lang][english] ?? english);
  if (target && target !== key) return raw.replace(key, target);
  return null;
}

function translateNode(root: Node, lang: Lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n: Node) =>
      n.nodeValue && n.nodeValue.trim() && !shouldSkip(n)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  } as unknown as NodeFilter);
  const nodes: Text[] = [];
  let n: Node | null;
  // include the root itself if it's a text node
  if (root.nodeType === Node.TEXT_NODE && !shouldSkip(root)) nodes.push(root as Text);
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const t of nodes) {
    const mapped = mapText(t.nodeValue || "", lang);
    if (mapped != null && mapped !== t.nodeValue) t.nodeValue = mapped;
  }
}

function ensureNoTranslateMeta() {
  if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
    const m = document.createElement("meta");
    m.name = "google";
    m.content = "notranslate";
    document.head.appendChild(m);
  }
  // Clear any lingering Google Translate cookie so its banner never appears.
  try {
    const host = location.hostname;
    const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=;path=/;${expire}`;
    document.cookie = `googtrans=;path=/;domain=${host};${expire}`;
    document.cookie = `googtrans=;path=/;domain=.${host};${expire}`;
  } catch { /* ignore */ }
}

export function applyLanguage(lang: Lang) {
  if (typeof document === "undefined") return;
  ensureNoTranslateMeta();
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;

  translateNode(document.body, lang);

  if (observer) { observer.disconnect(); observer = null; }
  // Keep translating dynamically-rendered content while a non-English language
  // is active. React always renders the English source, so the observer maps it
  // to the target on the fly.
  if (lang !== "en") {
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach((nn) => translateNode(nn, lang));
        } else if (m.type === "characterData") {
          const t = m.target as Text;
          if (t.nodeType === Node.TEXT_NODE && !shouldSkip(t)) {
            const mapped = mapText(t.nodeValue || "", lang);
            if (mapped != null && mapped !== t.nodeValue) t.nodeValue = mapped;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}

export function initLanguage() {
  applyLanguage(getLang());
}
