import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
import InstallPrompt from "@/components/InstallPrompt";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import {
  HomeIcon, BookIcon, CalendarIcon, ChartIcon, CardIcon,
  CheckIcon, AwardIcon, UsersIcon, ClipboardIcon, FileIcon,
  DollarIcon, ShieldIcon, VideoIcon,
} from "@/components/layout/icons";
import "@/app/globals.css";

const studentNav: NavItem[] = [
  { href: "/student/dashboard",   label: "Dashboard",    icon: <HomeIcon size={18} /> },
  { href: "/student/courses",     label: "Courses",      icon: <BookIcon size={18} /> },
  { href: "/student/schedule",    label: "Schedule",     icon: <CalendarIcon size={18} /> },
  { href: "/student/attendance",  label: "Attendance",   icon: <CheckIcon size={18} /> },
  { href: "/student/certificate", label: "Certificates", icon: <AwardIcon size={18} /> },
  { href: "/student/analytics",   label: "Analytics",    icon: <ChartIcon size={18} /> },
  { href: "/student/invoices",    label: "Invoices",     icon: <CardIcon size={18} /> },
  { href: "/student/achievements",label: "Achievements", icon: <AwardIcon size={18} /> },
  { href: "/student/welfare",     label: "Welfare",      icon: <FileIcon size={18} /> },
];

const staffNav: NavItem[] = [
  { href: "/staff/dashboard",          label: "Dashboard",  icon: <HomeIcon size={18} /> },
  { href: "/staff/course-manage",      label: "Courses",    icon: <BookIcon size={18} /> },
  { href: "/staff/student-progress",   label: "Students",   icon: <UsersIcon size={18} /> },
  { href: "/staff/quizzes",            label: "Quizzes",    icon: <ClipboardIcon size={18} /> },
  { href: "/staff/timetable",          label: "Timetable",  icon: <CalendarIcon size={18} /> },
  { href: "/staff/analytics",          label: "Analytics",  icon: <ChartIcon size={18} /> },
  { href: "/staff/attendance",         label: "Attendance", icon: <CheckIcon size={18} /> },
  { href: "/staff/review-submission",  label: "Submissions",icon: <FileIcon size={18} /> },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard", icon: <HomeIcon size={18} /> },
  { href: "/admin/users",      label: "Users",     icon: <UsersIcon size={18} /> },
  { href: "/admin/courses",    label: "Courses",   icon: <BookIcon size={18} /> },
  { href: "/admin/payments",   label: "Payments",  icon: <DollarIcon size={18} /> },
  { href: "/admin/analytics",  label: "Analytics", icon: <ChartIcon size={18} /> },
  { href: "/admin/admissions", label: "Admissions",icon: <FileIcon size={18} /> },
  { href: "/admin/finance",    label: "Finance",   icon: <CardIcon size={18} /> },
  { href: "/admin/marks",      label: "Marks",     icon: <ClipboardIcon size={18} /> },
  { href: "/admin/calendar",   label: "Calendar",  icon: <CalendarIcon size={18} /> },
  { href: "/admin/homepage",   label: "Homepage",  icon: <BookIcon size={18} /> },
  { href: "/admin/media",      label: "Media",     icon: <VideoIcon size={18} /> },
  { href: "/admin/reels",      label: "Reels",     icon: <VideoIcon size={18} /> },
  { href: "/admin/resources",  label: "Resources", icon: <FileIcon size={18} /> },
  { href: "/admin/guardians",  label: "Guardians", icon: <ShieldIcon size={18} /> },
  { href: "/admin/careers",    label: "Careers",   icon: <FileIcon size={18} /> },
  { href: "/admin/welfare",    label: "Welfare",   icon: <FileIcon size={18} /> },
  { href: "/admin/logs",       label: "Logs",      icon: <FileIcon size={18} /> },
  { href: "/admin/assign-staff", label: "Assign Staff", icon: <UsersIcon size={18} /> },
];

const guardianNav: NavItem[] = [
  { href: "/guardian/dashboard", label: "Dashboard", icon: <HomeIcon size={18} /> },
];

function shellFor(pathname: string): NavItem[] | null {
  if (pathname === "/student"  || pathname.startsWith("/student/"))  return studentNav;
  if (pathname === "/staff"    || pathname.startsWith("/staff/"))    return staffNav;
  if (pathname === "/admin"    || pathname.startsWith("/admin/"))    return adminNav;
  if (pathname === "/guardian" || pathname.startsWith("/guardian/")) return guardianNav;
  return null;
}

// Dashboard pages get the softer blue surface; learning surfaces get the
// workspace tint. Everything else stays on the main app background.
function backgroundFor(pathname: string): "default" | "dashboard" | "workspace" {
  if (
    pathname.endsWith("/dashboard") ||
    pathname === "/student" || pathname === "/staff" || pathname === "/admin"
  ) return "dashboard";
  if (
    pathname.startsWith("/student/course-view") ||
    pathname.startsWith("/student/session")     ||
    pathname.startsWith("/live/sessions")
  ) return "workspace";
  return "default";
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost") return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  }, []);

  const { pathname } = useRouter();
  const nav = shellFor(pathname);
  const bg  = backgroundFor(pathname);

  return (
    <LanguageProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {nav ? (
        <AppShell nav={nav} backgroundVariant={bg}>
          <Component {...pageProps} />
        </AppShell>
      ) : (
        <Component {...pageProps} />
      )}
      <Toaster position="top-right" />
      <InstallPrompt />
    </LanguageProvider>
  );
}
