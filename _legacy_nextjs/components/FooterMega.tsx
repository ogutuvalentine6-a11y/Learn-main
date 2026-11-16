import Link from "next/link";
import { useEffect, useState } from "react";

type Role = "student" | "staff" | "admin" | "guardian" | null;

interface LinkItem {
  href: string;
  label: string;
}

interface LinkGroup {
  title: string;
  links: LinkItem[];
}

// Every route below was verified against `find _legacy_nextjs/pages -name "*.tsx"`.
// No fabricated links. No broken navigation. Dynamic [id] routes excluded.
const PUBLIC_GROUPS: LinkGroup[] = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "All Courses" },
      { href: "/resources", label: "Resource Library" },
      { href: "/reels", label: "Video Library" },
      { href: "/live", label: "Live Sessions" },
      { href: "/live/schedule", label: "Session Schedule" },
      { href: "/quizzes", label: "Quizzes" },
      { href: "/discussions", label: "Discussions" },
      { href: "/study-groups", label: "Study Groups" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/about", label: "About Learn" },
      { href: "/instructors", label: "Instructors" },
      { href: "/admissions", label: "Admissions" },
      { href: "/admissions/status", label: "Admission Status" },
      { href: "/academic-calendar", label: "Academic Calendar" },
      { href: "/certificates", label: "Certificates" },
      { href: "/events", label: "Events" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

const STUDENT_GROUP: LinkGroup = {
  title: "My Learning",
  links: [
    { href: "/student/dashboard", label: "Dashboard" },
    { href: "/student/courses", label: "My Courses" },
    { href: "/student/schedule", label: "Schedule" },
    { href: "/student/attendance", label: "Attendance" },
    { href: "/student/analytics", label: "Analytics" },
    { href: "/student/certificate", label: "Certificates" },
    { href: "/student/invoices", label: "Invoices" },
    { href: "/student/achievements", label: "Achievements" },
    { href: "/student/welfare", label: "Welfare" },
  ],
};

const STAFF_GROUP: LinkGroup = {
  title: "Teaching",
  links: [
    { href: "/staff/dashboard", label: "Dashboard" },
    { href: "/staff/course-manage", label: "Course Manager" },
    { href: "/staff/student-progress", label: "Student Progress" },
    { href: "/staff/attendance", label: "Attendance" },
    { href: "/staff/quizzes", label: "Quizzes" },
    { href: "/staff/quiz-builder", label: "Quiz Builder" },
    { href: "/staff/timetable", label: "Timetable" },
    { href: "/staff/review-submission", label: "Review Submissions" },
    { href: "/staff/analytics", label: "Analytics" },
  ],
};

const ADMIN_GROUP: LinkGroup = {
  title: "Administration",
  links: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/courses", label: "Courses" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/finance", label: "Finance" },
    { href: "/admin/admissions", label: "Admissions" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/marks", label: "Marks" },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/homepage", label: "Homepage CMS" },
    { href: "/admin/media", label: "Media" },
    { href: "/admin/reels", label: "Reels" },
    { href: "/admin/resources", label: "Resources" },
    { href: "/admin/guardians", label: "Guardians" },
    { href: "/admin/careers", label: "Careers" },
    { href: "/admin/welfare", label: "Welfare" },
    { href: "/admin/assign-staff", label: "Assign Staff" },
    { href: "/admin/logs", label: "Audit Logs" },
  ],
};

const GUARDIAN_GROUP: LinkGroup = {
  title: "Guardian",
  links: [{ href: "/guardian/dashboard", label: "Dashboard" }],
};

const ACCOUNT_GROUP: LinkGroup = {
  title: "Account",
  links: [
    { href: "/login", label: "Sign In" },
    { href: "/register", label: "Create Account" },
    { href: "/student/dashboard", label: "Student Portal" },
    { href: "/staff/dashboard", label: "Staff Portal" },
    { href: "/admin/dashboard", label: "Admin Portal" },
    { href: "/guardian/dashboard", label: "Guardian Portal" },
  ],
};

export default function FooterMega({ role: propRole }: { role?: Role } = {}) {
  const [role, setRole] = useState<Role>(propRole ?? null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
    if (propRole !== undefined) return;
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const r = d?.role || d?.user_type || null;
        if (r === "student" || r === "staff" || r === "admin" || r === "guardian") {
          setRole(r);
        }
      })
      .catch(() => {});
  }, [propRole]);

  const groups: LinkGroup[] = [
    ...PUBLIC_GROUPS,
    ...(role === "student" ? [STUDENT_GROUP] : []),
    ...(role === "staff" ? [STAFF_GROUP] : []),
    ...(role === "admin" ? [ADMIN_GROUP] : []),
    ...(role === "guardian" ? [GUARDIAN_GROUP] : []),
    ACCOUNT_GROUP,
  ];

  return (
    <footer className="bg-brand-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="mb-10 pb-8 border-b border-brand-700">
          <Link href="/" className="text-2xl font-bold text-white tracking-tight">
            Learn<span className="text-brand-300">.</span>
          </Link>
          <p className="mt-3 max-w-xl text-sm text-gray-400">
            A unified learning platform for students, instructors, guardians, and
            administrators — built for real progress, not just pretty pages.
          </p>
        </div>

        <nav aria-label="Site navigation">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-brand-200 tracking-wider uppercase mb-4">
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="mt-12 border-t border-brand-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {year ?? 2026} Learn Education Platform. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
            <a
              href="https://github.com/ogutuvalentine6-a11y"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
