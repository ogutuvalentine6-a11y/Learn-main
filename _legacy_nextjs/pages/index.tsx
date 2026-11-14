import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
}

interface Stats {
  students: number;
  instructors: number;
  courses: number;
  enrollments: number;
}

interface HomepageContent {
  hero: { title: string; subtitle: string; badgeText: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; };
  founder: { name: string; role: string; bio: string; githubUrl: string; };
  cta: { title: string; subtitle: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; };
  announcements: { id: string; text: string; link: string; active: boolean }[];
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [home, setHome] = useState<HomepageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/course-list").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/public-stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/homepage-content").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([c, s, h]) => {
        setCourses(Array.isArray(c) ? c.slice(0, 6) : []);
        setStats(s);
        setHome(h);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
          <span className="inline-block rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
            {home?.hero.badgeText ?? "Learning without limits"}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
            {home?.hero.title ?? "Learn Without Limits. Build Your Future."}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            {home?.hero.subtitle ?? "Discover quality education, connect with experienced instructors, access learning resources, and develop the skills you need to succeed."}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-6 py-3 text-white shadow-sm hover:bg-brand-700"
            >
              Get Started
            </Link>
            <Link
              href="/courses"
              className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:border-brand-600 hover:text-brand-600"
            >
              Explore Courses
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="border-y bg-gray-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {[
            { label: "Students", value: stats?.students },
            { label: "Courses", value: stats?.courses },
            { label: "Instructors", value: stats?.instructors },
            { label: "Enrollments", value: stats?.enrollments },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-brand-600">
                {s.value === undefined || s.value === null
                  ? loading
                    ? "…"
                    : "—"
                  : s.value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED COURSES ─────────────────────────────────── */}
      <section id="courses" className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Explore Courses</h2>
            <p className="mt-2 text-gray-600">
              Real courses from the platform catalog — no placeholders.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Sign in to enroll →
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-center text-gray-500">Loading courses…</p>
        ) : courses.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed p-10 text-center text-gray-500">
            No courses are published yet. Check back soon.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div
                key={c._id}
                className="flex flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 text-2xl font-bold text-brand-600">
                  {c.title.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm text-gray-600">
                  {c.description}
                </p>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-lg font-bold text-brand-600">
                    {c.price > 0 ? `NGN ${c.price.toLocaleString()}` : "Free"}
                  </span>
                  <Link
                    href="/login"
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
                  >
                    Enroll
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FOUNDER ──────────────────────────────────────────── */}
      <section id="about" className="bg-gray-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[auto,1fr] md:items-center">
          <div className="flex justify-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-brand-600 text-5xl font-bold text-white shadow-lg">
              VO
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Meet the Founder
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {home?.founder.name ?? "Valentine Otieno Ogutu"}
            </h2>
            <p className="mt-1 text-gray-600">
              {home?.founder.role ?? "Software Engineer · Founder, Learn"}
            </p>
            <p className="mt-6 max-w-2xl text-gray-700">
              Learn was built on a simple belief: quality education should be
              accessible, honest, and engineered to last. Every course, every
              dashboard, and every integration on this platform was designed
              and built by Valentine — a full-stack engineer who cares as much
              about clean code as he does about a clean user experience.
            </p>
            <p className="mt-4 max-w-2xl text-gray-700">
              The stack:{" "}
              <span className="font-medium">Python + FastAPI</span> for the
              backend,{" "}
              <span className="font-medium">Next.js + TypeScript</span> for the
              frontend,{" "}
              <span className="font-medium">MongoDB</span> for data, and
              production integrations with{" "}
              <span className="font-medium">Paystack</span>,{" "}
              <span className="font-medium">Cloudinary</span>, and{" "}
              <span className="font-medium">Resend</span>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={home?.founder.githubUrl ?? "https://github.com/ogutuvalentine6-a11y"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-white hover:bg-black"
              >
                View on GitHub
              </a>
              <Link
                href="/register"
                className="rounded-lg border border-brand-600 px-5 py-2.5 text-brand-600 hover:bg-brand-50"
              >
                Start Learning
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Everything you need to learn
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
          A platform built for students, instructors, and administrators —
          each with their own dedicated workspace.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Structured Courses",
              body: "Ordered sessions, learning materials, and clear progress through every course.",
            },
            {
              title: "Quizzes & Assessments",
              body: "Timed quizzes with server-enforced limits, grading, and pass marks.",
            },
            {
              title: "Submission Review",
              body: "Upload files, get reviewed by staff, and receive feedback on every submission.",
            },
            {
              title: "Progress Tracking",
              body: "Session-by-session status: locked, in progress, passed, or awaiting review.",
            },
            {
              title: "Secure Payments",
              body: "Paystack integration with webhook verification and idempotent transaction handling.",
            },
            {
              title: "Role-Based Access",
              body: "Students, staff, and admins each see only what they should — enforced on the backend.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {[
              {
                q: "How do I create an account?",
                a: "Click Get Started at the top of the page. Fill in the registration form — ID number, full name, email, phone, and a few details about your school and course. Then log in.",
              },
              {
                q: "How do I enroll in a course?",
                a: "Browse the courses on this page. Sign in, open a course, and click Enroll. Complete payment via Paystack if the course has a price, and you'll have immediate access to every session.",
              },
              {
                q: "Are the courses free?",
                a: "Some are. Each course shows its price on the listing. Courses marked Free require no payment to enroll.",
              },
              {
                q: "Can instructors create their own courses?",
                a: "Instructors (staff role) can manage sessions and quizzes for the courses they've been assigned to by an administrator. Course creation is restricted to administrators.",
              },
              {
                q: "Is my data secure?",
                a: "Yes. Passwords are hashed with bcrypt (12 rounds), sessions use HTTP-only cookies with SameSite protection, and every protected endpoint enforces role-based authorization on the backend.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="rounded-lg border bg-white p-5 shadow-sm"
              >
                <summary className="cursor-pointer font-medium text-gray-900">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section id="contact" className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Get in touch</h2>
        <p className="mt-3 text-gray-600">
          Questions, ideas, or feedback? The fastest way to reach the founder is
          on GitHub.
        </p>
        <a
          href="https://github.com/ogutuvalentine6-a11y"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-black"
        >
          github.com/ogutuvalentine6-a11y
        </a>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="text-3xl font-bold">{home?.cta.title ?? "Ready to start learning?"}</h2>
          <p className="mt-3 text-brand-100">
            {home?.cta.subtitle ?? "Join a platform built for real progress — not just pretty pages."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              I already have one
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
