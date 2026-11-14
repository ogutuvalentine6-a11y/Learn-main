import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function StudentAnalytics() {
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
    fetch("/api/analytics/student")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <Layout role="student" name={me.fullName}><p className="text-gray-500">Loading…</p></Layout>;
  if (!data) return <Layout role="student" name={me.fullName}><p className="text-red-600">Could not load analytics.</p></Layout>;

  return (
    <Layout role="student" name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">My Progress</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Enrolled</p>
          <p className="mt-2 text-3xl font-bold">{data.summary.enrollmentsTotal}</p>
          <p className="mt-1 text-xs text-gray-500">{data.summary.enrollmentsPaid} paid</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold">{data.summary.coursesCompleted}</p>
          <p className="mt-1 text-xs text-gray-500">100% progress</p>
        </div>
        <div className="rounded bg-white p-5 shadow">
          <p className="text-xs uppercase text-gray-500">Payments</p>
          <p className="mt-2 text-3xl font-bold">{data.payments.length}</p>
          <p className="mt-1 text-xs text-gray-500">transaction records</p>
        </div>
      </div>

      <div className="mt-8 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Course Progress</h2>
        {data.enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No enrollments yet.</p>
        ) : (
          <div className="space-y-4">
            {data.enrollments.map((e: any) => (
              <div key={e.courseId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{e.courseTitle}</span>
                  <span className="text-gray-500">
                    {e.progressPassed}/{e.sessionsTotal} sessions · {e.percent}%
                    {e.averageScore !== null && ` · avg score ${e.averageScore}`}
                  </span>
                </div>
                <div className="h-2 rounded bg-gray-200">
                  <div className="h-2 rounded bg-brand-600" style={{ width: `${Math.min(e.percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.payments.length > 0 && (
        <div className="mt-8 rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Payment History</h2>
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
              {data.payments.map((p: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-2 font-mono text-xs">{p.reference}</td>
                  <td>NGN {p.amount.toLocaleString()}</td>
                  <td>{p.status}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
