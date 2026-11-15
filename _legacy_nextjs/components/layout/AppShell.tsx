"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { MenuIcon, XIcon } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  nav: NavItem[];
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  brandName?: string;
};

function titleFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Learn";
}

export function AppShell({
  nav, children, headerRight, brandName = "Learn",
}: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? router.pathname === "/"
      : router.pathname === href || router.pathname.startsWith(href + "/");

  useEffect(() => { setDrawerOpen(false); }, [router.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  const title = titleFromPath(router.pathname);
  const primary = nav.slice(0, 5);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 border-r border-border bg-surface">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Link href="/" className="font-bold text-fg tracking-tight">{brandName}</Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors " +
                (isActive(item.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-fg-muted hover:text-fg hover:bg-surface-2")
              }
            >
              <span className="shrink-0" aria-hidden>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-brand-900/40 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-lg animate-slide-up overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <span className="font-bold text-fg tracking-tight">{brandName}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-10 w-10 grid place-items-center rounded-lg hover:bg-surface-2 text-fg-muted"
                aria-label="Close menu"
              >
                <XIcon size={20} />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={
                    "flex items-center gap-3 h-11 px-3 rounded-lg text-[15px] font-medium transition-colors " +
                    (isActive(item.href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-fg-muted hover:text-fg hover:bg-surface-2")
                  }
                >
                  <span className="shrink-0" aria-hidden>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur border-b border-border flex items-center px-4 gap-3">
          <button
            type="button"
            className="md:hidden h-10 w-10 grid place-items-center rounded-lg hover:bg-surface-2 text-fg-muted"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={22} />
          </button>
          <h1 className="flex-1 min-w-0 truncate text-base font-semibold text-fg">{title}</h1>
          {headerRight}
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-surface border-t border-border flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary navigation"
      >
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors " +
              (isActive(item.href) ? "text-brand-600" : "text-fg-muted")
            }
          >
            <span className="text-lg leading-none" aria-hidden>{item.icon}</span>
            <span className="truncate max-w-full px-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
