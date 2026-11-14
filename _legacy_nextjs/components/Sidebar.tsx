import Link from "next/link";
import { useRouter } from "next/router";

interface Item {
  label: string;
  href: string;
}

const NAV: Record<string, Item[]> = {
  student: [
    { label: "Dashboard", href: "/student/dashboard" },
    { label: "Courses", href: "/student/courses" },
    { label: "Certificate", href: "/student/certificate" },
    { label: "Resources", href: "/resources" },
    { label: "Reels", href: "/reels" },
    { label: "Live Sessions", href: "/live" },
    { label: "Discussions", href: "/discussions" },
    { label: "Study Groups", href: "/study-groups" },
    { label: "Discussions", href: "/discussions" },
    { label: "Study Groups", href: "/study-groups" },
    { label: "Invoices", href: "/student/invoices" },
    { label: "Achievements", href: "/student/achievements" },
    { label: "Analytics", href: "/student/analytics" },
  ],
  staff: [
    { label: "Dashboard", href: "/staff/dashboard" },
    { label: "Course Manage", href: "/staff/course-manage" },
    { label: "Quiz Builder", href: "/staff/quiz-builder" },
    { label: "Student Progress", href: "/staff/student-progress" },
    { label: "Review Submissions", href: "/staff/review-submission" },
    { label: "Resources", href: "/resources" },
    { label: "Reels", href: "/reels" },
    { label: "Live Sessions", href: "/live" },
    { label: "Discussions", href: "/discussions" },
    { label: "Study Groups", href: "/study-groups" },
    { label: "Discussions", href: "/discussions" },
    { label: "Study Groups", href: "/study-groups" },
    { label: "Analytics", href: "/staff/analytics" },
  ],
  guardian: [
    { label: "Dashboard", href: "/guardian/dashboard" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Homepage", href: "/admin/homepage" },
    { label: "Media", href: "/admin/media" },
    { label: "Resources", href: "/admin/resources" },
    { label: "Reels Moderation", href: "/admin/reels" },
    { label: "Live Sessions", href: "/live" },
    { label: "Discussions", href: "/discussions" },
    { label: "Study Groups", href: "/study-groups" },
    { label: "Admissions", href: "/admin/admissions" },
    { label: "Guardians", href: "/admin/guardians" },
    { label: "Careers", href: "/admin/careers" },
    { label: "Users", href: "/admin/users" },
    { label: "Courses", href: "/admin/courses" },
    { label: "Assign Staff", href: "/admin/assign-staff" },
    { label: "Payments", href: "/admin/payments" },
    { label: "Finance", href: "/admin/finance" },
    { label: "Marks", href: "/admin/marks" },
    { label: "Logs", href: "/admin/logs" },
  ],
};

export default function Sidebar({ role }: { role: "student" | "staff" | "admin" | "guardian" }) {
  const router = useRouter();
  const items = NAV[role] || [];

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-gray-50 md:block">
      <nav className="flex flex-col gap-1 p-3">
        {items.map((it) => {
          const active = router.pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded px-3 py-2 text-sm ${
                active ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
