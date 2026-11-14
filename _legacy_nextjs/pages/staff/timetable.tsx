import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Slot {
  _id: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  isActive: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY = {
  courseId: "", instructorId: "", dayOfWeek: 0,
  startTime: "09:00", endTime: "10:00", room: "",
};

export default function StaffTimetable() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/student/schedule");
      setMe(u);
    });
    fetch("/api/course-list").then((r) => r.ok ? r.json() : []).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [router]);

  async function load() {
    const d = await fetch("/api/timetable/my-teaching").then((r) => r.ok ? r.json() : []);
    setSlots(Array.isArray(d) ? d : []);
  }

  useEffect(() => { if (me) load(); }, [me]);

  async function create() {
    if (!form.courseId) return setMsg("Select a course");
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/timetable/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: form.courseId,
        instructorId: form.instructorId || null,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setError(b.detail || b.error || "Failed");
    }
    setForm({ ...EMPTY, courseId: form.courseId }); // keep course selection
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this slot?")) return;
    await fetch(`/api/timetable/slots/${id}`, { method: "DELETE" });
    load();
  }

  if (!me) return null;

  const byDay: Record<number, Slot[]> = {};
  for (let i = 0; i < 7; i++) byDay[i] = [];
  slots.forEach((s) => {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
    byDay[s.dayOfWeek].push(s);
  });

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Teaching Schedule</h1>
          <p className="text-sm text-gray-500">
            {slots.length} slot{slots.length === 1 ? "" : "s"} this week
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ Add slot"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded bg-white p-5 shadow">
          <h2 className="font-semibold">Add timetable slot</h2>
          <select
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
              className="rounded border px-3 py-2 text-sm"
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              placeholder="Room (e.g. Lab A)"
              className="rounded border px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs text-gray-500">Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={create}
            disabled={busy}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create slot"}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Weekly Schedule</h2>
        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">
            No slots yet. Add one to appear on enrolled students' schedules.
          </p>
        ) : (
          <div className="space-y-3">
            {DAYS.map((day, idx) => {
              const daySlots = byDay[idx] || [];
              if (daySlots.length === 0) return null;
              return (
                <div key={idx} className="rounded border">
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase text-gray-500">
                    {day}
                  </div>
                  <ul className="divide-y">
                    {daySlots.map((s) => (
                      <li key={s._id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs">{s.startTime}–{s.endTime}</span>
                          <span className="ml-3 font-medium">{s.courseTitle}</span>
                          {s.room && <span className="ml-2 text-xs text-gray-500">({s.room})</span>}
                        </div>
                        <button
                          onClick={() => remove(s._id)}
                          className="text-xs text-red-600 underline"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
