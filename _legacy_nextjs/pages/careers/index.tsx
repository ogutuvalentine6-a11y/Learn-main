import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  description: string;
  salary: string;
  deadline: string | null;
  featured: boolean;
}

const JOB_TYPES = [
  { value: "", label: "All types" },
  { value: "internship", label: "Internship" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "volunteer", label: "Volunteer" },
];

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (jobType) params.set("jobType", jobType);
    const data = await fetch(`/api/jobs/public?${params}`).then((r) => (r.ok ? r.json() : []));
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [jobType]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Careers & Internships</h1>
        <p className="mt-2 text-gray-600">
          Opportunities curated by the Learn team for students and graduates.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-1 gap-2">
            <input
              placeholder="Search by title, company, or keyword…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
              Search
            </button>
          </form>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="mt-8 rounded border border-dashed p-10 text-center">
            <p className="text-gray-600">No open opportunities right now.</p>
            <p className="mt-2 text-sm text-gray-500">Check back soon — new postings are added regularly.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {jobs.map((j) => {
              const expired = j.deadline && new Date(j.deadline) < new Date();
              return (
                <Link
                  key={j._id}
                  href={`/careers/${j._id}`}
                  className={`block rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition ${
                    j.featured ? "ring-2 ring-brand-200" : ""
                  }`}
                >
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        {j.featured && (
                          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            ★ Featured
                          </span>
                        )}
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700 capitalize">
                          {j.jobType.replace("-", " ")}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold text-gray-900">{j.title}</h2>
                      <p className="text-sm text-gray-600">{j.company}{j.location && ` · ${j.location}`}</p>
                      {j.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{j.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-gray-500">
                      {j.salary && <p className="font-medium text-gray-700">{j.salary}</p>}
                      {j.deadline && (
                        <p className={expired ? "text-red-600" : ""}>
                          Deadline: {new Date(j.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
