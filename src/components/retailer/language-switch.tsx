import { useEffect, useState } from "react";
import { Languages } from "lucide-react";

// Whole-portal English ⇄ Kannada switch powered by Google Translate.
// The Google "website translator" reads a `googtrans` cookie on load and
// translates every string on the page, so this works across the entire portal.

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

function currentLang(): "en" | "kn" {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  return m && decodeURIComponent(m[1]).endsWith("/kn") ? "kn" : "en";
}

function applyLang(lang: "en" | "kn") {
  const host = location.hostname;
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // Clear any existing cookie (path + domain variants) first.
  document.cookie = `googtrans=;path=/;${expire}`;
  document.cookie = `googtrans=;path=/;domain=${host};${expire}`;
  document.cookie = `googtrans=;path=/;domain=.${host};${expire}`;
  if (lang === "kn") {
    document.cookie = `googtrans=/en/kn;path=/`;
    document.cookie = `googtrans=/en/kn;path=/;domain=${host}`;
    document.cookie = `googtrans=/en/kn;path=/;domain=.${host}`;
  }
  location.reload();
}

export function LanguageSwitch() {
  const [lang, setLang] = useState<"en" | "kn">("en");

  useEffect(() => {
    setLang(currentLang());
    // Load the Google Translate element once; it auto-applies the googtrans cookie.
    if (!document.getElementById("google-translate-script")) {
      const style = document.createElement("style");
      style.textContent = `
        .goog-te-banner-frame.skiptranslate, .goog-te-gadget, #goog-gt-tt,
        .goog-te-balloon-frame, .goog-tooltip { display:none !important; }
        body { top:0 !important; position: static !important; }`;
      document.head.appendChild(style);

      const host = document.createElement("div");
      host.id = "google_translate_element";
      host.style.display = "none";
      document.body.appendChild(host);

      window.googleTranslateElementInit = () => {
        try {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en", includedLanguages: "en,kn", autoDisplay: false },
            "google_translate_element",
          );
        } catch { /* ignore */ }
      };
      const s = document.createElement("script");
      s.id = "google-translate-script";
      s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold" translate="no">
      <Languages className="ml-1 mr-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <button
        type="button"
        onClick={() => lang !== "en" && applyLang("en")}
        className={`rounded-md px-2 h-7 transition ${lang === "en" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "en"}
      >EN</button>
      <button
        type="button"
        onClick={() => lang !== "kn" && applyLang("kn")}
        className={`rounded-md px-2 h-7 transition ${lang === "kn" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "kn"}
      >ಕನ್ನಡ</button>
    </div>
  );
}
