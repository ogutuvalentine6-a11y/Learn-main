import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";
import { BookIcon, FileIcon, ChartIcon, UsersIcon } from "@/components/layout/icons";

const SECTIONS = [
  { title: "Getting started", desc: "Create your account, choose your role, and explore your first course.", href: "/register", Icon: UsersIcon },
  { title: "Browse courses", desc: "See every course in the catalogue, filtered by category and level.", href: "/courses", Icon: BookIcon },
  { title: "Learning resources", desc: "Download PDFs, notes, and study guides across all your enrolled courses.", href: "/resources", Icon: FileIcon },
  { title: "Student dashboard", desc: "Track your progress, grades, attendance, and certificates in one place.", href: "/student/dashboard", Icon: ChartIcon },
  { title: "Instructor tools", desc: "Manage courses, review submissions, and run live sessions.", href: "/staff/dashboard", Icon: UsersIcon },
  { title: "Administrator tools", desc: "Users, payments, analytics, audit logs, and platform settings.", href: "/admin/dashboard", Icon: ChartIcon },
];

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Help Centre</h1>
          <p className="mt-2 text-lg text-fg-muted max-w-2xl">
            Documentation, guides, and support for every role on the platform.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.map((s) => {
              const Icon = s.Icon;
              return (
                <Link key={s.title} href={s.href} className="group bg-surface rounded-xl border border-border p-6 hover:shadow-md hover:border-brand-600 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3">
                    <Icon size={20} />
                  </div>
                  <h2 className="font-bold text-fg group-hover:text-brand-600 transition-colors">{s.title}</h2>
                  <p className="mt-2 text-sm text-fg-muted">{s.desc}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/faq" className="bg-brand-50 rounded-xl border border-brand-200 p-6 hover:bg-brand-100 transition-colors">
              <h2 className="font-bold text-brand-800">Frequently asked questions</h2>
              <p className="mt-2 text-sm text-brand-700">Answers to the most common questions about accounts, courses, and payments.</p>
            </Link>
            <Link href="/contact" className="bg-brand-50 rounded-xl border border-brand-200 p-6 hover:bg-brand-100 transition-colors">
              <h2 className="font-bold text-brand-800">Still stuck?</h2>
              <p className="mt-2 text-sm text-brand-700">Contact our support team directly. We respond within one business day.</p>
            </Link>
          </div>
        </div>
      </main>
      <FooterMega />
    </>
  );
}
