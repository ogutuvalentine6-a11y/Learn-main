import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function StaffAnalytics() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login");
      else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/analytics/staff")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <Layout role="staff" name={me.fullName}><p className="text-gray-500">Loading…</p></Layout>;
  if (!data) return <Layout role="staff" name={me.fullName}><p className="text-red-600">Could not load analytics.</p></Layout>;

  return (
    <Layout role="staff" name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">My Teaching Analytics</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Courses Assigned</p>
          <p className="mt-2 text-3xl font-bold">{data.summary.coursesAssigned}</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Paid Students</p>
          <p className="mt-2 text-3xl font-bold">{data.summary.totalPaidStudents}</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Pending Reviews</p>
          <p className="mt-2 text-3xl font-bold">{data.summary.pendingReviews}</p>
        </div>
      </div>

      <div className="mt-8 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Per-Course Breakdown</h2>
        {data.courses.length === 0 ? (
          <p className="text-sm text-gray-500">No courses assigned yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Course</th>
                <th>Paid Students</th>
                <th>Awaiting Review</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Sessions</th>
                <th>Live</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c: any) => (
                <tr key={c.courseId} className="border-b">
                  <td className="py-2 font-medium">{c.title}</td>
                  <td>{c.paidStudents}</td>
                  <td>{c.awaitingReview}</td>
                  <td className="text-green-700">{c.passed}</td>
                  <td className="text-red-700">{c.failed}</td>
                  <td>{c.sessions}</td>
                  <td>{c.liveSessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
