import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

export default function AdminGuardians() {
  const [links, setLinks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [tempPw, setTempPw] = useState<{ email: string; password: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", idNumber: "",
    studentId: "", relationship: "parent",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [l, u] = await Promise.all([
      fetch("/api/admin/guardian-links").then((r) => r.ok ? r.json() : []),
      fetch("/api/admin-users").then((r) => r.ok ? r.json() : []),
    ]);
    setLinks(Array.isArray(l) ? l : []);
    const all = Array.isArray(u) ? u : [];
    setStudents(all.filter((x: any) => x.role === "student"));
    setGuardians(all.filter((x: any) => x.role === "guardian"));
  }

  useEffect(() => { load(); }, []);

  async function createGuardian() {
    if (!form.fullName || !form.email || !form.phone || !form.idNumber || !form.studentId) {
      return setMsg("All fields required");
    }
    setBusy(true);
    const res = await fetch("/api/admin/guardians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    const body = await res.json();
    setTempPw({ email: body.email, password: body.tempPassword });
    setCreating(false);
    setForm({ fullName: "", email: "", phone: "", idNumber: "", studentId: "", relationship: "parent" });
    setMsg(null);
    load();
  }

  async function remove(linkId: string) {
    if (!confirm("Remove this guardian-student link?")) return;
    await fetch(`/api/admin/guardian-links/${linkId}`, { method: "DELETE" });
    load();
  }

  return (
    <Layout role="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guardians</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {creating ? "Cancel" : "+ Create guardian"}
        </button>
      </div>

      {tempPw && (
        <div className="mb-4 rounded bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">✓ Guardian account created</p>
          <p className="mt-1 text-sm text-green-700">
            Email: <strong>{tempPw.email}</strong><br />
            Temp password: <code className="rounded bg-white px-2 py-0.5 font-mono">{tempPw.password}</code>
          </p>
          <p className="mt-2 text-xs text-green-700">
            ⚠ Share securely. They should change it after first login.
          </p>
          <button onClick={() => setTempPw(null)} className="mt-2 text-xs text-green-800 underline">
            Dismiss
          </button>
        </div>
      )}

      {creating && (
        <div className="mb-6 space-y-3 rounded bg-white p-5 shadow">
          <h2 className="font-semibold">Create guardian account</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="ID number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="rounded border px-3 py-2 text-sm">
              <option value="">Select student to link</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.email})</option>)}
            </select>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="rounded border px-3 py-2 text-sm">
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="sponsor">Sponsor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button onClick={createGuardian} disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {busy ? "Creating…" : "Create + link"}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      <div className="rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Active Links ({links.length})</h2>
        {links.length === 0 ? (
          <p className="text-sm text-gray-500">No guardian-student links yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Guardian</th>
                <th>Student</th>
                <th>Relationship</th>
                <th>Linked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{l.guardianName}</p>
                    <p className="text-xs text-gray-500">{l.guardianEmail}</p>
                  </td>
                  <td>
                    <p>{l.studentName}</p>
                    <p className="text-xs text-gray-500">{l.studentEmail}</p>
                  </td>
                  <td>{l.relationship}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(l.linkedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button onClick={() => remove(l.id)} className="text-xs text-red-600 underline">
                      Unlink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
