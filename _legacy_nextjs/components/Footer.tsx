type FooterLink = { label: string; href: string };
type FooterLinkGroup = { title: string; links: FooterLink[] };

import Link from "next/link";

export default function Footer({ groups }: { groups?: FooterLinkGroup[] } = {}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-brand-600">Learning Platform</p>
            <p className="mt-3 text-sm text-gray-600">
              Learn without limits. Built for students, instructors, and
              administrators — honestly, securely, and with care.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Navigate
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/" className="hover:text-brand-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#courses" className="hover:text-brand-600">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-brand-600">
                  About
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-600">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-600">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Platform
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>Students — progress &amp; submissions</li>
              <li>Instructors — sessions &amp; quizzes</li>
              <li>Admins — users, courses, payments</li>
              <li>Payments via Paystack</li>
              <li>Materials via Cloudinary</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Founder
            </h4>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              Valentine Otieno Ogutu
            </p>
            <p className="text-xs text-gray-500">Software Engineer</p>
            <a
              href="https://github.com/ogutuvalentine6-a11y"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-brand-600 hover:underline"
            >
              github.com/ogutuvalentine6-a11y
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 md:flex-row">
          <p className="text-xs text-gray-500">
            © {year} Learn Platform. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Designed &amp; built by{" "}
            <span className="font-medium text-gray-900">
              Valentine Otieno Ogutu
            </span>{" "}
            —{" "}
            <a
              href="https://github.com/ogutuvalentine6-a11y"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Software Engineer
            </a>
          </p>
          <p className="text-xs text-gray-500">Next.js · FastAPI · MongoDB</p>
        </div>
      </div>
    </footer>
  );
}
