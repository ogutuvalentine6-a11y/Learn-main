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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MySchedule() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/timetable/my-schedule")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSlots(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  // Group by day
  const byDay: Record<number, Slot[]> = {};
  for (let i = 0; i < 7; i++) byDay[i] = [];
  slots.forEach((s) => {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
    byDay[s.dayOfWeek].push(s);
  });

  const today = (new Date().getDay() + 6) % 7; // JS Sunday=0 → ISO 0=Mon

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Weekly Schedule</h1>
          <p className="text-sm text-gray-500">
            {slots.length} class{slots.length === 1 ? "" : "es"} this week
          </p>
        </div>
        <a href="/academic-calendar" className="text-sm text-brand-600 underline">
          Academic calendar →
        </a>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : slots.length === 0 ? (
        <div className="rounded border border-dashed p-10 text-center">
          <p className="text-gray-600">No classes scheduled yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Enroll in a course — its timetable will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const daySlots = byDay[day] || [];
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`rounded-lg border bg-white p-4 shadow-sm ${
                  isToday ? "ring-2 ring-brand-300" : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    {DAYS_SHORT[day]}
                    {isToday && (
                      <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">
                        Today
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-gray-400">
                    {daySlots.length}
                  </span>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-gray-400">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((s) => (
                      <div
                        key={s._id}
                        className="rounded border-l-4 border-brand-500 bg-brand-50 p-2"
                      >
                        <p className="text-xs font-mono text-gray-600">
                          {s.startTime}–{s.endTime}
                        </p>
                        <p className="mt-0.5 text-sm font-medium">{s.courseTitle}</p>
                        <p className="text-xs text-gray-500">
                          {s.instructorName}
                          {s.room && ` · ${s.room}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
