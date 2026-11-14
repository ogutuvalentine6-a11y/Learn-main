import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function StaffQuizzes() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/quizzes");
      setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/quizzes").then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <Link href="/staff/quizzes/new" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          + Create quiz
        </Link>
      </div>

      <div className="rounded bg-white p-5 shadow">
        {loading ? <p className="text-sm text-gray-500">Loading…</p> :
         items.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
            No quizzes yet. Create your first one above.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((q) => (
              <Link key={q._id} href={`/staff/quizzes/${q._id}`} className="block py-3 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{q.title}</h3>
                    <p className="text-xs text-gray-500">
                      {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                      {q.published ? " · published" : " · draft"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    pass {q.passMark}% · {q.maxAttempts} attempt{q.maxAttempts > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
