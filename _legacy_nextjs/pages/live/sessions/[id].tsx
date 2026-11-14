import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function LiveRoom() {
  const router = useRouter();
  const { id } = router.query;
  const [me, setMe] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inRoom, setInRoom] = useState(false);

  useEffect(() => {
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) router.push("/login");
        else setMe(u);
      });
  }, [router]);

  useEffect(() => {
    if (!id || !me) return;
    fetch(`/api/live/sessions/${id}`)
      .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b))))
      .then(setSession)
      .catch((e) => setError(e.error || "Could not load session"));
  }, [id, me]);

  async function join() {
    const res = await fetch(`/api/live/sessions/${id}/join`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json();
      return setError(b.error || "Could not join");
    }
    const data = await res.json();
    setJoinUrl(data.joinUrl);
    setAttendanceId(data.attendanceId);
    setInRoom(true);
  }

  async function leave() {
    if (!id) return;
    await fetch(`/api/live/sessions/${id}/leave`, { method: "POST" });
    setInRoom(false);
    setJoinUrl(null);
    router.push("/live");
  }

  // Close attendance on tab close / navigation
  useEffect(() => {
    if (!attendanceId) return;
    const handler = () => {
      navigator.sendBeacon(`/api/live/sessions/${id}/leave`);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attendanceId, id]);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      {error ? (
        <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>
      ) : !session ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <p className="text-sm text-gray-500">
                Host: {session.hostName} · {new Date(session.scheduledAt).toLocaleString()}
              </p>
            </div>
            {inRoom && (
              <button
                onClick={leave}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Leave session
              </button>
            )}
          </div>

          {!inRoom ? (
            <div className="rounded bg-white p-8 text-center shadow">
              <p className="mb-4 text-gray-600">
                You&apos;re about to join a live video session. Allow camera and microphone
                when prompted.
              </p>
              <button
                onClick={join}
                className="rounded bg-brand-600 px-6 py-3 text-white hover:bg-brand-700"
              >
                Join live session
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ height: "75vh" }}>
              {joinUrl && (
                <iframe
                  src={joinUrl}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  className="h-full w-full border-0"
                  title="Live session"
                />
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
