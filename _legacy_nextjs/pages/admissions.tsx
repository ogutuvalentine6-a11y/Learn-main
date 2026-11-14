import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FIELDS = [
  { name: "fullName", label: "Full Name", type: "text", required: true },
  { name: "idNumber", label: "ID Number", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "text", required: true },
  { name: "location", label: "Location", type: "text", required: true },
  { name: "school", label: "School / Institution", type: "text", required: true },
  { name: "fieldOfStudy", label: "Field of Study", type: "text", required: true },
  { name: "courseOfStudy", label: "Course of Study", type: "text", required: true },
] as const;

export default function AdmissionsPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [motivation, setMotivation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admissions/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, motivation }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setError(b.error || "Application failed");
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navbar />
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-12">
          <div className="w-full rounded-lg border bg-white p-8 text-center shadow">
            <div className="text-5xl">✓</div>
            <h1 className="mt-4 text-2xl font-bold">Application received</h1>
            <p className="mt-2 text-gray-600">
              We'll review your application and get back to you by email.
              You can check your status anytime with your email address.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/admissions/status" className="rounded border border-brand-600 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50">
                Check my status
              </Link>
              <Link href="/" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
                Back home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Apply to Learn</h1>
        <p className="mt-2 text-gray-600">
          Submit an application below. Once reviewed and approved, you'll
          receive login credentials by email.
        </p>

        <form onSubmit={submit} className="mt-8 rounded-lg border bg-white p-6 shadow">
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-sm font-medium">{f.label}</label>
                <input
                  type={f.type}
                  required={f.required}
                  value={form[f.name] || ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">
              Why do you want to study with us? (optional)
            </label>
            <textarea
              rows={4}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="A few sentences about your goals…"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <Link href="/admissions/status" className="text-sm text-brand-600 underline">
              Already applied? Check status
            </Link>
            <button
              disabled={busy}
              className="rounded bg-brand-600 px-6 py-2.5 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
