import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

const EMPTY = {
  title: "", company: "", location: "", jobType: "internship",
  description: "", requirements: "", salary: "", applyUrl: "",
  deadline: "", featured: false, status: "draft",
};

export default function AdminCareers() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [tab, setTab] = useState<"all" | "draft" | "published" | "closed">("all");
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const url = tab === "all" ? "/api/jobs" : `/api/jobs?status=${tab}`;
    const data = await fetch(url).then((r) => (r.ok ? r.json() : []));
    setJobs(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [tab]);

  function reset() {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(false);
    setMsg(null);
  }

  function startEdit(j: any) {
    setForm({
      title: j.title,
      company: j.company,
      location: j.location,
      jobType: j.jobType,
      description: j.description,
      requirements: (j.requirements || []).join("\n"),
      salary: j.salary,
      applyUrl: j.applyUrl,
      deadline: j.deadline ? j.deadline.slice(0, 10) : "",
      featured: j.featured,
      status: j.status,
    });
    setEditing(j._id);
    setShowForm(true);
    setMsg(null);
  }

  async function save() {
    if (!form.title || !form.company || !form.applyUrl) {
      return setMsg("Title, company, and apply URL are required");
    }
    setBusy(true);
    const payload = {
      title: form.title,
      company: form.company,
      location: form.location,
      jobType: form.jobType,
      description: form.description,
      requirements: form.requirements.split("\n").map((s: string) => s.trim()).filter(Boolean),
      salary: form.salary,
      applyUrl: form.applyUrl,
      deadline: form.deadline ? new Date(form.deadline + "T23:59:59Z").toISOString() : null,
      featured: form.featured,
      status: form.status,
    };
    const url = editing ? `/api/jobs/${editing}` : "/api/jobs";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || b.detail || "Failed");
    }
    reset();
    load();
  }

  async function close(jobId: string) {
    if (!confirm("Close this posting? It will no longer appear publicly.")) return;
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    load();
  }

  async function remove(jobId: string) {
    if (!confirm("Delete this posting permanently?")) return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    load();
  }

  return (
    <Layout role="admin">
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">Careers & Internships</h1>
        <button
          onClick={() => (showForm ? reset() : setShowForm(true))}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ Create posting"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded bg-white p-5 shadow">
          <h2 className="font-semibold">{editing ? "Edit posting" : "New posting"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="Location (e.g. Remote, Nairobi)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })} className="rounded border px-3 py-2 text-sm">
              <option value="internship">Internship</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="volunteer">Volunteer</option>
            </select>
            <input placeholder="Salary / stipend (optional)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input placeholder="Apply URL (https://...)" value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="rounded border px-3 py-2 text-sm" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded border px-3 py-2 text-sm">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <textarea placeholder="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
          <textarea placeholder="Requirements — one per line" rows={4} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
            Featured (shows first on public page)
          </label>
          <button onClick={save} disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {busy ? "Saving…" : editing ? "Update" : "Create"}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["all", "draft", "published", "closed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm ${tab === t ? "bg-brand-600 text-white" : "border text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No postings in this tab.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Title</th>
                <th>Company</th>
                <th>Type</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j._id} className="border-b">
                  <td className="py-2 font-medium">{j.title}</td>
                  <td>{j.company}</td>
                  <td className="capitalize">{j.jobType.replace("-", " ")}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      j.status === "published" ? "bg-green-100 text-green-700" :
                      j.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{j.status}</span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {j.deadline ? new Date(j.deadline).toLocaleDateString() : "—"}
                  </td>
                  <td className="space-x-2 py-2">
                    <button onClick={() => startEdit(j)} className="text-brand-600 underline text-xs">Edit</button>
                    {j.status !== "closed" && (
                      <button onClick={() => close(j._id)} className="text-yellow-700 underline text-xs">Close</button>
                    )}
                    <button onClick={() => remove(j._id)} className="text-red-600 underline text-xs">Delete</button>
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
