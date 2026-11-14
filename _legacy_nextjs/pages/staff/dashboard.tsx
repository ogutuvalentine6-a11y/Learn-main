import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function StaffDashboard() {
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/staff").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, d]) => { setMe(u); setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout role="staff"><p className="text-gray-500">Loading…</p></Layout>;
  if (!me || !data) return <Layout role="staff"><p className="text-red-600">Failed to load dashboard.</p></Layout>;

  const s = data.summary;

  return (
    <Layout role="staff" name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {me.fullName}</h1>
          <p className="text-sm text-gray-500">
            {me.email} · {me.school || "—"}
          </p>
        </div>
        <Link href="/live/schedule" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          + Schedule live class
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Courses" value={s.coursesAssigned} sub="assigned" />
        <StatCard label="Students" value={s.totalPaidStudents} sub="paid enrollments" />
        <StatCard label="Pending" value={s.pendingReviews} sub="reviews needed" />
        <StatCard label="Upcoming Live" value={s.upcomingLive} sub="scheduled" />
      </div>

      <Section title="My Courses" action={{ label: "Manage all", href: "/staff/course-manage" }}>
        {data.courses.length === 0 ? (
          <EmptyState msg="No courses assigned yet. Contact an admin to be assigned." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((c: any) => (
              <div key={c.courseId} className="rounded border p-4">
                <h3 className="font-semibold">{c.title}</h3>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <span>{c.paidStudents} students</span>
                  <span>{c.sessions} sessions</span>
                  <span>{c.passed} passed</span>
                  <span>{c.failed} failed</span>
                </div>
                {c.awaitingReview > 0 && (
                  <p className="mt-2 text-xs font-medium text-purple-700">
                    {c.awaitingReview} submission{c.awaitingReview > 1 ? "s" : ""} awaiting review
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/staff/course-manage?courseId=${c.courseId}`}
                    className="flex-1 rounded bg-brand-600 py-1.5 text-center text-xs text-white hover:bg-brand-700"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/staff/student-progress?courseId=${c.courseId}`}
                    className="flex-1 rounded border py-1.5 text-center text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Progress
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Pending Submissions" action={{ label: "Review", href: "/staff/review-submission" }}>
          {data.pendingSubmissions.length === 0 ? (
            <EmptyState msg="No submissions awaiting review." />
          ) : (
            <ul className="space-y-2">
              {data.pendingSubmissions.map((p: any) => (
                <li key={p.progressId} className="rounded border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{p.studentName}</span>
                    <span className="text-xs text-gray-500">{p.courseTitle}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.sessionTitle}
                    {p.submittedAt && ` · ${new Date(p.submittedAt).toLocaleDateString()}`}
                  </p>
                  {p.uploadUrl && (
                    <a href={p.uploadUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand-600 underline">
                      View submission →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Upcoming Live Classes" action={{ label: "All live", href: "/live" }}>
          {data.upcomingLive.length === 0 ? (
            <EmptyState msg="No scheduled classes. Schedule one above." />
          ) : (
            <ul className="space-y-2">
              {data.upcomingLive.map((l: any) => (
                <li key={l.id} className="rounded border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{l.title}</span>
                    <Link href={`/live/sessions/${l.id}/manage`} className="text-xs text-brand-600 underline">
                      Manage →
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(l.scheduledAt).toLocaleString()} · {l.durationMinutes}min
                    {l.courseTitle && ` · ${l.courseTitle}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link href="/staff/course-manage" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Add session
          </Link>
          <Link href="/staff/quiz-builder" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Build quiz
          </Link>
          <Link href="/resources" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Upload resource
          </Link>
          <Link href="/discussions/new" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Post announcement
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, sub }: any) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function Section({ title, action, children }: any) {
  return (
    <div className="mt-6 rounded bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action && (
          <Link href={action.href} className="text-sm text-brand-600 underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ msg }: any) {
  return (
    <div className="rounded border border-dashed p-6 text-center">
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}
