import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface Reel {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  ownerName: string;
  ownerRole: string;
  status: string;
  views: number;
  likes: number;
  rejectionReason: string;
  createdAt: string;
}

export default function AdminReels() {
  const [items, setItems] = useState<Reel[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function load() {
    const data = await fetch("/api/reels").then((r) => (r.ok ? r.json() : []));
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await fetch(`/api/reels/${id}/approve`, { method: "PATCH" });
    load();
  }
  async function reject(id: string) {
    const reason = prompt("Rejection reason:") ?? "";
    await fetch(`/api/reels/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this reel?")) return;
    await fetch(`/api/reels/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = tab === "all" ? items : items.filter((i) => i.status === tab);

  return (
    <Layout role="admin">
      <h1 className="mb-6 text-2xl font-bold">Reels Moderation</h1>

      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-sm ${tab === t ? "bg-brand-600 text-white" : "border text-gray-700"}`}
          >
            {t} ({t === "all" ? items.length : items.filter((i) => i.status === t).length})
          </button>
        ))}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No reels in this tab.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <div key={r._id} className="rounded-lg border bg-white overflow-hidden">
                <video
                  src={r.videoUrl}
                  className="h-56 w-full object-cover bg-black"
                  controls
                  preload="metadata"
                />
                <div className="p-3">
                  <p className="text-xs uppercase text-gray-500">{r.category}</p>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    by {r.ownerName} ({r.ownerRole}) · {r.views} views · {r.likes} likes
                  </p>
                  <p className="mt-1 text-xs">
                    Status: <span className="font-medium">{r.status}</span>
                    {r.rejectionReason && ` — ${r.rejectionReason}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {r.status !== "approved" && (
                      <button onClick={() => approve(r._id)} className="rounded bg-green-600 px-2 py-1 text-white">
                        Approve
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button onClick={() => reject(r._id)} className="rounded bg-yellow-600 px-2 py-1 text-white">
                        Reject
                      </button>
                    )}
                    <button onClick={() => remove(r._id)} className="rounded bg-red-600 px-2 py-1 text-white">
                      Delete
                    </button>
                    <a
                      href={`/reels#${r._id}`}
                      className="rounded border px-2 py-1 text-gray-700"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
