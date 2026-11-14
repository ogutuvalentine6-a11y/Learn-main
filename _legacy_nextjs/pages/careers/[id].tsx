import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/public/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setJob)
      .catch(() => setError("This position is no longer available."));
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {error ? (
          <div className="rounded bg-red-50 p-6 text-red-700">
            {error}
            <div className="mt-3">
              <Link href="/careers" className="text-sm underline">
                ← Back to all opportunities
              </Link>
            </div>
          </div>
        ) : !job ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="mb-4">
              <Link href="/careers" className="text-sm text-brand-600 underline">
                ← All opportunities
              </Link>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700 capitalize">
                  {job.jobType.replace("-", " ")}
                </span>
                {job.featured && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    ★ Featured
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
              <p className="mt-1 text-gray-600">
                <strong>{job.company}</strong>
                {job.location && ` · ${job.location}`}
              </p>
              {job.salary && (
                <p className="mt-1 text-sm font-medium text-brand-600">{job.salary}</p>
              )}
              {job.deadline && (
                <p className="mt-1 text-xs text-gray-500">
                  Apply by {new Date(job.deadline).toLocaleDateString()}
                </p>
              )}

              {job.description && (
                <div className="mt-6">
                  <h2 className="font-semibold">About the role</h2>
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">{job.description}</p>
                </div>
              )}

              {job.requirements.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-semibold">Requirements</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                    {job.requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              <div className="mt-8 border-t pt-6">
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded bg-brand-600 px-6 py-3 text-white hover:bg-brand-700"
                >
                  Apply now →
                </a>
                <p className="mt-2 text-xs text-gray-500">
                  You'll be redirected to the employer's application page.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
