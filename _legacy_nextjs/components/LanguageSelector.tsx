import { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useTranslation } from "@/contexts/LanguageContext";

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        aria-label="Change language"
        title="Change language"
      >
        <span>{current.flag}</span>
        <span className="hidden uppercase md:inline">{current.code}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 overflow-hidden rounded-lg border bg-white shadow-lg">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={async () => {
                await setLanguage(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-gray-50 ${
                l.code === language ? "bg-brand-50 text-brand-700" : "text-gray-700"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
