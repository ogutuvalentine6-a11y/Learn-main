import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Thread {
  _id: string;
  title: string;
  body: string;
  kind: string;
  authorName: string;
  authorRole: string;
  pinned: boolean;
  locked: boolean;
  views: number;
  replyCount: number;
  courseId: string | null;
  createdAt: string;
}

export default function Discussions() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState({ q: "", kind: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (!u) router.push("/login"); else setMe(u); });
  }, [router]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.kind) params.set("kind", filter.kind);
    const data = await fetch(`/api/discussions/threads?${params}`)
      .then((r) => (r.ok ? r.json() : []));
    setThreads(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { if (me) load(); }, [me, filter]);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discussions</h1>
        <button
          onClick={() => router.push("/discussions/new")}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          + New thread
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search…"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          className="rounded border px-3 py-1.5 text-sm"
        />
        <select
          value={filter.kind}
          onChange={(e) => setFilter({ ...filter, kind: e.target.value })}
          className="rounded border px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          <option value="question">Questions</option>
          <option value="discussion">Discussions</option>
          <option value="announcement">Announcements</option>
        </select>
      </div>

      <div className="rounded bg-white p-5 shadow">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="text-sm text-gray-500">No threads yet. Start the conversation.</p>
        ) : (
          <div className="divide-y">
            {threads.map((t) => (
              <button
                key={t._id}
                onClick={() => router.push(`/discussions/${t._id}`)}
                className="flex w-full items-start gap-3 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {t.pinned && <span className="text-xs text-yellow-600">📌</span>}
                    {t.locked && <span className="text-xs text-gray-500">🔒</span>}
                    <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {t.kind}
                    </span>
                    <h3 className="font-medium text-gray-900">{t.title}</h3>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-600">{t.body}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    by {t.authorName} ({t.authorRole}) · {t.views} views · {t.replyCount} replies
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
