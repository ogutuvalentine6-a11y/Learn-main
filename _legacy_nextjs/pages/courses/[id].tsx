import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CourseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/modules/course/${id}/curriculum`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Course not found"));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navbar />
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6">
          <div className="w-full rounded bg-red-50 p-6 text-red-700">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <p className="text-gray-500">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  const { course, modules, standaloneSessions } = data;
  const totalSessions = modules.reduce((n: number, m: any) => n + m.sessions.length, 0) + standaloneSessions.length;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="mt-2 text-gray-600">{course.description}</p>
          <p className="mt-2 text-sm text-gray-500">
            {modules.length} module{modules.length === 1 ? "" : "s"} · {totalSessions} lesson{totalSessions === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr,320px]">
          <div>
            <h2 className="mb-3 text-xl font-semibold">Curriculum</h2>

            {modules.length === 0 && standaloneSessions.length === 0 ? (
              <p className="rounded border border-dashed p-6 text-center text-gray-500">
                This course doesn't have any published sessions yet.
              </p>
            ) : (
              <div className="space-y-4">
                {modules.map((m: any) => (
                  <div key={m.id} className="rounded-lg border bg-white shadow-sm">
                    <div className="border-b p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase text-brand-600">
                            Module {m.orderIndex}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold">{m.title}</h3>
                          {m.description && (
                            <p className="mt-1 text-sm text-gray-600">{m.description}</p>
                          )}
                        </div>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                          {m.sessions.length} lesson{m.sessions.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <ul className="divide-y">
                      {m.sessions.map((s: any) => (
                        <li key={s.id} className="flex items-center justify-between p-3 text-sm">
                          <span>
                            <span className="text-gray-500">#{s.orderIndex}</span> {s.title}
                            {s.hasQuiz && <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">quiz</span>}
                          </span>
                          <span className="text-xs text-gray-500">
                            {s.materialsCount} file{s.materialsCount === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                      {m.sessions.length === 0 && (
                        <li className="p-3 text-sm text-gray-500 italic">
                          No lessons in this module yet.
                        </li>
                      )}
                    </ul>
                  </div>
                ))}

                {standaloneSessions.length > 0 && (
                  <div className="rounded-lg border bg-white shadow-sm">
                    <div className="border-b p-4">
                      <h3 className="text-lg font-semibold">Additional Lessons</h3>
                      <p className="text-xs text-gray-500">Not grouped into modules</p>
                    </div>
                    <ul className="divide-y">
                      {standaloneSessions.map((s: any) => (
                        <li key={s.id} className="flex items-center justify-between p-3 text-sm">
                          <span>
                            <span className="text-gray-500">#{s.orderIndex}</span> {s.title}
                            {s.hasQuiz && <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">quiz</span>}
                          </span>
                          <span className="text-xs text-gray-500">
                            {s.materialsCount} file{s.materialsCount === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside>
            <div className="sticky top-20 rounded-lg border bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-brand-600">
                {course.price > 0 ? `NGN ${course.price.toLocaleString()}` : "Free"}
              </p>
              <Link
                href="/login"
                className="mt-4 block rounded bg-brand-600 py-2.5 text-center text-white hover:bg-brand-700"
              >
                Enroll now
              </Link>
              <Link
                href="/courses"
                className="mt-2 block rounded border py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Back to all courses
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
