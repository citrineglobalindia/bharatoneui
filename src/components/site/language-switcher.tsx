import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { applyLanguage, getLang, type Lang } from "@/lib/kn-i18n";

const OPTIONS: { code: Lang; flag: string; label: string; short: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English", short: "EN" },
  { code: "kn", flag: "🇮🇳", label: "ಕನ್ನಡ", short: "ಕನ್ನಡ" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी", short: "हिं" },
];

// Public-site language switcher (English / Kannada / Hindi). Native dictionary
// translation — no Google Translate. Persists to localStorage and applies the
// saved language on mount so it survives refresh and cross-page navigation.
export function LanguageSwitcher({ variant = "bar" }: { variant?: "bar" | "block" }) {
  const [lang, setLang] = useState<Lang>("en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const l = getLang();
    setLang(l);
    applyLanguage(l); // apply persisted language + suppress Google Translate
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = (l: Lang) => {
    setOpen(false);
    if (l === lang) return;
    setLang(l);
    applyLanguage(l);
  };

  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];
  const isBlock = variant === "block";

  return (
    <div ref={ref} className="relative" translate="no">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className={
          isBlock
            ? "flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 h-11 text-sm font-semibold hover:bg-muted transition-colors"
            : "flex items-center gap-1.5 hover:text-[var(--saffron-glow)] transition-colors"
        }
      >
        <span className="flex items-center gap-1.5">
          <Globe className={isBlock ? "h-4 w-4 text-muted-foreground" : "h-3 w-3"} />
          <span>{current.flag} {isBlock ? current.label : current.short}</span>
        </span>
        <ChevronDown className={`${isBlock ? "h-4 w-4" : "h-3 w-3"} opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute z-[80] mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-card py-1 text-foreground shadow-elegant ${isBlock ? "left-0 bottom-full mb-2 mt-0 w-full" : "right-0"}`}
        >
          {OPTIONS.map((o) => (
            <li key={o.code} role="option" aria-selected={o.code === lang}>
              <button
                type="button"
                onClick={() => choose(o.code)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted ${o.code === lang ? "font-bold text-india-green" : "font-medium"}`}
              >
                <span className="flex items-center gap-2"><span className="text-base leading-none">{o.flag}</span> {o.label}</span>
                {o.code === lang && <Check className="h-4 w-4 text-india-green" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
