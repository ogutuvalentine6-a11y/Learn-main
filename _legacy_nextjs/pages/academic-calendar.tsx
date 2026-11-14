import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Semester {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  holiday: "bg-red-50 border-red-200 text-red-800",
  exam: "bg-purple-50 border-purple-200 text-purple-800",
  registration: "bg-blue-50 border-blue-200 text-blue-800",
  deadline: "bg-orange-50 border-orange-200 text-orange-800",
  orientation: "bg-green-50 border-green-200 text-green-800",
  other: "bg-gray-50 border-gray-200 text-gray-800",
};

const EVENT_ICONS: Record<string, string> = {
  holiday: "🎉",
  exam: "📝",
  registration: "📋",
  deadline: "⏰",
  orientation: "👋",
  other: "📌",
};

export default function AcademicCalendar() {
  const [current, setCurrent] = useState<Semester | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/academic/semesters/current").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/academic/semesters").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/academic/calendar/events?limit=100").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, s, e]) => {
        setCurrent(c);
        setSemesters(Array.isArray(s) ? s : []);
        setEvents(Array.isArray(e) ? e : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.endDate) >= now);
  const past = events.filter((e) => new Date(e.endDate) < now);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Academic Calendar</h1>
        <p className="mt-2 text-gray-600">
          Important dates for the academic year — registration, exams, holidays, and deadlines.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : (
          <>
            {current && (
              <div className="mt-6 rounded-lg border-l-4 border-brand-600 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase text-brand-600 font-semibold">Current Semester</p>
                <h2 className="mt-1 text-xl font-bold">{current.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {new Date(current.startDate).toLocaleDateString()} —{" "}
                  {new Date(current.endDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {semesters.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">All Semesters</h2>
                <div className="grid gap-2 md:grid-cols-3">
                  {semesters.map((s) => (
                    <div key={s._id} className={`rounded border p-3 text-sm ${s.status === "active" ? "border-brand-600 bg-brand-50" : "bg-white"}`}>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()}
                      </p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
                        s.status === "active" ? "bg-green-100 text-green-700" :
                        s.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="mb-3 text-xl font-semibold">Upcoming Events</h2>
              {upcoming.length === 0 ? (
                <div className="rounded border border-dashed p-8 text-center text-gray-500">
                  No upcoming events scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <div
                      key={e._id}
                      className={`rounded-lg border-l-4 p-4 shadow-sm ${EVENT_COLORS[e.eventType] || EVENT_COLORS.other}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{EVENT_ICONS[e.eventType] || "📌"}</span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{e.title}</h3>
                            <span className="text-xs uppercase opacity-70">{e.eventType}</span>
                          </div>
                          {e.description && (
                            <p className="mt-1 text-sm opacity-80">{e.description}</p>
                          )}
                          <p className="mt-2 text-xs font-medium">
                            {new Date(e.startDate).toLocaleDateString()}
                            {e.startDate !== e.endDate && (
                              <> — {new Date(e.endDate).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {past.length > 0 && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-medium text-gray-600">
                  Past Events ({past.length})
                </summary>
                <div className="mt-3 space-y-2 opacity-70">
                  {past.map((e) => (
                    <div key={e._id} className="rounded border bg-white p-3 text-sm">
                      <div className="flex justify-between">
                        <span>{EVENT_ICONS[e.eventType] || "📌"} {e.title}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(e.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
