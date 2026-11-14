import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface NavbarProps {
  role?: "student" | "staff" | "admin" | null;
  name?: string;
}

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/resources", label: "Resources" },
  { href: "/reels", label: "Reels" },
  { href: "/live", label: "Live" },
  { href: "/events", label: "Events" },
  { href: "/instructors", label: "Instructors" },
  { href: "/discussions", label: "Discussions" },
  { href: "/study-groups", label: "Study Groups" },
  { href: "/certificates", label: "Certificates" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/admissions", label: "Apply" },
];

export default function Navbar({ role, name }: NavbarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ role: string; fullName: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (role) return; // dashboard passed role explicitly
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => setMe(null));
  }, [role]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setUnread(d.count || 0))
      .catch(() => {});
  }, [me]);

  async function openNotifications() {
    setNotifOpen((v) => !v);
    if (notifs.length === 0) {
      const d = await fetch("/api/notifications?limit=10").then((r) => r.ok ? r.json() : []);
      setNotifs(Array.isArray(d) ? d : []);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth-logout", { method: "POST" });
    router.push("/login");
  }

  const effectiveRole = role ?? me?.role ?? null;
  const effectiveName = name ?? me?.fullName;

  const home =
    effectiveRole === "admin" ? "/admin/dashboard"
    : effectiveRole === "staff" ? "/staff/dashboard"
    : effectiveRole === "student" ? "/student/dashboard"
    : "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href={home} className="text-lg font-bold text-brand-600">
          Learning Platform
        </Link>

        {!effectiveRole && (
          <nav className="hidden gap-6 md:flex">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-gray-700 hover:text-brand-600"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {effectiveName && (
            <span className="hidden text-sm text-gray-600 sm:inline">
              {effectiveName}
            </span>
          )}

          {effectiveRole ? (
            <button
              onClick={logout}
              disabled={busy}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "..." : "Logout"}
            </button>
          ) : (
            <div className="hidden gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded border border-brand-600 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
              >
                Get Started
              </Link>
            </div>
          )}

          {!effectiveRole && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded border px-2 py-1 text-sm md:hidden"
              aria-label="Toggle navigation"
            >
              ☰
            </button>
          )}
        </div>
      </div>

      {open && !effectiveRole && (
        <div className="border-t bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded border border-brand-600 px-3 py-1.5 text-center text-sm text-brand-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex-1 rounded bg-brand-600 px-3 py-1.5 text-center text-sm text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
