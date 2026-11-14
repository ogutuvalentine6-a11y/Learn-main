import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface Media {
  _id: string;
  filename: string;
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  folder: string;
  visibility: string;
  context: string;
  createdAt: string;
}

export default function AdminMedia() {
  const [assets, setAssets] = useState<Media[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ filename: "", url: "", context: "homepage", visibility: "public" });

  async function load() {
    const data = await fetch("/api/media").then((r) => r.json());
    setAssets(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.filename || !form.url) return setMsg("Filename and URL are required");
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json();
      return setMsg(body.error || "Add failed");
    }
    setForm({ filename: "", url: "", context: "homepage", visibility: "public" });
    setMsg("Asset added");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this media record?")) return;
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Layout role="admin">
      <h1 className="mb-6 text-2xl font-bold">Media Library</h1>

      <section className="mb-8 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Add Media Asset</h2>
        <p className="mb-3 text-xs text-gray-500">
          Record an existing URL (Cloudinary, existing course image, etc.). Full file upload arrives in Phase 3.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            placeholder="Filename"
            value={form.filename}
            onChange={(e) => setForm({ ...form, filename: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="URL (https://res.cloudinary.com/...)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          />
          <select
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="homepage">Homepage</option>
            <option value="course">Course</option>
            <option value="avatar">Avatar</option>
            <option value="other">Other</option>
          </select>
          <select
            value={form.visibility}
            onChange={(e) => setForm({ ...form, visibility: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="course">Course-only</option>
          </select>
        </div>
        <button onClick={add} className="mt-3 rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          Add asset
        </button>
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
      </section>

      <section className="rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Assets ({assets.length})</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-gray-500">No assets yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Preview</th>
                <th>Filename</th>
                <th>Context</th>
                <th>Visibility</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a._id} className="border-b">
                  <td className="py-2">
                    {a.resourceType === "image" ? (
                      <img src={a.url} alt={a.filename} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">{a.resourceType}</span>
                    )}
                  </td>
                  <td>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
                      {a.filename}
                    </a>
                  </td>
                  <td>{a.context}</td>
                  <td>{a.visibility}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => remove(a._id)} className="text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
