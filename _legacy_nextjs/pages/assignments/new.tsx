import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function NewAssignment() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ courseId: "", title: "", instructions: "", dueAt: "", maxScore: 100 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/assignments");
      setMe(u);
    });
    fetch("/api/course-list").then((r) => r.ok ? r.json() : []).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [router]);

  async function submit() {
    if (!form.courseId || !form.title) return setMsg("Course and title required");
    setBusy(true);
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: form.courseId,
        title: form.title,
        instructions: form.instructions,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        maxScore: Number(form.maxScore),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    const created = await res.json();
    router.push(`/assignments/${created._id}`);
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Create Assignment</h1>
      <div className="max-w-2xl space-y-3 rounded bg-white p-5 shadow">
        <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full rounded border px-3 py-2 text-sm">
          <option value="">Select course</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
        <textarea placeholder="Instructions" rows={5} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
        <div className="grid gap-3 md:grid-cols-2">
          <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="rounded border px-3 py-2 text-sm" />
          <input type="number" placeholder="Max score" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} className="rounded border px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create assignment"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </Layout>
  );
}
