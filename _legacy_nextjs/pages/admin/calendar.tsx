import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

const EVENT_TYPES = ["holiday", "exam", "registration", "deadline", "orientation", "other"];

export default function AdminCalendar() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [semForm, setSemForm] = useState({ name: "", startDate: "", endDate: "", description: "" });
  const [evForm, setEvForm] = useState({
    title: "", description: "", eventType: "other",
    startDate: "", endDate: "", semesterId: "", isPublic: true,
  });
  const [showSemForm, setShowSemForm] = useState(false);
  const [showEvForm, setShowEvForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, e] = await Promise.all([
      fetch("/api/academic/semesters").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/academic/calendar/events?publicOnly=false").then((r) => (r.ok ? r.json() : [])),
    ]);
    setSemesters(Array.isArray(s) ? s : []);
    setEvents(Array.isArray(e) ? e : []);
  }

  useEffect(() => { load(); }, []);

  async function createSemester() {
    if (!semForm.name || !semForm.startDate || !semForm.endDate) return setMsg("All required fields needed");
    setBusy(true);
    const res = await fetch("/api/academic/semesters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: semForm.name,
        description: semForm.description,
        startDate: new Date(semForm.startDate).toISOString(),
        endDate: new Date(semForm.endDate).toISOString(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || b.detail || "Failed");
    }
    setSemForm({ name: "", startDate: "", endDate: "", description: "" });
    setShowSemForm(false);
    setMsg(null);
    load();
  }

  async function activateSemester(id: string) {
    if (!confirm("Set as the active semester? Any currently active semester will be archived.")) return;
    await fetch(`/api/academic/semesters/${id}/activate`, { method: "POST" });
    load();
  }

  async function archiveSemester(id: string) {
    if (!confirm("Archive this semester?")) return;
    await fetch(`/api/academic/semesters/${id}/archive`, { method: "POST" });
    load();
  }

  async function deleteSemester(id: string) {
    if (!confirm("Delete this semester? Calendar events will be kept but unlinked.")) return;
    await fetch(`/api/academic/semesters/${id}`, { method: "DELETE" });
    load();
  }

  async function createEvent() {
    if (!evForm.title || !evForm.startDate || !evForm.endDate) return setMsg("Title and dates required");
    setBusy(true);
    const res = await fetch("/api/academic/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: evForm.title,
        description: evForm.description,
        eventType: evForm.eventType,
        startDate: new Date(evForm.startDate).toISOString(),
        endDate: new Date(evForm.endDate).toISOString(),
        semesterId: evForm.semesterId || null,
        isPublic: evForm.isPublic,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || b.detail || "Failed");
    }
    setEvForm({ title: "", description: "", eventType: "other", startDate: "", endDate: "", semesterId: "", isPublic: true });
    setShowEvForm(false);
    setMsg(null);
    load();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/academic/calendar/events/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Layout role="admin">
      <h1 className="mb-6 text-2xl font-bold">Academic Calendar</h1>

      {/* ── Semesters ── */}
      <section className="mb-8 rounded bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Semesters</h2>
          <button
            onClick={() => setShowSemForm((v) => !v)}
            className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
          >
            {showSemForm ? "Cancel" : "+ Add semester"}
          </button>
        </div>

        {showSemForm && (
          <div className="mb-4 space-y-2 rounded border p-3">
            <input
              placeholder="Semester name (e.g. 2026 Spring)"
              value={semForm.name}
              onChange={(e) => setSemForm({ ...semForm, name: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="date"
                value={semForm.startDate}
                onChange={(e) => setSemForm({ ...semForm, startDate: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={semForm.endDate}
                onChange={(e) => setSemForm({ ...semForm, endDate: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={semForm.description}
              onChange={(e) => setSemForm({ ...semForm, description: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <button
              onClick={createSemester}
              disabled={busy}
              className="rounded bg-brand-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
            {msg && <p className="text-xs text-red-600">{msg}</p>}
          </div>
        )}

        {semesters.length === 0 ? (
          <p className="text-sm text-gray-500">No semesters defined yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((s) => (
                <tr key={s._id} className="border-b">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`text-xs rounded px-2 py-0.5 ${
                      s.status === "active" ? "bg-green-100 text-green-700" :
                      s.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{s.status}</span>
                  </td>
                  <td className="space-x-2 py-2 text-xs">
                    {s.status !== "active" && (
                      <button onClick={() => activateSemester(s._id)} className="text-green-700 underline">Activate</button>
                    )}
                    {s.status === "active" && (
                      <button onClick={() => archiveSemester(s._id)} className="text-yellow-700 underline">Archive</button>
                    )}
                    <button onClick={() => deleteSemester(s._id)} className="text-red-600 underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Calendar Events ── */}
      <section className="rounded bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Calendar Events</h2>
          <button
            onClick={() => setShowEvForm((v) => !v)}
            className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
          >
            {showEvForm ? "Cancel" : "+ Add event"}
          </button>
        </div>

        {showEvForm && (
          <div className="mb-4 space-y-2 rounded border p-3">
            <input
              placeholder="Title"
              value={evForm.title}
              onChange={(e) => setEvForm({ ...evForm, title: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <select
                value={evForm.eventType}
                onChange={(e) => setEvForm({ ...evForm, eventType: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
              <select
                value={evForm.semesterId}
                onChange={(e) => setEvForm({ ...evForm, semesterId: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="">Global (not tied to semester)</option>
                {semesters.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={evForm.startDate}
                onChange={(e) => setEvForm({ ...evForm, startDate: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={evForm.endDate}
                onChange={(e) => setEvForm({ ...evForm, endDate: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={evForm.description}
              onChange={(e) => setEvForm({ ...evForm, description: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={evForm.isPublic}
                onChange={(e) => setEvForm({ ...evForm, isPublic: e.target.checked })}
              />
              Visible on public calendar
            </label>
            <button
              onClick={createEvent}
              disabled={busy}
              className="rounded bg-brand-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create event"}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Title</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Public</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id} className="border-b">
                  <td className="py-2 font-medium">{e.title}</td>
                  <td className="text-xs capitalize">{e.eventType}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(e.startDate).toLocaleDateString()} — {new Date(e.endDate).toLocaleDateString()}
                  </td>
                  <td className="text-xs">{e.isPublic ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => deleteEvent(e._id)} className="text-xs text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
