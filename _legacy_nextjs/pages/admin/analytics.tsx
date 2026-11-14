import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

export default function AdminAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [recent, setRecent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/overview").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/courses").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/analytics/recent").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([o, c, rec]) => {
        setOverview(o);
        setCourses(Array.isArray(c) ? c : []);
        setRecent(rec);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout role="admin"><p className="text-gray-500">Loading…</p></Layout>;
  if (!overview) return <Layout role="admin"><p className="text-red-600">Failed to load analytics.</p></Layout>;

  const cards = [
    { label: "Total Users", value: overview.users.total, sub: `${overview.users.students} students · ${overview.users.staff} staff · ${overview.users.admins} admins` },
    { label: "New This Week", value: overview.users.newThisWeek, sub: `${overview.users.blocked} blocked total` },
    { label: "Active Courses", value: overview.courses.active, sub: `${overview.courses.inactive} inactive` },
    { label: "Paid Enrollments", value: overview.enrollments.paid, sub: `${overview.enrollments.pending} pending of ${overview.enrollments.total} total` },
    { label: "Revenue (all time)", value: `NGN ${overview.revenue.total.toLocaleString()}`, sub: `${overview.revenue.count} successful payments` },
    { label: "Revenue (this month)", value: `NGN ${overview.revenue.monthTotal.toLocaleString()}`, sub: `${overview.revenue.monthCount} payments` },
    { label: "Completion Rate", value: `${overview.progress.completionRate}%`, sub: `${overview.progress.passed}/${overview.progress.total} progress records passed` },
    { label: "Live Sessions", value: overview.live.total, sub: `${overview.live.upcoming} upcoming` },
    { label: "Reels (approved)", value: overview.reels.total, sub: `${overview.reels.views.toLocaleString()} views · ${overview.reels.likes.toLocaleString()} likes` },
    { label: "Community", value: overview.community.threads + overview.community.studyGroups, sub: `${overview.community.threads} threads · ${overview.community.studyGroups} groups` },
    { label: "Pending Moderation", value: overview.moderation.pendingResources + overview.moderation.pendingReels, sub: `${overview.moderation.pendingResources} resources · ${overview.moderation.pendingReels} reels` },
  ];

  return (
    <Layout role="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <div className="flex gap-2">
          <a href="/api/analytics/export/users" className="rounded border px-3 py-1.5 text-sm">Export Users CSV</a>
          <a href="/api/analytics/export/payments" className="rounded border px-3 py-1.5 text-sm">Export Payments</a>
          <a href="/api/analytics/export/enrollments" className="rounded border px-3 py-1.5 text-sm">Export Enrollments</a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded bg-white p-5 shadow">
            <p className="text-xs uppercase tracking-wider text-gray-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Per-Course Breakdown</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">No courses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="py-2">Course</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Paid Enr.</th>
                  <th>Revenue</th>
                  <th>Sessions</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 font-medium">{c.title}</td>
                    <td>{c.isActive ? "active" : "inactive"}</td>
                    <td>NGN {c.price.toLocaleString()}</td>
                    <td>{c.enrollmentsPaid}/{c.enrollmentsTotal}</td>
                    <td>NGN {c.revenue.toLocaleString()}</td>
                    <td>{c.sessions}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded bg-gray-200">
                          <div className="h-2 rounded bg-brand-600" style={{ width: `${Math.min(c.completionRate, 100)}%` }} />
                        </div>
                        <span className="text-xs">{c.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recent && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded bg-white p-5 shadow">
            <h2 className="mb-3 font-semibold">Recent Signups</h2>
            {recent.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">None.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {recent.recentUsers.map((u: any) => (
                  <li key={u.id} className="flex justify-between border-b py-1">
                    <span>{u.fullName} <span className="text-xs text-gray-500">({u.role})</span></span>
                    <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded bg-white p-5 shadow">
            <h2 className="mb-3 font-semibold">Recent Payments</h2>
            {recent.recentPayments.length === 0 ? (
              <p className="text-sm text-gray-500">None.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {recent.recentPayments.map((p: any) => (
                  <li key={p.id} className="flex justify-between border-b py-1">
                    <span>NGN {p.amount.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{p.reference}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
