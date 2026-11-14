import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface App {
  _id: string;
  fullName: string;
  email: string;
  idNumber: string;
  school: string;
  fieldOfStudy: string;
  courseOfStudy: string;
  motivation: string;
  status: string;
  reviewNote: string;
  createdAt: string;
}

export default function AdminAdmissions() {
  const [items, setItems] = useState<App[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [tempPw, setTempPw] = useState<{ email: string; password: string } | null>(null);
  const [selected, setSelected] = useState<App | null>(null);

  async function load() {
    const data = await fetch(`/api/admissions?status=${tab}`).then((r) => (r.ok ? r.json() : []));
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [tab]);

  async function approve(id: string) {
    if (!confirm("Approve this application and create a user account?")) return;
    const res = await fetch(`/api/admissions/${id}/approve`, { method: "PATCH" });
    const b = await res.json();
    if (!res.ok) return alert(b.error || "Failed");
    setTempPw({ email: b.email, password: b.tempPassword });
    load();
  }

  async function reject(id: string) {
    const reason = prompt("Reason for rejection (sent to applicant):") ?? "";
    const res = await fetch(`/api/admissions/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  return (
    <Layout role="admin">
      <h1 className="mb-6 text-2xl font-bold">Admissions</h1>

      {tempPw && (
        <div className="mb-4 rounded bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">✓ Account created</p>
          <p className="mt-1 text-sm text-green-700">
            Email: <strong>{tempPw.email}</strong><br />
            Temp password: <code className="rounded bg-white px-2 py-0.5 font-mono">{tempPw.password}</code>
          </p>
          <p className="mt-2 text-xs text-green-700">
            ⚠ This password is shown once. Share it with the applicant via secure channel. They should change it after first login.
          </p>
          <button onClick={() => setTempPw(null)} className="mt-2 text-xs text-green-800 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-sm ${tab === t ? "bg-brand-600 text-white" : "border text-gray-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No {tab} applications.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>School</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id} className="border-b">
                  <td className="py-2 font-medium">{a.fullName}</td>
                  <td className="text-xs">{a.email}</td>
                  <td className="text-xs">{a.school}</td>
                  <td className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="space-x-2 py-2">
                    <button onClick={() => setSelected(a)} className="text-brand-600 underline">View</button>
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => approve(a._id)} className="text-green-600 underline">Approve</button>
                        <button onClick={() => reject(a._id)} className="text-red-600 underline">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.fullName}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            <dl className="grid gap-2 text-sm">
              <Row label="Email" value={selected.email} />
              <Row label="ID Number" value={selected.idNumber} />
              <Row label="School" value={selected.school} />
              <Row label="Field" value={selected.fieldOfStudy} />
              <Row label="Course" value={selected.courseOfStudy} />
              <Row label="Submitted" value={new Date(selected.createdAt).toLocaleString()} />
              {selected.reviewNote && <Row label="Review note" value={selected.reviewNote} />}
            </dl>
            {selected.motivation && (
              <div className="mt-4">
                <p className="text-xs uppercase text-gray-500">Motivation</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{selected.motivation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
