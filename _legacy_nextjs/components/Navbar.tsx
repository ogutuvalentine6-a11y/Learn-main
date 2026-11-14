import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import SearchPalette from "./SearchPalette";

interface NavbarProps {
  role?: "student" | "staff" | "admin" | "guardian" | null;
  name?: string;
}

interface NavItem {
  href?: string;
  label: string;
  items?: { href: string; label: string; desc?: string }[];
}

const NAV: NavItem[] = [
  {
    label: "Courses",
    items: [
      { href: "/courses", label: "All Courses", desc: "Browse the catalog" },
      { href: "/resources", label: "Resources", desc: "Study materials" },
      { href: "/certificates", label: "Certificates", desc: "Verify a credential" },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/reels", label: "Reels", desc: "Short-form video lessons" },
      { href: "/live", label: "Live Sessions", desc: "Interactive classrooms" },
      { href: "/events", label: "Events", desc: "Upcoming sessions" },
      { href: "/leaderboard", label: "Leaderboard", desc: "Top learners" },
      { href: "/academic-calendar", label: "Academic Calendar", desc: "Semester dates & deadlines" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/discussions", label: "Discussions", desc: "Ask and answer" },
      { href: "/study-groups", label: "Study Groups", desc: "Learn together" },
      { href: "/instructors", label: "Instructors", desc: "Meet the staff" },
    ],
  },
  { href: "/careers", label: "Careers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar({ role, name }: NavbarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ role: string; fullName: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch /me when role not passed explicitly
  useEffect(() => {
    if (role) return;
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => setMe(null));
  }, [role]);

  // Fetch announcements for the ticker
  useEffect(() => {
    fetch("/api/homepage-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const active = (d?.announcements || []).filter((a: any) => a.active);
        setAnnouncements(active);
      })
      .catch(() => {});
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    const effective = role ?? me?.role;
    if (!effective) return;
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setUnread(d.count || 0))
      .catch(() => {});
  }, [role, me]);

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      // Close nav dropdowns if clicked outside any [data-dropdown]
      const target = e.target as Element;
      if (!target.closest("[data-dropdown]")) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    function onRoute() {
      setMobileOpen(false);
      setMobileSection(null);
      setUserMenuOpen(false);
      setNotifOpen(false);
      setOpenMenu(null);
    }
    router.events.on("routeChangeStart", onRoute);
    return () => router.events.off("routeChangeStart", onRoute);
  }, [router]);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth-logout", { method: "POST" });
    router.push("/login");
  }

  async function openNotifications() {
    setNotifOpen((v) => !v);
    if (notifs.length === 0) {
      const d = await fetch("/api/notifications?limit=10").then((r) =>
        r.ok ? r.json() : []
      );
      setNotifs(Array.isArray(d) ? d : []);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  }

  const effectiveRole = role ?? me?.role ?? null;
  const effectiveName = name ?? me?.fullName;

  const home =
    effectiveRole === "admin" ? "/admin/dashboard"
    : effectiveRole === "staff" ? "/staff/dashboard"
    : effectiveRole === "guardian" ? "/guardian/dashboard"
    : effectiveRole === "student" ? "/student/dashboard"
    : "/";

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return router.pathname === "/";
    return router.pathname === href || router.pathname.startsWith(href + "/");
  };

  const hasActiveChild = (item: NavItem) =>
    item.items?.some((sub) => isActive(sub.href)) ?? false;

  return (
    <>
      <header className="sticky top-0 z-40">
        {/* ── Announcement ticker ── */}
        {announcements.length > 0 && (
          <div className="bg-brand-600 text-white">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-xs">
              <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                News
              </span>
              <div className="flex-1 overflow-hidden">
                <p className="truncate">
                  {announcements[0].text}
                  {announcements.length > 1 && (
                    <span className="ml-2 opacity-75">
                      (+{announcements.length - 1} more)
                    </span>
                  )}
                </p>
              </div>
              {announcements[0].link && (
                <Link
                  href={announcements[0].link}
                  className="shrink-0 font-semibold underline hover:no-underline"
                >
                  Learn more →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Main bar ── */}
        <div className="border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            {/* Logo */}
            <Link
              href={home}
              className="shrink-0 text-lg font-bold text-brand-600 hover:text-brand-700"
            >
              Learning Platform
            </Link>

            {/* Desktop nav */}
            <nav className="hidden flex-1 items-center gap-1 lg:flex">
              {NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="relative" data-dropdown>
                    <button
                      onClick={() =>
                        setOpenMenu((m) => (m === item.label ? null : item.label))
                      }
                      className={`flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition ${
                        hasActiveChild(item) || openMenu === item.label
                          ? "text-brand-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-brand-600"
                      }`}
                    >
                      {item.label}
                      <span className="text-xs opacity-60">▾</span>
                    </button>
                    {openMenu === item.label && (
                      <div className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-lg border bg-white shadow-lg">
                        {item.items.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block px-4 py-2.5 text-sm transition hover:bg-gray-50 ${
                              isActive(sub.href)
                                ? "bg-brand-50 text-brand-700"
                                : "text-gray-700"
                            }`}
                          >
                            <p className="font-medium">{sub.label}</p>
                            {sub.desc && (
                              <p className="text-xs text-gray-500">{sub.desc}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={`rounded px-3 py-2 text-sm font-medium transition ${
                      isActive(item.href)
                        ? "text-brand-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-brand-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-1 lg:gap-2">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Search"
                title="Search (⌘K)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </button>

              {/* Notifications (auth only) */}
              {effectiveRole && (
                <div ref={notifRef} className="relative">
                  <button
                    onClick={openNotifications}
                    className="relative rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Notifications"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unread > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-1 w-80 overflow-hidden rounded-lg border bg-white shadow-lg">
                      <div className="flex items-center justify-between border-b px-4 py-2.5">
                        <span className="text-sm font-semibold">Notifications</span>
                        {unread > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifs.length === 0 ? (
                          <p className="p-6 text-center text-sm text-gray-500">
                            No notifications
                          </p>
                        ) : (
                          notifs.map((n) => (
                            <Link
                              key={n._id}
                              href={n.link || "#"}
                              className={`block border-b px-4 py-3 text-sm transition hover:bg-gray-50 ${
                                n.read ? "" : "bg-blue-50/50"
                              }`}
                            >
                              <p className="font-medium text-gray-900">{n.title}</p>
                              {n.body && (
                                <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                              )}
                              <p className="mt-1 text-[10px] text-gray-400">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User menu or auth buttons */}
              {effectiveRole ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full p-1 pl-2 pr-3 hover:bg-gray-100"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {effectiveName
                        ? effectiveName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()
                        : "?"}
                    </span>
                    <span className="hidden text-sm font-medium text-gray-700 md:inline">
                      {effectiveName?.split(" ")[0]}
                    </span>
                    <span className="text-xs opacity-60">▾</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-1 w-56 overflow-hidden rounded-lg border bg-white shadow-lg">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{effectiveName}</p>
                        <p className="text-xs capitalize text-gray-500">{effectiveRole}</p>
                      </div>
                      <Link
                        href={home}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Dashboard
                      </Link>
                      {effectiveRole === "student" && (
                        <Link href="/student/invoices" className="block px-4 py-2 text-sm hover:bg-gray-50">
                          Invoices
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        disabled={busy}
                        className="block w-full border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy ? "Logging out…" : "Logout"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden rounded border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:inline-block"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="hidden rounded bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 sm:inline-block"
                  >
                    Get Started
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="rounded p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div className="border-b bg-white lg:hidden">
            <div className="max-h-[70vh] overflow-y-auto px-4 py-2">
              {NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="border-b">
                    <button
                      onClick={() =>
                        setMobileSection((s) => (s === item.label ? null : item.label))
                      }
                      className="flex w-full items-center justify-between py-2.5 text-sm font-medium text-gray-900"
                    >
                      {item.label}
                      <span className="text-xs text-gray-400">
                        {mobileSection === item.label ? "▴" : "▾"}
                      </span>
                    </button>
                    {mobileSection === item.label && (
                      <div className="pb-2">
                        {item.items.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="block rounded py-1.5 pl-4 text-sm text-gray-600 hover:bg-gray-50"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className="block border-b py-2.5 text-sm font-medium text-gray-900"
                  >
                    {item.label}
                  </Link>
                )
              )}

              {!effectiveRole && (
                <div className="flex gap-2 py-3">
                  <Link
                    href="/login"
                    className="flex-1 rounded border border-brand-600 py-2 text-center text-sm font-medium text-brand-600"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded bg-brand-600 py-2 text-center text-sm font-medium text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              <button
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                className="my-2 w-full rounded border py-2 text-sm text-gray-700"
              >
                🔍 Search
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Search palette ── */}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </>
  );
}
