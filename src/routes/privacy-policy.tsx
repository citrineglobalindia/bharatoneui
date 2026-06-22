import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Shield, Eye, FileLock, Link as LinkIcon, Lock, FileText,
  Phone, Copyright, Globe, Server, Mail, Languages,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { LegalSocial } from "@/components/legal-social";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BharatOne" },
      { name: "description", content: "Privacy Policy for BharatOne Services and Affiliates Pvt. Ltd." },
    ],
  }),
  component: PrivacyPolicyPage,
});

const ICONS = [Eye, Shield, Copyright, LinkIcon, Server, FileLock, Lock, Globe, Mail];

type Pack = {
  titlePre: string; titleHi: string; subtitle: string; updated: string;
  commitHeading: string; commitBody: string;
  sections: { title: string; content: string }[];
  contactHeading: string; contactBody: string; contactSupport: string; back: string;
};

const T: Record<"en" | "hi" | "kn", Pack> = {
  en: {
    titlePre: "Privacy", titleHi: "Policy",
    subtitle: "Your privacy is important to us. Learn how BharatOne Services collects, uses, and protects your personal information.",
    updated: "Last updated: May 27, 2026",
    commitHeading: "Our Commitment to You",
    commitBody: "BharatOne Services and Affiliates Pvt. Ltd. are committed to protecting the privacy of users who visit our website. We believe in transparency, security, and respect for your personal data. This Privacy Policy outlines how we handle information collected through our services.",
    sections: [
      { title: "Privacy Policy", content: "We are committed to protecting the privacy of users who visit our website. We do not automatically collect any personal information that can identify you individually (such as name, phone number, or email address) unless you voluntarily provide it to us." },
      { title: "Use of Personal Information", content: "If you choose to provide personal information through any form, service registration, or email, it will be used strictly to respond to your query or provide the service you requested. We do not share, sell, or distribute personal information to third parties, unless required by law or for delivering services with your consent." },
      { title: "Copyright Policy", content: "All content published on the BharatOne website is the property of BharatOne Services and Affiliates Pvt. Ltd. unless otherwise stated. You may reproduce material with prior written permission, done accurately, without derogatory context, and with proper acknowledgment of the source." },
      { title: "Hyperlinking Policy", content: "Our website may contain links to external websites for user convenience. We are not responsible for the content or reliability of linked websites and do not endorse views expressed therein." },
      { title: "Security Policy", content: "Our systems use commercial-grade software to monitor traffic and detect unauthorized activity. Unauthorized attempts to alter or upload content, or otherwise damage this site, are strictly prohibited and punishable under the Information Technology Act, 2000 and other applicable Indian laws." },
      { title: "Data Retention", content: "We retain traffic logs for analysis and security purposes, regularly reviewed and deleted per our internal policies. We do not retain personal information longer than necessary for the purpose it was collected." },
      { title: "Security Measures", content: "We employ industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure." },
      { title: "Cookies & Tracking", content: "We may use cookies and similar technologies to enhance your experience, analyze traffic, and understand interactions. You can set your browser to refuse cookies, but this may limit certain features." },
      { title: "Contact for Privacy Concerns", content: "If you have any questions, concerns, or requests regarding your personal data or this Privacy Policy, please contact us at support@mybharatone.com. We will respond within a reasonable timeframe." },
    ],
    contactHeading: "Questions About Our Privacy Policy?",
    contactBody: "If you have any questions or concerns about this Privacy Policy, please contact us.",
    contactSupport: "Contact Support", back: "Back to Login",
  },
  hi: {
    titlePre: "गोपनीयता", titleHi: "नीति",
    subtitle: "आपकी गोपनीयता हमारे लिए महत्वपूर्ण है। जानें कि BharatOne Services आपकी व्यक्तिगत जानकारी कैसे एकत्र, उपयोग और सुरक्षित करती है।",
    updated: "अंतिम अद्यतन: 27 मई 2026",
    commitHeading: "आपके प्रति हमारी प्रतिबद्धता",
    commitBody: "BharatOne Services and Affiliates Pvt. Ltd. हमारी वेबसाइट पर आने वाले उपयोगकर्ताओं की गोपनीयता की रक्षा के लिए प्रतिबद्ध है। हम पारदर्शिता, सुरक्षा और आपके व्यक्तिगत डेटा के सम्मान में विश्वास रखते हैं। यह गोपनीयता नीति बताती है कि हम अपनी सेवाओं के माध्यम से एकत्रित जानकारी को कैसे संभालते हैं।",
    sections: [
      { title: "गोपनीयता नीति", content: "हम अपनी वेबसाइट पर आने वाले उपयोगकर्ताओं की गोपनीयता की रक्षा के लिए प्रतिबद्ध हैं। जब तक आप स्वेच्छा से न दें, हम स्वतः कोई व्यक्तिगत जानकारी (जैसे नाम, फ़ोन नंबर या ईमेल) एकत्र नहीं करते।" },
      { title: "व्यक्तिगत जानकारी का उपयोग", content: "यदि आप किसी फ़ॉर्म, सेवा पंजीकरण या ईमेल के माध्यम से व्यक्तिगत जानकारी देते हैं, तो उसका उपयोग केवल आपकी पूछताछ का उत्तर देने या अनुरोधित सेवा प्रदान करने के लिए होगा। हम कानून द्वारा आवश्यक या आपकी सहमति के बिना तृतीय-पक्षों के साथ जानकारी साझा/बेचते नहीं हैं।" },
      { title: "कॉपीराइट नीति", content: "BharatOne वेबसाइट पर प्रकाशित सभी सामग्री, जब तक अन्यथा न कहा गया हो, BharatOne Services and Affiliates Pvt. Ltd. की संपत्ति है। पूर्व लिखित अनुमति से, सटीक रूप से, अपमानजनक संदर्भ के बिना और स्रोत के उचित उल्लेख के साथ सामग्री का पुनरुत्पादन किया जा सकता है।" },
      { title: "हाइपरलिंकिंग नीति", content: "हमारी वेबसाइट में बाहरी वेबसाइटों के लिंक हो सकते हैं। हम लिंक की गई वेबसाइटों की सामग्री या विश्वसनीयता के लिए ज़िम्मेदार नहीं हैं और उनमें व्यक्त विचारों का समर्थन नहीं करते।" },
      { title: "सुरक्षा नीति", content: "हमारे सिस्टम ट्रैफ़िक की निगरानी और अनधिकृत गतिविधि का पता लगाने के लिए वाणिज्यिक-ग्रेड सॉफ़्टवेयर का उपयोग करते हैं। सामग्री बदलने/अपलोड करने या साइट को नुकसान पहुँचाने के अनधिकृत प्रयास सूचना प्रौद्योगिकी अधिनियम, 2000 के तहत दंडनीय हैं।" },
      { title: "डेटा प्रतिधारण", content: "हम विश्लेषण और सुरक्षा हेतु ट्रैफ़िक लॉग रखते हैं, जिनकी नियमित समीक्षा और हमारी नीतियों के अनुसार हटाया जाता है। हम व्यक्तिगत जानकारी को आवश्यकता से अधिक समय तक नहीं रखते।" },
      { title: "सुरक्षा उपाय", content: "हम आपकी जानकारी को अनधिकृत पहुँच, परिवर्तन या विनाश से बचाने के लिए उद्योग-मानक सुरक्षा उपाय अपनाते हैं। हालाँकि, इंटरनेट पर कोई भी प्रसारण 100% सुरक्षित नहीं है।" },
      { title: "कुकीज़ और ट्रैकिंग", content: "हम आपके अनुभव को बेहतर बनाने, ट्रैफ़िक का विश्लेषण करने और उपयोग समझने के लिए कुकीज़ का उपयोग कर सकते हैं। आप ब्राउज़र में कुकीज़ अस्वीकार कर सकते हैं, परंतु इससे कुछ सुविधाएँ सीमित हो सकती हैं।" },
      { title: "गोपनीयता संबंधी संपर्क", content: "यदि आपके व्यक्तिगत डेटा या इस नीति के बारे में कोई प्रश्न या अनुरोध हैं, तो कृपया support@mybharatone.com पर संपर्क करें। हम उचित समय में उत्तर देंगे।" },
    ],
    contactHeading: "हमारी गोपनीयता नीति के बारे में प्रश्न?",
    contactBody: "यदि इस गोपनीयता नीति के बारे में आपके कोई प्रश्न या चिंताएँ हैं, तो कृपया हमसे संपर्क करें।",
    contactSupport: "सहायता से संपर्क करें", back: "लॉगिन पर वापस",
  },
  kn: {
    titlePre: "ಗೌಪ್ಯತಾ", titleHi: "ನೀತಿ",
    subtitle: "ನಿಮ್ಮ ಗೌಪ್ಯತೆ ನಮಗೆ ಮುಖ್ಯ. BharatOne Services ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಸಂಗ್ರಹಿಸುತ್ತದೆ, ಬಳಸುತ್ತದೆ ಮತ್ತು ರಕ್ಷಿಸುತ್ತದೆ ಎಂದು ತಿಳಿಯಿರಿ.",
    updated: "ಕೊನೆಯ ನವೀಕರಣ: 27 ಮೇ 2026",
    commitHeading: "ನಿಮ್ಮ ಬಗ್ಗೆ ನಮ್ಮ ಬದ್ಧತೆ",
    commitBody: "BharatOne Services and Affiliates Pvt. Ltd. ನಮ್ಮ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡುವ ಬಳಕೆದಾರರ ಗೌಪ್ಯತೆಯನ್ನು ರಕ್ಷಿಸಲು ಬದ್ಧವಾಗಿದೆ. ನಾವು ಪಾರದರ್ಶಕತೆ, ಭದ್ರತೆ ಮತ್ತು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ದತ್ತಾಂಶದ ಗೌರವದಲ್ಲಿ ನಂಬಿಕೆ ಇಡುತ್ತೇವೆ. ಈ ಗೌಪ್ಯತಾ ನೀತಿ ನಮ್ಮ ಸೇವೆಗಳ ಮೂಲಕ ಸಂಗ್ರಹಿಸಿದ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸುತ್ತೇವೆ ಎಂಬುದನ್ನು ವಿವರಿಸುತ್ತದೆ.",
    sections: [
      { title: "ಗೌಪ್ಯತಾ ನೀತಿ", content: "ನಮ್ಮ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡುವ ಬಳಕೆದಾರರ ಗೌಪ್ಯತೆಯನ್ನು ರಕ್ಷಿಸಲು ನಾವು ಬದ್ಧರಾಗಿದ್ದೇವೆ. ನೀವು ಸ್ವಯಂಪ್ರೇರಿತವಾಗಿ ನೀಡದ ಹೊರತು, ನಿಮ್ಮನ್ನು ಗುರುತಿಸಬಲ್ಲ ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು (ಹೆಸರು, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್) ನಾವು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ." },
      { title: "ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯ ಬಳಕೆ", content: "ನೀವು ಯಾವುದೇ ಫಾರ್ಮ್, ಸೇವಾ ನೋಂದಣಿ ಅಥವಾ ಇಮೇಲ್ ಮೂಲಕ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ ನೀಡಿದರೆ, ಅದನ್ನು ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಲು ಅಥವಾ ನೀವು ಕೋರಿದ ಸೇವೆ ಒದಗಿಸಲು ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ. ಕಾನೂನು ಅಗತ್ಯವಿದ್ದರೆ ಅಥವಾ ನಿಮ್ಮ ಒಪ್ಪಿಗೆಯಿಲ್ಲದೆ ಮೂರನೇ ಪಕ್ಷಗಳೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ/ಮಾರುವುದಿಲ್ಲ." },
      { title: "ಕೃತಿಸ್ವಾಮ್ಯ ನೀತಿ", content: "ಬೇರೆ ಸೂಚಿಸದ ಹೊರತು, BharatOne ವೆಬ್‌ಸೈಟ್‌ನ ಎಲ್ಲಾ ವಿಷಯವು BharatOne Services and Affiliates Pvt. Ltd. ನ ಆಸ್ತಿ. ಮುಂಚಿತ ಲಿಖಿತ ಅನುಮತಿಯೊಂದಿಗೆ, ನಿಖರವಾಗಿ ಮತ್ತು ಮೂಲದ ಸರಿಯಾದ ಉಲ್ಲೇಖದೊಂದಿಗೆ ವಿಷಯವನ್ನು ಪುನರುತ್ಪಾದಿಸಬಹುದು." },
      { title: "ಹೈಪರ್‌ಲಿಂಕಿಂಗ್ ನೀತಿ", content: "ನಮ್ಮ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಬಾಹ್ಯ ವೆಬ್‌ಸೈಟ್‌ಗಳ ಲಿಂಕ್‌ಗಳಿರಬಹುದು. ಲಿಂಕ್ ಮಾಡಲಾದ ಸೈಟ್‌ಗಳ ವಿಷಯ ಅಥವಾ ವಿಶ್ವಾಸಾರ್ಹತೆಗೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ ಮತ್ತು ಅಲ್ಲಿನ ಅಭಿಪ್ರಾಯಗಳನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ." },
      { title: "ಭದ್ರತಾ ನೀತಿ", content: "ನಮ್ಮ ವ್ಯವಸ್ಥೆಗಳು ಟ್ರಾಫಿಕ್ ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಅನಧಿಕೃತ ಚಟುವಟಿಕೆ ಪತ್ತೆಗೆ ವಾಣಿಜ್ಯ-ದರ್ಜೆಯ ತಂತ್ರಾಂಶ ಬಳಸುತ್ತವೆ. ವಿಷಯ ಬದಲಾಯಿಸುವ/ಅಪ್‌ಲೋಡ್ ಮಾಡುವ ಅಥವಾ ಸೈಟ್‌ಗೆ ಹಾನಿ ಮಾಡುವ ಅನಧಿಕೃತ ಪ್ರಯತ್ನಗಳು ಮಾಹಿತಿ ತಂತ್ರಜ್ಞಾನ ಕಾಯ್ದೆ, 2000 ರ ಅಡಿ ಶಿಕ್ಷಾರ್ಹ." },
      { title: "ದತ್ತಾಂಶ ಧಾರಣೆ", content: "ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಭದ್ರತೆಗಾಗಿ ನಾವು ಟ್ರಾಫಿಕ್ ಲಾಗ್‌ಗಳನ್ನು ಇರಿಸುತ್ತೇವೆ, ಅವುಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ ನಮ್ಮ ನೀತಿಗಳ ಪ್ರಕಾರ ಅಳಿಸಲಾಗುತ್ತದೆ. ಸಂಗ್ರಹಿಸಿದ ಉದ್ದೇಶಕ್ಕೆ ಅಗತ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚು ಕಾಲ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಇರಿಸುವುದಿಲ್ಲ." },
      { title: "ಭದ್ರತಾ ಕ್ರಮಗಳು", content: "ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಅನಧಿಕೃತ ಪ್ರವೇಶ, ಬದಲಾವಣೆ ಅಥವಾ ನಾಶದಿಂದ ರಕ್ಷಿಸಲು ನಾವು ಉದ್ಯಮ-ಮಾನದಂಡದ ಭದ್ರತಾ ಕ್ರಮಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ಆದರೆ ಇಂಟರ್ನೆಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಪ್ರಸರಣ 100% ಸುರಕ್ಷಿತವಲ್ಲ." },
      { title: "ಕುಕೀಗಳು ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್", content: "ನಿಮ್ಮ ಅನುಭವ ಸುಧಾರಿಸಲು, ಟ್ರಾಫಿಕ್ ವಿಶ್ಲೇಷಿಸಲು ಮತ್ತು ಬಳಕೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಾವು ಕುಕೀಗಳನ್ನು ಬಳಸಬಹುದು. ನೀವು ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಕುಕೀಗಳನ್ನು ನಿರಾಕರಿಸಬಹುದು, ಆದರೆ ಇದರಿಂದ ಕೆಲವು ವೈಶಿಷ್ಟ್ಯಗಳು ಸೀಮಿತವಾಗಬಹುದು." },
      { title: "ಗೌಪ್ಯತೆ ಸಂಬಂಧಿ ಸಂಪರ್ಕ", content: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ದತ್ತಾಂಶ ಅಥವಾ ಈ ನೀತಿಯ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಅಥವಾ ಕೋರಿಕೆ ಇದ್ದರೆ, ದಯವಿಟ್ಟು support@mybharatone.com ಗೆ ಸಂಪರ್ಕಿಸಿ. ನಾವು ಸೂಕ್ತ ಸಮಯದಲ್ಲಿ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತೇವೆ." },
    ],
    contactHeading: "ನಮ್ಮ ಗೌಪ್ಯತಾ ನೀತಿಯ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿವೆಯೇ?",
    contactBody: "ಈ ಗೌಪ್ಯತಾ ನೀತಿಯ ಬಗ್ಗೆ ನಿಮಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಅಥವಾ ಕಾಳಜಿ ಇದ್ದರೆ, ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    contactSupport: "ಬೆಂಬಲ ಸಂಪರ್ಕಿಸಿ", back: "ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ",
  },
};

const LANGS: { key: "en" | "hi" | "kn"; label: string }[] = [
  { key: "en", label: "English" }, { key: "hi", label: "हिन्दी" }, { key: "kn", label: "ಕನ್ನಡ" },
];

function PrivacyPolicyPage() {
  const [lang, setLang] = useState<"en" | "hi" | "kn">("en");
  const t = T[lang];
  return (
    <div className="relative min-h-screen bg-tricolor overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-saffron-gradient opacity-15 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute top-40 -left-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-2xl" />

      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-20 max-w-5xl items-center justify-center px-4 sm:px-6 py-3">
          <Link to="/login" aria-label="Go back" className="absolute left-3 sm:left-6 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BharatOneLogo size="xl" />
          <div className="absolute right-3 sm:right-6 flex items-center gap-1.5">
            <Languages className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "hi" | "kn")} className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            {t.titlePre} <span className="bg-saffron-gradient bg-clip-text text-transparent">{t.titleHi}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground mx-auto">{t.subtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t.updated}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev"><Shield className="h-6 w-6" /></div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{t.commitHeading}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.commitBody}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {t.sections.map((section, index) => {
            const Icon = ICONS[index] ?? FileText;
            return (
              <div key={index} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft transition-all hover:shadow-elev hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-emerald-100 text-saffron"><Icon className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-foreground">{index + 1}. {section.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-6 sm:p-8 shadow-soft">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground">{t.contactHeading}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.contactBody}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a href="tel:+919071100311" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Phone className="h-4 w-4 shrink-0 text-india-green" /> +91 90711 00311</a>
              <a href="mailto:info@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">info@mybharatone.com</span></a>
              <a href="mailto:support@mybharatone.com" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition"><Mail className="h-4 w-4 shrink-0 text-india-green" /> <span className="truncate">support@mybharatone.com</span></a>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:support@mybharatone.com" className="inline-flex items-center gap-2 rounded-lg bg-india-green px-5 py-2.5 text-sm font-semibold text-white shadow-elev hover:bg-india-green/90 transition-all"><Mail className="h-4 w-4" /> {t.contactSupport}</a>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-soft hover:bg-muted transition-all"><ArrowLeft className="h-4 w-4" /> {t.back}</Link>
            </div>
          </div>
        </div>

        <LegalSocial />

        <div className="mt-8 text-center text-xs text-muted-foreground pb-8">
          <p>Copyright © 2026 <span className="text-india-green font-semibold">BharatOne Services & Affiliates Pvt. Ltd.</span> All rights reserved.</p>
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-saffron via-white to-india-green" />
    </div>
  );
}
