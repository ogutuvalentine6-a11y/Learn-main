import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function GuardianDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) return router.push("/login");
      if (u.role !== "guardian") return router.push(`/${u.role}/dashboard`);
      setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/guardian/students")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  return (
    <Layout role="guardian" name={me.fullName}>
      <h1 className="mb-2 text-2xl font-bold">Welcome, {me.fullName}</h1>
      <p className="mb-6 text-sm text-gray-500">
        View-only access to your linked students' academic progress.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : students.length === 0 ? (
        <div className="rounded border border-dashed p-10 text-center">
          <p className="text-gray-600">You don't have any linked students yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Contact the platform admin to link your account to a student.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Link
              key={s.linkId}
              href={`/guardian/students/${s.studentId}`}
              className="block rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {s.fullName.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{s.fullName}</h3>
                  <p className="text-xs text-gray-500">{s.email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {s.school} · {s.enrolledCourses} course{s.enrolledCourses === 1 ? "" : "s"}
                  </p>
                  <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs capitalize">
                    {s.relationship}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
