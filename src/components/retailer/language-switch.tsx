import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { applyLanguage, getLang, type Lang } from "@/lib/kn-i18n";

// Native English ⇄ Kannada switch — no Google Translate, no banner.
// Uses the app's built-in dictionary translator (see src/lib/kn-i18n.ts).
export function LanguageSwitch() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const l = getLang();
    setLang(l);
    applyLanguage(l); // apply persisted language on mount (and suppress Google Translate)
  }, []);

  const choose = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    applyLanguage(l);
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold" translate="no">
      <Languages className="ml-1 mr-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <button
        type="button"
        onClick={() => choose("en")}
        className={`rounded-md px-2 h-7 transition ${lang === "en" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "en"}
      >EN</button>
      <button
        type="button"
        onClick={() => choose("kn")}
        className={`rounded-md px-2 h-7 transition ${lang === "kn" ? "bg-india-green text-white" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "kn"}
      >ಕನ್ನಡ</button>
    </div>
  );
}
