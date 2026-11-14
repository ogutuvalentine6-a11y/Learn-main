import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function NewThread() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", kind: "discussion", courseId: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) return router.push("/login");
      setMe(u);
    });
    fetch("/api/course-list").then((r) => r.ok ? r.json() : []).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [router]);

  async function submit() {
    if (!form.title || !form.body) return setMsg("Title and body required");
    setBusy(true);
    const res = await fetch("/api/discussions/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        courseId: form.courseId || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    const created = await res.json();
    router.push(`/discussions/${created._id}`);
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">New Thread</h1>
      <div className="max-w-2xl space-y-3 rounded bg-white p-5 shadow">
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="discussion">Discussion</option>
          <option value="question">Question</option>
          {(me.role === "staff" || me.role === "admin") && (
            <option value="announcement">Announcement</option>
          )}
        </select>
        <select
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">General (everyone)</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.title}</option>
          ))}
        </select>
        <textarea
          placeholder="Your message…"
          rows={8}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post thread"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </Layout>
  );
}
