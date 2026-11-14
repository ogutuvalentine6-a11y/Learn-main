import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function ScheduleLive() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    scheduledAt: "",
    durationMinutes: 60,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/live");
      setMe(u);
    });
    fetch("/api/course-list").then((r) => r.ok ? r.json() : []).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [router]);

  async function submit() {
    if (!form.title || !form.scheduledAt) return setMsg("Title and time required");
    setBusy(true);
    const res = await fetch("/api/live/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        courseId: form.courseId || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    const created = await res.json();
    router.push(`/live/sessions/${created._id}/manage`);
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Schedule Live Session</h1>
      <div className="max-w-2xl space-y-3 rounded bg-white p-5 shadow">
        <input
          placeholder="Session title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Description (optional)"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <select
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Open session (any logged-in user)</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Duration (minutes)"
          value={form.durationMinutes}
          onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Schedule"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </Layout>
  );
}
