import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function StudentDashboard() {
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/student").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, d]) => { setMe(u); setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout role="student"><p className="text-gray-500">Loading…</p></Layout>;
  if (!me || !data) return <Layout role="student"><p className="text-red-600">Failed to load dashboard.</p></Layout>;

  const s = data.summary;

  return (
    <Layout role="student" name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {me.fullName}</h1>
          <p className="text-sm text-gray-500">
            {me.idNumber} · {me.email} · {me.school || "—"}
          </p>
        </div>
        <Link href="/courses" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          + Browse courses
        </Link>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Enrolled" value={s.enrollmentsTotal} sub={`${s.enrollmentsPaid} paid`} />
        <StatCard label="Completed" value={s.coursesCompleted} sub="100% progress" />
        <StatCard label="Average Score" value={s.averageScore ?? "—"} sub="across all quizzes" />
        <StatCard label="Payments" value={data.payments.length} sub="transactions" />
      </div>

      {/* ── Continue Learning ── */}
      <Section title="Continue Learning" action={{ label: "View all", href: "/student/analytics" }}>
        {data.enrollments.length === 0 ? (
          <EmptyState msg="No enrollments yet." action={{ label: "Browse courses", href: "/courses" }} />
        ) : (
          <div className="space-y-3">
            {data.enrollments.map((e: any) => (
              <div key={e.courseId} className="rounded border p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{e.courseTitle}</h3>
                    <p className="text-xs text-gray-500">
                      {e.progressPassed}/{e.sessionsTotal} sessions
                      {e.averageScore !== null && ` · avg ${e.averageScore}`}
                    </p>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 ${e.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {e.paymentStatus}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded bg-gray-200">
                    <div className="h-2 rounded bg-brand-600" style={{ width: `${Math.min(e.percent, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium">{e.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Two-column: Upcoming Live + Pending Work ── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Upcoming Live Classes" action={{ label: "All events", href: "/live" }}>
          {data.upcomingLive.length === 0 ? (
            <EmptyState msg="No scheduled classes." />
          ) : (
            <ul className="space-y-2">
              {data.upcomingLive.map((l: any) => (
                <li key={l.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{l.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(l.scheduledAt).toLocaleString()} · {l.durationMinutes}min
                    {l.courseTitle && ` · ${l.courseTitle}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pending Work" action={{ label: "Progress", href: "/student/analytics" }}>
          {data.pendingWork.length === 0 ? (
            <EmptyState msg="Nothing waiting on you." />
          ) : (
            <ul className="space-y-2">
              {data.pendingWork.map((p: any) => (
                <li key={p.progressId} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.sessionTitle}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${p.status === "awaiting_review" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{p.courseTitle}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* ── Recent Scores ── */}
      <Section title="Recent Quiz Results">
        {data.recentScores.length === 0 ? (
          <EmptyState msg="No quiz results yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Session</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.recentScores.map((r: any) => (
                <tr key={r.progressId} className="border-b">
                  <td className="py-2">{r.sessionTitle}</td>
                  <td className="font-medium">{r.score}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.status === "passed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Payment History ── */}
      <Section title="Payment History">
        {data.payments.length === 0 ? (
          <EmptyState msg="No payments yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p: any) => (
                <tr key={p.reference} className="border-b">
                  <td className="py-2 font-mono text-xs">{p.reference}</td>
                  <td>NGN {p.amount.toLocaleString()}</td>
                  <td>{p.status}</td>
                  <td className="text-xs text-gray-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
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

function EmptyState({ msg, action }: any) {
  return (
    <div className="rounded border border-dashed p-6 text-center">
      <p className="text-sm text-gray-500">{msg}</p>
      {action && (
        <Link href={action.href} className="mt-2 inline-block text-sm text-brand-600 underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
