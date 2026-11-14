import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Language, translate } from "@/lib/i18n";

interface Ctx {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageCtx = createContext<Ctx>({
  language: "en",
  setLanguage: async () => {},
  t: (key) => key,
});

const COOKIE_NAME = "learn_lang";
const STORAGE_KEY = "learn_lang";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; samesite=lax`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Load initial preference on mount
  useEffect(() => {
    const fromCookie = readCookie(COOKIE_NAME) as Language | null;
    const fromStorage =
      typeof window !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as Language | null)
        : null;
    const initial = fromCookie || fromStorage || "en";
    if (initial === "en" || initial === "sw" || initial === "fr") {
      setLanguageState(initial);
    }
  }, []);

  async function setLanguage(lang: Language) {
    setLanguageState(lang);
    writeCookie(COOKIE_NAME, lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    // Persist to backend if authenticated (best-effort, ignore failure)
    try {
      await fetch("/api/auth-me/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    } catch {
      // ignore — user may not be logged in
    }
  }

  function t(key: string): string {
    return translate(language, key);
  }

  return (
    <LanguageCtx.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageCtx.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageCtx);
}
