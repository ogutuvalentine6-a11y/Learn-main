import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  enrollments: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    const data = await fetch(`/api/courses/search?${params}`).then((r) => (r.ok ? r.json() : { items: [], total: 0 }));
    setCourses(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [sort]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Explore Courses</h1>
        <p className="mt-2 text-gray-600">
          {total} course{total === 1 ? "" : "s"} from our instructor community.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <form
            onSubmit={(e) => { e.preventDefault(); load(); }}
            className="flex flex-1 gap-2"
          >
            <input
              placeholder="Search courses…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
              Search
            </button>
          </form>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most popular</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading courses…</p>
        ) : courses.length === 0 ? (
          <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">
            No courses matched your search.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 text-2xl font-bold text-brand-600">
                  {c.title.charAt(0)}
                </div>
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <p className="mt-1 flex-1 text-sm text-gray-600">{c.description}</p>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="font-bold text-brand-600">
                    {c.price > 0 ? `NGN ${c.price.toLocaleString()}` : "Free"}
                  </span>
                  <span className="text-xs text-gray-500">{c.enrollments} enrolled</span>
                </div>
                <Link
                  href={`/courses/${c.id}`}
                  className="mt-3 rounded bg-brand-600 py-2 text-center text-sm text-white hover:bg-brand-700"
                >
                  View course
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
