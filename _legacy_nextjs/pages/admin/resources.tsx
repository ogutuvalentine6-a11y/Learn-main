import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface Resource {
  _id: string;
  title: string;
  ownerName: string;
  ownerRole: string;
  category: string;
  visibility: string;
  status: string;
  url: string;
  rejectionReason: string;
  downloads: number;
  createdAt: string;
}

export default function AdminResources() {
  const [items, setItems] = useState<Resource[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function load() {
    const data = await fetch("/api/resources").then((r) => (r.ok ? r.json() : []));
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await fetch(`/api/resources/${id}/approve`, { method: "PATCH" });
    load();
  }
  async function reject(id: string) {
    const reason = prompt("Rejection reason (optional):") ?? "";
    await fetch(`/api/resources/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this resource record?")) return;
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = tab === "all" ? items : items.filter((i) => i.status === tab);

  return (
    <Layout role="admin">
      <h1 className="mb-6 text-2xl font-bold">Resource Moderation</h1>

      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm ${tab === t ? "bg-brand-600 text-white" : "border text-gray-700"}`}>
            {t} ({t === "all" ? items.length : items.filter((i) => i.status === t).length})
          </button>
        ))}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No resources in this tab.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Title</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Visibility</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} className="border-b">
                  <td className="py-2">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
                      {r.title}
                    </a>
                  </td>
                  <td>{r.ownerName} <span className="text-xs text-gray-500">({r.ownerRole})</span></td>
                  <td>{r.category}</td>
                  <td>{r.visibility}</td>
                  <td>{r.status}</td>
                  <td className="space-x-2 py-2">
                    {r.status !== "approved" && <button onClick={() => approve(r._id)} className="text-green-700 underline">Approve</button>}
                    {r.status !== "rejected" && <button onClick={() => reject(r._id)} className="text-yellow-700 underline">Reject</button>}
                    <button onClick={() => remove(r._id)} className="text-red-600 underline">Delete</button>
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
