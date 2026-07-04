// Native English ⇄ Kannada translation for the portal — no Google Translate.
// A curated dictionary translates exact text nodes; numbers/amounts (digits)
// are left untouched, so ₹ values stay in Latin digits with Kannada labels.
// A MutationObserver keeps translating content that React renders after route
// changes or data loads.

export type Lang = "en" | "kn";
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
};

// Reverse map for switching back to English.
const KN_TO_EN: Record<string, string> = {};
for (const [en, kn] of Object.entries(EN_TO_KN)) if (!(kn in KN_TO_EN)) KN_TO_EN[kn] = en;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE"]);

let observer: MutationObserver | null = null;

export function getLang(): Lang {
  try { return (localStorage.getItem(STORAGE_KEY) as Lang) === "kn" ? "kn" : "en"; } catch { return "en"; }
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
  const dict = lang === "kn" ? EN_TO_KN : KN_TO_EN;
  const val = dict[key];
  if (val && val !== key) return raw.replace(key, val);
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
  document.documentElement.lang = lang === "kn" ? "kn" : "en";

  translateNode(document.body, lang);

  if (observer) { observer.disconnect(); observer = null; }
  if (lang === "kn") {
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach((nn) => translateNode(nn, "kn"));
        } else if (m.type === "characterData") {
          const t = m.target as Text;
          if (t.nodeType === Node.TEXT_NODE && !shouldSkip(t)) {
            const mapped = mapText(t.nodeValue || "", "kn");
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
