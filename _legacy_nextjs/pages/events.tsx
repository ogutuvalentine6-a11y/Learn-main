import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Event {
  id: string;
  title: string;
  description: string;
  hostName: string;
  scheduledAt: string;
  durationMinutes: number;
  courseTitle: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events/upcoming")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
        <p className="mt-2 text-gray-600">
          Live learning sessions, workshops, and guest lectures from our instructors.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : events.length === 0 ? (
          <div className="mt-8 rounded border border-dashed p-10 text-center">
            <p className="text-gray-500">No upcoming events scheduled.</p>
            <p className="mt-2 text-sm text-gray-400">
              Check back soon — instructors publish new sessions regularly.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{e.title}</h2>
                    {e.description && (
                      <p className="mt-1 text-sm text-gray-600">{e.description}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(e.scheduledAt).toLocaleString()} · {e.durationMinutes} min
                      {e.courseTitle && ` · ${e.courseTitle}`}
                    </p>
                    <p className="text-xs text-gray-500">Host: {e.hostName}</p>
                  </div>
                  <Link
                    href="/login"
                    className="shrink-0 rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
                  >
                    Join (sign in)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
