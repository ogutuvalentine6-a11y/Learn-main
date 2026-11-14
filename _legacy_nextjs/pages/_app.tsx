import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
import InstallPrompt from "@/components/InstallPrompt";
import "@/app/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Register only in the browser — Next dev mode skips SW to avoid
    // stale caches during development. Production build will register.
    const isDev = window.location.hostname === "localhost";
    if (isDev) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });
  }, []);

  return (
    <LanguageProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" />
      <InstallPrompt />
    </LanguageProvider>
  );
}
