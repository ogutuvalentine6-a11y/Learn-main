import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CertificatesPage() {
  const [certId, setCertId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    if (!certId.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(certId.trim())}`);
    setBusy(false);
    if (!res.ok) {
      return setError("Certificate not found. Check the ID and try again.");
    }
    setResult(await res.json());
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Verify Certificate</h1>
        <p className="mt-2 text-gray-600">
          Enter a certificate ID to verify its authenticity. Employers and institutions
          can confirm completion of a Learn course.
        </p>

        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium">Certificate ID</label>
          <input
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder="e.g. CERT-2026-0001"
            className="mt-2 w-full rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={verify}
            disabled={busy || !certId.trim()}
            className="mt-3 rounded bg-brand-600 px-5 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>

          {error && (
            <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 rounded bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                ✓ Valid certificate
              </p>
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                <p><strong>Recipient:</strong> {result.studentName}</p>
                <p><strong>Course:</strong> {result.courseTitle}</p>
                <p><strong>Certificate ID:</strong> {result.certificateId}</p>
                <p>
                  <strong>Issued:</strong>{" "}
                  {result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
