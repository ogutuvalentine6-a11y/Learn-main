import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AdmissionStatus() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/admissions/check?email=${encodeURIComponent(email.trim())}`);
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setError(b.error || "Not found");
    }
    setResult(await res.json());
  }

  const badge = (s: string) =>
    s === "approved" ? "bg-green-100 text-green-700" :
    s === "rejected" ? "bg-red-100 text-red-700" :
    "bg-yellow-100 text-yellow-700";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold">Application Status</h1>
        <p className="mt-2 text-gray-600">
          Enter the email you used when applying.
        </p>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
          <button
            onClick={check}
            disabled={busy}
            className="mt-3 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check status"}
          </button>

          {error && (
            <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="mt-4 rounded border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className={`rounded px-2 py-0.5 text-xs uppercase font-medium ${badge(result.status)}`}>
                  {result.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Submitted {new Date(result.submittedAt).toLocaleDateString()}
                {result.reviewedAt && ` · Reviewed ${new Date(result.reviewedAt).toLocaleDateString()}`}
              </p>
              {result.reviewNote && (
                <p className="mt-2 text-sm text-gray-700">
                  <strong>Note:</strong> {result.reviewNote}
                </p>
              )}
              {result.status === "approved" && (
                <p className="mt-3 text-sm text-green-700">
                  ✓ Your application is approved. Check your email for login credentials.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
