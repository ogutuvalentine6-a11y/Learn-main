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
}

interface Student {
  studentId: string;
  fullName: string;
  email: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES = ["present", "absent", "late", "excused"] as const;
type Status = typeof STATUSES[number];

export default function StaffAttendance() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/student/attendance");
      setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/timetable/my-teaching")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSlots(Array.isArray(d) ? d : []));
  }, [me]);

  async function loadStudentsAndMarks() {
    if (!selectedSlot) return;
    // Get summary (gives us enrolled students)
    const summary = await fetch(`/api/attendance/summary/${selectedSlot.courseId}`).then((r) =>
      r.ok ? r.json() : []
    );
    const list = Array.isArray(summary) ? summary : [];
    setStudents(list);

    // Get existing marks for this date
    const existing = await fetch(
      `/api/attendance/slot/${selectedSlot._id}/date/${date}`
    ).then((r) => (r.ok ? r.json() : []));
    setExistingCount(Array.isArray(existing) ? existing.length : 0);

    // Default everyone to present, then apply existing
    const defaultMarks: Record<string, Status> = {};
    list.forEach((s: any) => {
      defaultMarks[s.studentId] = "present";
    });
    (Array.isArray(existing) ? existing : []).forEach((a: any) => {
      defaultMarks[a.studentId] = a.status as Status;
    });
    setMarks(defaultMarks);
  }

  useEffect(() => {
    if (selectedSlot) loadStudentsAndMarks();
  }, [selectedSlot, date]);

  async function save() {
    if (!selectedSlot) return;
    setBusy(true);
    setMsg(null);
    const records = students.map((s) => ({
      studentId: s.studentId,
      status: marks[s.studentId] || "present",
      note: "",
    }));
    const res = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: selectedSlot._id,
        date,
        records,
      }),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) {
      return setMsg(body.detail || body.error || "Failed");
    }
    setMsg(`✓ Saved ${body.written} record${body.written === 1 ? "" : "s"}`);
    setExistingCount(body.written);
  }

  function markAll(status: Status) {
    const next: Record<string, Status> = {};
    students.forEach((s) => { next[s.studentId] = status; });
    setMarks(next);
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Attendance</h1>

      <div className="grid gap-6 md:grid-cols-[320px,1fr]">
        {/* Slot list */}
        <aside>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">My Slots</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500">
              No timetable slots. Create one in <a href="/staff/timetable" className="text-brand-600 underline">Timetable</a>.
            </p>
          ) : (
            <div className="space-y-2">
              {slots.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedSlot(s)}
                  className={`w-full rounded border p-3 text-left text-sm transition ${
                    selectedSlot?._id === s._id
                      ? "border-brand-600 bg-brand-50"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium">{s.courseTitle}</p>
                  <p className="text-xs text-gray-500">
                    {DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime}
                    {s.room && ` · ${s.room}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Marking panel */}
        <div>
          {!selectedSlot ? (
            <div className="rounded border border-dashed p-10 text-center text-gray-500">
              Select a slot to mark attendance
            </div>
          ) : (
            <div className="rounded bg-white p-5 shadow">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="font-semibold">{selectedSlot.courseTitle}</h2>
                  <p className="text-xs text-gray-500">
                    {DAYS[selectedSlot.dayOfWeek]} {selectedSlot.startTime}–{selectedSlot.endTime}
                    {selectedSlot.room && ` · ${selectedSlot.room}`}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-gray-500">Date</label>
                  <input
                    type="date"
                    value={date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>
              </div>

              {existingCount > 0 && (
                <p className="mb-3 rounded bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
                  {existingCount} record{existingCount === 1 ? "" : "s"} already saved for this date — editing will update
                </p>
              )}

              {students.length === 0 ? (
                <p className="text-sm text-gray-500">No enrolled students yet.</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{students.length} students</span>
                    <div className="flex gap-1 text-xs">
                      <button onClick={() => markAll("present")} className="rounded border px-2 py-1 hover:bg-gray-50">All present</button>
                      <button onClick={() => markAll("absent")} className="rounded border px-2 py-1 hover:bg-gray-50">All absent</button>
                    </div>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2">Student</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.studentId} className="border-b">
                          <td className="py-2">
                            <p className="font-medium">{s.fullName}</p>
                            <p className="text-xs text-gray-500">{s.email}</p>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {STATUSES.map((st) => (
                                <button
                                  key={st}
                                  onClick={() => setMarks({ ...marks, [s.studentId]: st })}
                                  className={`rounded border px-2 py-1 text-xs capitalize transition ${
                                    marks[s.studentId] === st
                                      ? st === "present"
                                        ? "border-green-600 bg-green-100 text-green-800"
                                        : st === "absent"
                                        ? "border-red-600 bg-red-100 text-red-800"
                                        : st === "late"
                                        ? "border-yellow-600 bg-yellow-100 text-yellow-800"
                                        : "border-blue-600 bg-blue-100 text-blue-800"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={save}
                    disabled={busy}
                    className="mt-4 rounded bg-brand-600 px-5 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save attendance"}
                  </button>
                  {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
