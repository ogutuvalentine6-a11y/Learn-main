import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Instructor {
  id: string;
  fullName: string;
  fieldOfStudy: string;
  school: string;
  location: string;
  coursesCount: number;
}

export default function InstructorsPage() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instructors")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Our Instructors</h1>
        <p className="mt-2 text-gray-600">
          Meet the staff teaching on Learn.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">
            No instructors have been onboarded yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <div key={i.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                  {i.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <h2 className="text-lg font-semibold">{i.fullName}</h2>
                <p className="mt-1 text-sm text-gray-600">{i.fieldOfStudy}</p>
                <p className="text-xs text-gray-500">{i.school} · {i.location}</p>
                <p className="mt-2 text-sm">
                  {i.coursesCount} course{i.coursesCount === 1 ? "" : "s"}
                </p>
                <Link
                  href={`/instructors/${i.id}`}
                  className="mt-3 block rounded border border-brand-600 py-1.5 text-center text-sm text-brand-600 hover:bg-brand-50"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
