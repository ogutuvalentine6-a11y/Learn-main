import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function InstructorDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [instructor, setInstructor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/instructors/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setInstructor)
      .catch(() => setError("Instructor not found"));
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {error ? (
          <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>
        ) : !instructor ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="mb-8 flex items-start gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white">
                {instructor.fullName.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{instructor.fullName}</h1>
                <p className="mt-1 text-gray-600">{instructor.fieldOfStudy}</p>
                <p className="text-sm text-gray-500">
                  {instructor.school} · {instructor.location}
                </p>
              </div>
            </div>

            <h2 className="mb-3 text-xl font-semibold">Courses</h2>
            {instructor.courses.length === 0 ? (
              <p className="rounded border border-dashed p-6 text-center text-gray-500">
                No published courses yet.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {instructor.courses.map((c: any) => (
                  <div key={c.id} className="rounded border bg-white p-4">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{c.description}</p>
                    <p className="mt-2 text-sm font-bold text-brand-600">
                      {c.price > 0 ? `NGN ${c.price.toLocaleString()}` : "Free"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <Link href="/instructors" className="text-sm text-brand-600 underline">
                ← Back to all instructors
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
