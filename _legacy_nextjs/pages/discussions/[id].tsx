import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function ThreadDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [me, setMe] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (!u) router.push("/login"); else setMe(u); });
  }, [router]);

  async function load() {
    if (!id) return;
    const res = await fetch(`/api/discussions/threads/${id}`);
    if (!res.ok) {
      const b = await res.json();
      return setError(b.error || "Failed to load");
    }
    const data = await res.json();
    setThread(data.thread);
    setReplies(data.replies);
  }

  useEffect(() => { if (id && me) load(); }, [id, me]);

  async function submitReply() {
    if (!body.trim()) return setMsg("Reply cannot be empty");
    const res = await fetch(`/api/discussions/threads/${id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentReplyId: replyTo }),
    });
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setBody("");
    setReplyTo(null);
    setMsg(null);
    load();
  }

  async function deleteReply(replyId: string) {
    if (!confirm("Delete this reply?")) return;
    await fetch(`/api/discussions/replies/${replyId}`, { method: "DELETE" });
    load();
  }

  async function togglePin() {
    await fetch(`/api/discussions/threads/${id}?pinned=${!thread.pinned}`, { method: "PATCH" });
    load();
  }
  async function toggleLock() {
    await fetch(`/api/discussions/threads/${id}?locked=${!thread.locked}`, { method: "PATCH" });
    load();
  }
  async function deleteThread() {
    if (!confirm("Delete this thread and all replies?")) return;
    await fetch(`/api/discussions/threads/${id}`, { method: "DELETE" });
    router.push("/discussions");
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      {error ? (
        <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>
      ) : !thread ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="mb-6 rounded bg-white p-5 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {thread.pinned && <span className="text-xs text-yellow-600">📌</span>}
                  {thread.locked && <span className="text-xs text-gray-500">🔒</span>}
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                    {thread.kind}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-bold">{thread.title}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  by {thread.authorName} ({thread.authorRole}) · {thread.views} views
                </p>
                <p className="mt-4 whitespace-pre-wrap text-gray-800">{thread.body}</p>
              </div>
            </div>
            {(me.role === "staff" || me.role === "admin") && (
              <div className="mt-4 flex gap-2 border-t pt-3">
                <button onClick={togglePin} className="text-sm text-brand-600 underline">
                  {thread.pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={toggleLock} className="text-sm text-brand-600 underline">
                  {thread.locked ? "Unlock" : "Lock"}
                </button>
                <button onClick={deleteThread} className="text-sm text-red-600 underline">
                  Delete thread
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {replies.map((r) => (
              <div
                key={r._id}
                className={`rounded bg-white p-4 shadow ${r.parentReplyId ? "ml-8 border-l-2 border-brand-200" : ""}`}
              >
                <p className="text-sm text-gray-500">
                  {r.authorName} ({r.authorRole}) · {new Date(r.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-gray-800">{r.body}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  {!thread.locked && (
                    <button
                      onClick={() => setReplyTo(r._id)}
                      className="text-brand-600 underline"
                    >
                      Reply
                    </button>
                  )}
                  {(me.role === "admin" || r.authorId === me.id) && (
                    <button onClick={() => deleteReply(r._id)} className="text-red-600 underline">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!thread.locked ? (
            <div className="mt-6 rounded bg-white p-5 shadow">
              <h2 className="mb-3 font-semibold">
                {replyTo ? "Reply to comment" : "Add a reply"}
              </h2>
              {replyTo && (
                <p className="mb-2 text-xs text-gray-500">
                  Replying to a comment ·{" "}
                  <button onClick={() => setReplyTo(null)} className="text-brand-600 underline">
                    cancel
                  </button>
                </p>
              )}
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Your reply…"
              />
              <button
                onClick={submitReply}
                className="mt-2 rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
              >
                Post reply
              </button>
              {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
            </div>
          ) : (
            <p className="mt-6 rounded bg-gray-100 p-4 text-center text-sm text-gray-500">
              🔒 This thread is locked. No new replies.
            </p>
          )}
        </>
      )}
    </Layout>
  );
}
