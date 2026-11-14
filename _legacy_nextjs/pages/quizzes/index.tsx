import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function QuizzesPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      fetch("/api/quizzes").then((r) => r.ok ? r.json() : []),
      me.role === "student"
        ? fetch("/api/quizzes/my-attempts").then((r) => r.ok ? r.json() : [])
        : Promise.resolve([]),
    ]).then(([q, h]) => {
      setItems(Array.isArray(q) ? q : []);
      setHistory(Array.isArray(h) ? h : []);
    }).finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Available Quizzes</h1>

      <div className="rounded bg-white p-5 shadow">
        {loading ? <p className="text-sm text-gray-500">Loading…</p> :
         items.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
            No published quizzes yet.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((q) => (
              <Link key={q._id} href={`/quizzes/${q._id}`} className="block py-3 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{q.title}</h3>
                    <p className="text-xs text-gray-500">
                      {q.questions.length} question{q.questions.length === 1 ? "" : "s"} · pass {q.passMark}%
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {q.maxAttempts} attempt{q.maxAttempts > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {me.role === "student" && history.length > 0 && (
        <div className="mt-6 rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">My Attempts</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Quiz</th>
                <th>#</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.attemptId} className="border-b">
                  <td className="py-2">{h.quizTitle}</td>
                  <td>{h.attemptNumber}</td>
                  <td>
                    {h.status === "graded"
                      ? `${h.autoScore + (h.manualScore || 0)}/${h.maxScore} (${h.percent}%)`
                      : "—"}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      h.status === "graded"
                        ? h.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {h.submittedAt ? new Date(h.submittedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
