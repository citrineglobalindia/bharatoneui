import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, FileText, ShieldAlert, UserCheck, CreditCard, Copyright, ExternalLink,
  AlertTriangle, Ban, RefreshCw, Gavel, Landmark, Phone, Mail, Languages,
} from "lucide-react";
import { BharatOneLogo } from "@/components/bharatone-logo";
import { LegalSocial } from "@/components/legal-social";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — BharatOne" },
      { name: "description", content: "Terms and Conditions for BharatOne Services and Affiliates Pvt. Ltd." },
    ],
  }),
  component: TermsPage,
});

const ICONS = [Landmark, UserCheck, ShieldAlert, CreditCard, Copyright, ExternalLink, AlertTriangle, Ban, Gavel, RefreshCw, FileText];

type Pack = {
  titlePre: string; titleHi: string; subtitle: string; updated: string;
  agreementHeading: string; agreementBody: string;
  sections: { title: string; content: string }[];
  contactHeading: string; contactBody: string; contactSupport: string; back: string;
};

const T: Record<"en" | "hi" | "kn", Pack> = {
  en: {
    titlePre: "Terms and", titleHi: "Conditions",
    subtitle: "Please read these terms carefully before using BharatOne services. By accessing our platform, you agree to be bound by these terms.",
    updated: "Last updated: May 27, 2026",
    agreementHeading: "Agreement to Terms",
    agreementBody: "These Terms and Conditions constitute a legally binding agreement made between you and BharatOne Services and Affiliates Pvt. Ltd. concerning your access to and use of our website and services. By accessing or using our services, you agree that you have read, understood, and agree to be bound by these Terms. If you do not agree, you are expressly prohibited from using our services.",
    sections: [
      { title: "Nature of Services", content: "BharatOne Services and Affiliates Pvt. Ltd. offers assistance in accessing various Indian government schemes, subsidies, certifications, and application services. We are not a government agency. All services are consultancy/support-based and do not guarantee approval or success of applications." },
      { title: "Eligibility", content: "You must be at least 18 years old and legally capable of entering into binding contracts to use our services." },
      { title: "Acceptable Use", content: "You agree to use the website only for lawful purposes. You may not misrepresent your identity, provide false information, attempt unauthorized access, or use the Site for any fraudulent or harmful activity." },
      { title: "Payments & Refunds", content: "Certain services may be subject to fees. All applicable charges will be disclosed before any payment is made. Payments are non-refundable once a service has been initiated." },
      { title: "Intellectual Property", content: "All content on the Site, including text, graphics, logos, and software, is the property of BharatOne and protected under applicable intellectual property laws. You may not copy, reproduce, or distribute any material without written permission." },
      { title: "Third-Party Links", content: "Our Site may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of any third-party sites or services." },
      { title: "Disclaimer", content: "Our services are offered on a best-effort basis. While we aim to provide accurate and updated information, we do not guarantee the completeness, accuracy, or timeliness of any information or results." },
      { title: "Limitation of Liability", content: "BharatOne shall not be held liable for any indirect, incidental, special, or consequential damages arising out of your use or inability to use our services." },
      { title: "Termination", content: "We may terminate or suspend your access to our services without notice if you breach these Terms or engage in any unlawful activity." },
      { title: "Modifications", content: "We reserve the right to update or change these Terms at any time. Your continued use of the Site after any changes constitutes your acceptance of the new Terms." },
      { title: "Governing Law", content: "These Terms are governed by the laws of India. Any disputes will be subject to the jurisdiction of courts in Karnataka, India." },
    ],
    contactHeading: "Questions About Our Terms?",
    contactBody: "If you have any questions or concerns about these Terms and Conditions, please contact us.",
    contactSupport: "Contact Support", back: "Back to Login",
  },
  hi: {
    titlePre: "नियम और", titleHi: "शर्तें",
    subtitle: "BharatOne सेवाओं का उपयोग करने से पहले कृपया इन शर्तों को ध्यान से पढ़ें। हमारे प्लेटफ़ॉर्म का उपयोग करके, आप इन शर्तों से बंधे होने के लिए सहमत होते हैं।",
    updated: "अंतिम अद्यतन: 27 मई 2026",
    agreementHeading: "शर्तों से सहमति",
    agreementBody: "ये नियम और शर्तें आपके और BharatOne Services and Affiliates Pvt. Ltd. के बीच एक कानूनी रूप से बाध्यकारी समझौता हैं, जो हमारी वेबसाइट और सेवाओं तक आपकी पहुँच और उपयोग से संबंधित हैं। हमारी सेवाओं का उपयोग करके, आप पुष्टि करते हैं कि आपने इन शर्तों को पढ़ और समझ लिया है तथा इनसे बंधे रहने के लिए सहमत हैं। यदि आप सहमत नहीं हैं, तो आपको हमारी सेवाओं का उपयोग करने की अनुमति नहीं है।",
    sections: [
      { title: "सेवाओं की प्रकृति", content: "BharatOne Services and Affiliates Pvt. Ltd. विभिन्न भारतीय सरकारी योजनाओं, सब्सिडी, प्रमाणन और आवेदन सेवाओं तक पहुँचने में सहायता प्रदान करती है। हम कोई सरकारी एजेंसी नहीं हैं। सभी सेवाएँ परामर्श/सहायता-आधारित हैं और आवेदन की स्वीकृति या सफलता की गारंटी नहीं देतीं।" },
      { title: "पात्रता", content: "हमारी सेवाओं का उपयोग करने के लिए आपकी आयु कम से कम 18 वर्ष होनी चाहिए और आप कानूनी रूप से अनुबंध करने में सक्षम होने चाहिए।" },
      { title: "स्वीकार्य उपयोग", content: "आप वेबसाइट का उपयोग केवल वैध उद्देश्यों के लिए करने पर सहमत हैं। आप अपनी पहचान गलत नहीं बता सकते, झूठी जानकारी नहीं दे सकते, अनधिकृत पहुँच का प्रयास नहीं कर सकते, या किसी धोखाधड़ी/हानिकारक गतिविधि के लिए साइट का उपयोग नहीं कर सकते।" },
      { title: "भुगतान और धनवापसी", content: "कुछ सेवाओं पर शुल्क लागू हो सकता है। भुगतान से पहले सभी लागू शुल्क बता दिए जाएँगे। सेवा शुरू होने के बाद भुगतान वापस नहीं किया जाएगा।" },
      { title: "बौद्धिक संपदा", content: "साइट की सभी सामग्री—पाठ, ग्राफ़िक्स, लोगो और सॉफ़्टवेयर सहित—BharatOne की संपत्ति है और लागू कानूनों के अंतर्गत सुरक्षित है। लिखित अनुमति के बिना आप किसी भी सामग्री की नकल, पुनरुत्पादन या वितरण नहीं कर सकते।" },
      { title: "तृतीय-पक्ष लिंक", content: "हमारी साइट में तृतीय-पक्ष वेबसाइटों के लिंक हो सकते हैं। ऐसी साइटों की सामग्री, गोपनीयता नीतियों या व्यवहार के लिए हम ज़िम्मेदार नहीं हैं।" },
      { title: "अस्वीकरण", content: "हमारी सेवाएँ सर्वोत्तम-प्रयास आधार पर दी जाती हैं। हम सटीक और अद्यतन जानकारी देने का प्रयास करते हैं, परंतु किसी जानकारी या परिणाम की पूर्णता, सटीकता या समयबद्धता की गारंटी नहीं देते।" },
      { title: "देयता की सीमा", content: "हमारी सेवाओं के उपयोग या उपयोग न कर पाने से उत्पन्न किसी भी अप्रत्यक्ष, आकस्मिक, विशेष या परिणामी क्षति के लिए BharatOne उत्तरदायी नहीं होगा।" },
      { title: "समाप्ति", content: "यदि आप इन शर्तों का उल्लंघन करते हैं या किसी अवैध गतिविधि में संलग्न होते हैं, तो हम बिना सूचना के आपकी पहुँच समाप्त या निलंबित कर सकते हैं।" },
      { title: "संशोधन", content: "हम किसी भी समय इन शर्तों को अद्यतन या बदलने का अधिकार सुरक्षित रखते हैं। परिवर्तनों के बाद साइट का निरंतर उपयोग नई शर्तों की आपकी स्वीकृति माना जाएगा।" },
      { title: "नियामक कानून", content: "ये शर्तें भारत के कानूनों द्वारा शासित हैं। कोई भी विवाद कर्नाटक, भारत के न्यायालयों के अधिकार-क्षेत्र के अधीन होगा।" },
    ],
    contactHeading: "हमारी शर्तों के बारे में प्रश्न?",
    contactBody: "यदि इन नियम और शर्तों के बारे में आपके कोई प्रश्न या चिंताएँ हैं, तो कृपया हमसे संपर्क करें।",
    contactSupport: "सहायता से संपर्क करें", back: "लॉगिन पर वापस",
  },
  kn: {
    titlePre: "ನಿಯಮಗಳು ಮತ್ತು", titleHi: "ಷರತ್ತುಗಳು",
    subtitle: "BharatOne ಸೇವೆಗಳನ್ನು ಬಳಸುವ ಮೊದಲು ದಯವಿಟ್ಟು ಈ ಷರತ್ತುಗಳನ್ನು ಗಮನವಿಟ್ಟು ಓದಿ. ನಮ್ಮ ವೇದಿಕೆಯನ್ನು ಬಳಸುವ ಮೂಲಕ, ನೀವು ಈ ಷರತ್ತುಗಳಿಗೆ ಬದ್ಧರಾಗಿರಲು ಒಪ್ಪುತ್ತೀರಿ.",
    updated: "ಕೊನೆಯ ನವೀಕರಣ: 27 ಮೇ 2026",
    agreementHeading: "ಷರತ್ತುಗಳಿಗೆ ಒಪ್ಪಿಗೆ",
    agreementBody: "ಈ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು ನಮ್ಮ ವೆಬ್‌ಸೈಟ್ ಮತ್ತು ಸೇವೆಗಳ ಪ್ರವೇಶ ಮತ್ತು ಬಳಕೆಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ನಿಮ್ಮ ಮತ್ತು BharatOne Services and Affiliates Pvt. Ltd. ನಡುವಿನ ಕಾನೂನುಬದ್ಧ ಒಪ್ಪಂದವಾಗಿದೆ. ನಮ್ಮ ಸೇವೆಗಳನ್ನು ಬಳಸುವ ಮೂಲಕ, ನೀವು ಈ ಷರತ್ತುಗಳನ್ನು ಓದಿ, ಅರ್ಥಮಾಡಿಕೊಂಡು ಒಪ್ಪಿರುವಿರಿ ಎಂದು ಸಮ್ಮತಿಸುತ್ತೀರಿ. ನೀವು ಒಪ್ಪದಿದ್ದರೆ, ನಮ್ಮ ಸೇವೆಗಳನ್ನು ಬಳಸುವುದನ್ನು ನಿಷೇಧಿಸಲಾಗಿದೆ.",
    sections: [
      { title: "ಸೇವೆಗಳ ಸ್ವರೂಪ", content: "BharatOne Services and Affiliates Pvt. Ltd. ವಿವಿಧ ಭಾರತೀಯ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಸಬ್ಸಿಡಿಗಳು, ಪ್ರಮಾಣೀಕರಣ ಮತ್ತು ಅರ್ಜಿ ಸೇವೆಗಳನ್ನು ಪಡೆಯಲು ಸಹಾಯ ನೀಡುತ್ತದೆ. ನಾವು ಸರ್ಕಾರಿ ಸಂಸ್ಥೆ ಅಲ್ಲ. ಎಲ್ಲಾ ಸೇವೆಗಳು ಸಲಹಾ/ಬೆಂಬಲ ಆಧಾರಿತವಾಗಿದ್ದು, ಅರ್ಜಿಗಳ ಅನುಮೋದನೆ ಅಥವಾ ಯಶಸ್ಸನ್ನು ಖಾತರಿಪಡಿಸುವುದಿಲ್ಲ." },
      { title: "ಅರ್ಹತೆ", content: "ನಮ್ಮ ಸೇವೆಗಳನ್ನು ಬಳಸಲು ನೀವು ಕನಿಷ್ಠ 18 ವರ್ಷ ವಯಸ್ಸಿನವರಾಗಿರಬೇಕು ಮತ್ತು ಕಾನೂನುಬದ್ಧ ಒಪ್ಪಂದ ಮಾಡಿಕೊಳ್ಳಲು ಸಮರ್ಥರಾಗಿರಬೇಕು." },
      { title: "ಸ್ವೀಕಾರಾರ್ಹ ಬಳಕೆ", content: "ನೀವು ವೆಬ್‌ಸೈಟ್ ಅನ್ನು ಕಾನೂನುಬದ್ಧ ಉದ್ದೇಶಗಳಿಗೆ ಮಾತ್ರ ಬಳಸಲು ಒಪ್ಪುತ್ತೀರಿ. ನಿಮ್ಮ ಗುರುತನ್ನು ತಪ್ಪಾಗಿ ಪ್ರತಿನಿಧಿಸುವುದು, ಸುಳ್ಳು ಮಾಹಿತಿ ನೀಡುವುದು, ಅನಧಿಕೃತ ಪ್ರವೇಶದ ಪ್ರಯತ್ನ ಅಥವಾ ವಂಚನೆ/ಹಾನಿಕರ ಚಟುವಟಿಕೆಗೆ ಬಳಸುವುದು ನಿಷಿದ್ಧ." },
      { title: "ಪಾವತಿ ಮತ್ತು ಮರುಪಾವತಿ", content: "ಕೆಲವು ಸೇವೆಗಳಿಗೆ ಶುಲ್ಕ ಅನ್ವಯಿಸಬಹುದು. ಪಾವತಿಗೆ ಮೊದಲು ಎಲ್ಲಾ ಶುಲ್ಕಗಳನ್ನು ತಿಳಿಸಲಾಗುತ್ತದೆ. ಸೇವೆ ಪ್ರಾರಂಭವಾದ ನಂತರ ಪಾವತಿಗಳನ್ನು ಮರುಪಾವತಿ ಮಾಡಲಾಗುವುದಿಲ್ಲ." },
      { title: "ಬೌದ್ಧಿಕ ಆಸ್ತಿ", content: "ಸೈಟ್‌ನ ಎಲ್ಲಾ ವಿಷಯ—ಪಠ್ಯ, ಗ್ರಾಫಿಕ್ಸ್, ಲೋಗೋಗಳು ಮತ್ತು ಸಾಫ್ಟ್‌ವೇರ್ ಸೇರಿದಂತೆ—BharatOne ನ ಆಸ್ತಿಯಾಗಿದ್ದು ಕಾನೂನುಗಳಡಿ ರಕ್ಷಿಸಲ್ಪಟ್ಟಿದೆ. ಲಿಖಿತ ಅನುಮತಿ ಇಲ್ಲದೆ ಯಾವುದೇ ವಿಷಯವನ್ನು ನಕಲಿಸಲು ಅಥವಾ ಹಂಚಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಿಲ್ಲ." },
      { title: "ಮೂರನೇ-ಪಕ್ಷದ ಲಿಂಕ್‌ಗಳು", content: "ನಮ್ಮ ಸೈಟ್‌ನಲ್ಲಿ ಮೂರನೇ-ಪಕ್ಷದ ವೆಬ್‌ಸೈಟ್‌ಗಳ ಲಿಂಕ್‌ಗಳಿರಬಹುದು. ಅಂತಹ ಸೈಟ್‌ಗಳ ವಿಷಯ, ಗೌಪ್ಯತಾ ನೀತಿ ಅಥವಾ ಕಾರ್ಯಗಳಿಗೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ." },
      { title: "ಹಕ್ಕು ನಿರಾಕರಣೆ", content: "ನಮ್ಮ ಸೇವೆಗಳನ್ನು ಅತ್ಯುತ್ತಮ-ಪ್ರಯತ್ನದ ಆಧಾರದಲ್ಲಿ ನೀಡಲಾಗುತ್ತದೆ. ನಿಖರ ಮಾಹಿತಿ ನೀಡಲು ಪ್ರಯತ್ನಿಸುತ್ತೇವೆ, ಆದರೆ ಯಾವುದೇ ಮಾಹಿತಿ/ಫಲಿತಾಂಶದ ಸಂಪೂರ್ಣತೆ ಅಥವಾ ನಿಖರತೆಯನ್ನು ಖಾತರಿಪಡಿಸುವುದಿಲ್ಲ." },
      { title: "ಹೊಣೆಗಾರಿಕೆಯ ಮಿತಿ", content: "ನಮ್ಮ ಸೇವೆಗಳ ಬಳಕೆ ಅಥವಾ ಬಳಸಲಾಗದಿರುವಿಕೆಯಿಂದ ಉಂಟಾಗುವ ಯಾವುದೇ ಪರೋಕ್ಷ, ಆಕಸ್ಮಿಕ ಅಥವಾ ಪರಿಣಾಮಕಾರಿ ಹಾನಿಗೆ BharatOne ಜವಾಬ್ದಾರನಾಗಿರುವುದಿಲ್ಲ." },
      { title: "ಮುಕ್ತಾಯ", content: "ನೀವು ಈ ಷರತ್ತುಗಳನ್ನು ಉಲ್ಲಂಘಿಸಿದರೆ ಅಥವಾ ಯಾವುದೇ ಕಾನೂನುಬಾಹಿರ ಚಟುವಟಿಕೆಯಲ್ಲಿ ತೊಡಗಿದರೆ, ಸೂಚನೆ ಇಲ್ಲದೆ ನಿಮ್ಮ ಪ್ರವೇಶವನ್ನು ರದ್ದುಗೊಳಿಸಬಹುದು." },
      { title: "ಮಾರ್ಪಾಡುಗಳು", content: "ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಈ ಷರತ್ತುಗಳನ್ನು ನವೀಕರಿಸುವ ಹಕ್ಕನ್ನು ನಾವು ಕಾಯ್ದಿರಿಸಿಕೊಂಡಿದ್ದೇವೆ. ಬದಲಾವಣೆಗಳ ನಂತರ ಸೈಟ್‌ನ ಮುಂದುವರಿದ ಬಳಕೆ ಹೊಸ ಷರತ್ತುಗಳ ಸ್ವೀಕಾರ ಎನಿಸುತ್ತದೆ." },
      { title: "ಆಡಳಿತ ಕಾನೂನು", content: "ಈ ಷರತ್ತುಗಳು ಭಾರತದ ಕಾನೂನುಗಳಿಗೆ ಒಳಪಟ್ಟಿವೆ. ಯಾವುದೇ ವಿವಾದ ಕರ್ನಾಟಕ, ಭಾರತದ ನ್ಯಾಯಾಲಯಗಳ ವ್ಯಾಪ್ತಿಗೆ ಒಳಪಡುತ್ತದೆ." },
    ],
    contactHeading: "ನಮ್ಮ ಷರತ್ತುಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿವೆಯೇ?",
    contactBody: "ಈ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳ ಬಗ್ಗೆ ನಿಮಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಅಥವಾ ಕಾಳಜಿ ಇದ್ದರೆ, ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    contactSupport: "ಬೆಂಬಲ ಸಂಪರ್ಕಿಸಿ", back: "ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ",
  },
};

const LANGS: { key: "en" | "hi" | "kn"; label: string }[] = [
  { key: "en", label: "English" }, { key: "hi", label: "हिन्दी" }, { key: "kn", label: "ಕನ್ನಡ" },
];

function TermsPage() {
  const [lang, setLang] = useState<"en" | "hi" | "kn">("en");
  const t = T[lang];
  const [zoom, setZoom] = useState(1);
  const clamp = (z: number) => Math.min(1.5, Math.max(0.8, Math.round(z * 10) / 10));
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
            <div className="hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex" title="Text size">
              <button type="button" aria-label="Increase text size" onClick={() => setZoom((z) => clamp(z + 0.1))} className="grid h-7 w-7 place-items-center rounded-md text-sm font-bold hover:bg-muted">A+</button>
              <button type="button" aria-label="Reset text size" onClick={() => setZoom(1)} className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold hover:bg-muted">A</button>
              <button type="button" aria-label="Decrease text size" onClick={() => setZoom((z) => clamp(z - 0.1))} className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold hover:bg-muted">A-</button>
            </div>
            <Languages className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "hi" | "kn")} className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-india-green/30">
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-14" style={{ zoom }}>
        <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            {t.titlePre} <span className="bg-saffron-gradient bg-clip-text text-transparent">{t.titleHi}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground mx-auto">{t.subtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t.updated}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-gradient text-white shadow-elev"><Gavel className="h-6 w-6" /></div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{t.agreementHeading}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.agreementBody}</p>
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
