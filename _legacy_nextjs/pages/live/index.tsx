import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface LiveSession {
  _id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  hostName: string;
  status: string;
  courseId: string | null;
}

export default function LiveIndex() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [scope, setScope] = useState<"upcoming" | "past" | "mine">("upcoming");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) router.push("/login");
        else setMe(u);
      });
  }, [router]);

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/live/sessions?scope=${scope}`)
      .then((r) => (r.ok ? r.json() : []));
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { if (me) load(); }, [me, scope]);

  if (!me) return null;

  const role = me.role as "student" | "staff" | "admin";

  return (
    <Layout role={role} name={me.fullName}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Sessions</h1>
        {me.role !== "student" && (
          <button
            onClick={() => router.push("/live/schedule")}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            + Schedule Session
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {(["upcoming", "past", ...(me.role !== "student" ? ["mine"] as const : [])] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s as any)}
            className={`rounded px-3 py-1.5 text-sm ${
              scope === s ? "bg-brand-600 text-white" : "border text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions in this tab.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const scheduled = new Date(s.scheduledAt);
              const isLive =
                s.status === "scheduled" &&
                scheduled.getTime() <= Date.now() &&
                Date.now() <= scheduled.getTime() + s.durationMinutes * 60_000;
              return (
                <div
                  key={s._id}
                  className="flex flex-col justify-between gap-3 rounded border p-4 md:flex-row md:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{s.title}</h3>
                      {isLive && (
                        <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">
                          ● LIVE
                        </span>
                      )}
                      {s.status !== "scheduled" && (
                        <span className="text-xs uppercase text-gray-500">
                          {s.status}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {scheduled.toLocaleString()} · {s.durationMinutes} min · host {s.hostName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.status === "scheduled" && (
                      <button
                        onClick={() => router.push(`/live/sessions/${s._id}`)}
                        className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
                      >
                        {isLive ? "Join" : "Open room"}
                      </button>
                    )}
                    {me.role !== "student" && s.status === "scheduled" && (
                      <button
                        onClick={() => router.push(`/live/sessions/${s._id}/manage`)}
                        className="rounded border px-4 py-2 text-sm text-gray-700"
                      >
                        Manage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
