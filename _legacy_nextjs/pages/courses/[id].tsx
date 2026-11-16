import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";
import { BookIcon, FileIcon, ShieldIcon } from "@/components/layout/icons";

interface CurriculumSession {
  id: string;
  title: string;
  orderIndex: number;
  hasQuiz: boolean;
  materialsCount: number;
}

interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  sessions: CurriculumSession[];
}

interface CurriculumResponse {
  course: {
    _id?: string;
    id?: string;
    title: string;
    description: string;
    price: number;
  };
  modules: CurriculumModule[];
  standaloneSessions: CurriculumSession[];
}

interface RelatedCourse {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  price: number;
}

function courseKey(c: { _id?: string; id?: string }): string {
  return c._id || c.id || "";
}

export default function CourseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<CurriculumResponse | null>(null);
  const [related, setRelated] = useState<RelatedCourse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    fetch(`/api/modules/course/${id}/curriculum`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Course not found or not published"));

    fetch(`/api/course-list`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: RelatedCourse[]) => {
        const filtered = (Array.isArray(list) ? list : [])
          .filter((c) => {
            const key = courseKey(c);
            return key && key !== id;
          })
          .slice(0, 3);
        setRelated(filtered);
      })
      .catch(() => {});
  }, [id]);

  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-bg flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="bg-surface rounded-xl border border-border p-8">
              <BookIcon size={48} />
              <h1 className="mt-4 text-xl font-bold text-fg">{error}</h1>
              <p className="mt-2 text-sm text-fg-muted">
                The course may have been unpublished or the link is incorrect.
              </p>
              <Link
                href="/courses"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700"
              >
                Browse all courses
              </Link>
            </div>
          </div>
        </main>
        <FooterMega />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-surface-2 rounded w-2/3" />
              <div className="h-4 bg-surface-2 rounded w-full" />
              <div className="h-4 bg-surface-2 rounded w-5/6" />
            </div>
          </div>
        </main>
        <FooterMega />
      </>
    );
  }

  const { course, modules, standaloneSessions } = data;
  const allSessions = [
    ...modules.flatMap((m) => m.sessions),
    ...standaloneSessions,
  ];
  const totalSessions = allSessions.length;
  const quizCount = allSessions.filter((s) => s.hasQuiz).length;
  const materialsCount = allSessions.reduce((n, s) => n + s.materialsCount, 0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        {/* Hero */}
        <section className="bg-white border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <Link
              href="/courses"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              ← All courses
            </Link>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-fg">
              {course.title}
            </h1>
            <p className="mt-3 text-lg text-fg-muted max-w-2xl">
              {course.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                {modules.length} module{modules.length === 1 ? "" : "s"}
              </span>
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                {totalSessions} lesson{totalSessions === 1 ? "" : "s"}
              </span>
              {quizCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                  {quizCount} quiz{quizCount === 1 ? "" : "zes"}
                </span>
              )}
              {materialsCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                  {materialsCount} resource{materialsCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="py-10 md:py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Curriculum */}
              <div>
                <h2 className="text-xl font-bold text-fg mb-4">Course curriculum</h2>

                {modules.length === 0 && standaloneSessions.length === 0 ? (
                  <div className="bg-surface rounded-xl border border-border p-8 text-center">
                    <BookIcon size={40} />
                    <p className="mt-3 text-fg-muted">
                      This course doesn&apos;t have any published lessons yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modules.map((m, idx) => (
                      <details
                        key={m.id}
                        className="group bg-surface rounded-lg border border-border"
                        open={idx === 0}
                      >
                        <summary className="cursor-pointer list-none p-4 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs uppercase text-brand-600 font-semibold tracking-wide">
                              Module {m.orderIndex}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-fg">
                              {m.title}
                            </h3>
                            {m.description && (
                              <p className="mt-1 text-sm text-fg-muted">
                                {m.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs text-fg-muted">
                              {m.sessions.length} lesson{m.sessions.length === 1 ? "" : "s"}
                            </span>
                            <span className="text-brand-600 transition-transform group-open:rotate-180 text-lg">▾</span>
                          </div>
                        </summary>
                        <ul className="border-t border-border divide-y divide-border">
                          {m.sessions.length === 0 ? (
                            <li className="p-4 text-sm text-fg-muted italic">
                              No lessons in this module yet.
                            </li>
                          ) : (
                            m.sessions.map((s) => (
                              <li
                                key={s.id}
                                className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-fg-muted flex-shrink-0">
                                    #{s.orderIndex}
                                  </span>
                                  <span className="text-fg truncate">{s.title}</span>
                                  {s.hasQuiz && (
                                    <span className="flex-shrink-0 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                                      Quiz
                                    </span>
                                  )}
                                </div>
                                {s.materialsCount > 0 && (
                                  <span className="flex-shrink-0 text-xs text-fg-muted flex items-center gap-1">
                                    <FileIcon size={12} />
                                    {s.materialsCount}
                                  </span>
                                )}
                              </li>
                            ))
                          )}
                        </ul>
                      </details>
                    ))}

                    {standaloneSessions.length > 0 && (
                      <details className="group bg-surface rounded-lg border border-border">
                        <summary className="cursor-pointer list-none p-4 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-fg">
                              Additional lessons
                            </h3>
                            <p className="text-xs text-fg-muted mt-0.5">
                              Not grouped into modules
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs text-fg-muted">
                              {standaloneSessions.length} lesson
                              {standaloneSessions.length === 1 ? "" : "s"}
                            </span>
                            <span className="text-brand-600 transition-transform group-open:rotate-180 text-lg">▾</span>
                          </div>
                        </summary>
                        <ul className="border-t border-border divide-y divide-border">
                          {standaloneSessions.map((s) => (
                            <li
                              key={s.id}
                              className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-fg-muted flex-shrink-0">
                                  #{s.orderIndex}
                                </span>
                                <span className="text-fg truncate">{s.title}</span>
                                {s.hasQuiz && (
                                  <span className="flex-shrink-0 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                                    Quiz
                                  </span>
                                )}
                              </div>
                              {s.materialsCount > 0 && (
                                <span className="flex-shrink-0 text-xs text-fg-muted flex items-center gap-1">
                                  <FileIcon size={12} />
                                  {s.materialsCount}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {/* Related courses */}
                {related.length > 0 && (
                  <div className="mt-12">
                    <h2 className="text-xl font-bold text-fg mb-4">
                      Explore other courses
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {related.map((c) => {
                        const key = courseKey(c);
                        if (!key) return null;
                        return (
                          <Link
                            key={key}
                            href={`/courses/${key}`}
                            className="group bg-surface rounded-lg border border-border p-5 hover:border-brand-600 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                          >
                            <h3 className="font-semibold text-fg line-clamp-2 group-hover:text-brand-600 transition-colors">
                              {c.title}
                            </h3>
                            <p className="mt-2 text-sm text-fg-muted line-clamp-2">
                              {c.description}
                            </p>
                            <p className="mt-3 font-bold text-brand-600">
                              {c.price > 0
                                ? `NGN ${c.price.toLocaleString()}`
                                : "Free"}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar — enrolment */}
              <aside>
                <div className="sticky top-20 bg-surface rounded-lg border border-border p-6 shadow-sm">
                  <p className="text-xs uppercase font-semibold text-fg-muted tracking-wide">
                    {course.price > 0 ? "Course price" : "Enrolment"}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-brand-600">
                    {course.price > 0
                      ? `NGN ${course.price.toLocaleString()}`
                      : "Free"}
                  </p>

                  {course.price > 0 ? (
                    <Link
                      href={`/login?next=${encodeURIComponent(`/courses/${id}`)}`}
                      className="mt-5 block w-full text-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
                    >
                      Enrol now
                    </Link>
                  ) : (
                    <Link
                      href={`/register?next=${encodeURIComponent(`/courses/${id}`)}`}
                      className="mt-5 block w-full text-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
                    >
                      Enrol free
                    </Link>
                  )}

                  <Link
                    href="/courses"
                    className="mt-3 block w-full text-center px-6 py-2.5 rounded-md border border-border text-fg text-sm font-medium hover:bg-surface-2 transition-colors"
                  >
                    Back to all courses
                  </Link>

                  <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm text-fg-muted">
                    <div className="flex items-center gap-2">
                      <BookIcon size={16} />
                      <span>{totalSessions} lessons</span>
                    </div>
                    {quizCount > 0 && (
                      <div className="flex items-center gap-2">
                        <ShieldIcon size={16} />
                        <span>{quizCount} graded quizzes</span>
                      </div>
                    )}
                    {materialsCount > 0 && (
                      <div className="flex items-center gap-2">
                        <FileIcon size={16} />
                        <span>{materialsCount} downloadable materials</span>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <FooterMega />
    </>
  );
}
