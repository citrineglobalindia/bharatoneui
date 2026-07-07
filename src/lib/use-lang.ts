import { useEffect, useState } from "react";
import { getLang, onLangChange, type Lang } from "@/lib/kn-i18n";

// Reactive current language for DB content that carries its own translations.
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(getLang());
    return onLangChange(setLang);
  }, []);
  return lang;
}

// Pick the value for the active language, falling back to English.
export function pick(lang: Lang, en: string, kn?: string | null, hi?: string | null): string {
  if (lang === "kn") return kn?.trim() || en;
  if (lang === "hi") return hi?.trim() || en;
  return en;
}
