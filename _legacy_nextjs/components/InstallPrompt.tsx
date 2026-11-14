import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed? Don't show anything
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // User dismissed before? Respect that for 7 days
    const dismissedAt = localStorage.getItem("learn_install_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("learn_install_dismissed", Date.now().toString());
  }

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border bg-white p-4 shadow-lg md:left-4 md:right-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          📱
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            Install Learn as an app
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            Faster access, works offline, no browser needed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-700"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
