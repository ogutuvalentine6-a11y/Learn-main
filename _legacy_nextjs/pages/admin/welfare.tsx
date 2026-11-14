import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

export default function AdminWelfare() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: "", category: "", q: "" });
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  async function load() {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.category) params.set("category", filter.category);
    if (filter.q) params.set("q", filter.q);
    const [s, t] = await Promise.all([
      fetch("/api/welfare/admin/stats").then((r) => r.ok ? r.json() : null),
      fetch(`/api/welfare/admin/tickets?${params}`).then((r) => r.ok ? r.json() : []),
    ]);
    setStats(s);
    setTickets(Array.isArray(t) ? t : []);
  }

  useEffect(() => { if (me) load(); }, [me, filter]);

  async function openTicket(id: string) {
    const t = await fetch(`/api/welfare/tickets/${id}`).then((r) => r.ok ? r.json() : null);
    if (t) setSelected(t);
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/welfare/admin/tickets/${selected._id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText, internalNote }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || b.detail || "Failed");
    }
    setReplyText("");
    setInternalNote(false);
    setMsg(null);
    load();
    openTicket(selected._id);
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    const res = await fetch(`/api/welfare/admin/tickets/${selected._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    load();
    openTicket(selected._id);
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Student Welfare</h1>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open" value={stats.byStatus.open} tone="text-blue-600" />
          <Stat label="In Progress" value={stats.byStatus.in_progress} tone="text-yellow-600" />
          <Stat label="Resolved" value={stats.byStatus.resolved} tone="text-green-600" />
          <Stat label="Total" value={stats.total} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          <option value="academic">Academic</option>
          <option value="financial">Financial</option>
          <option value="welfare">Welfare</option>
          <option value="counseling">Counseling</option>
          <option value="technical">Technical</option>
          <option value="other">Other</option>
        </select>
        <input
          placeholder="Search subject or student…"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded bg-white p-5 shadow">
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-500">No tickets match the filter.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Student</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t._id}
                  className="cursor-pointer border-b hover:bg-gray-50"
                  onClick={() => openTicket(t._id)}
                >
                  <td className="py-2">{t.studentName}</td>
                  <td>{t.subject}</td>
                  <td className="text-xs">{t.category}</td>
                  <td>
                    <span className={`text-xs rounded px-2 py-0.5 ${
                      t.status === "open" ? "bg-blue-100 text-blue-700" :
                      t.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                      t.status === "resolved" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{t.status.replace("_", " ")}</span>
                  </td>
                  <td className="text-xs capitalize">{t.priority}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {selected.studentName} ({selected.studentEmail}) · {selected.category} · {selected.status}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            {/* Status actions */}
            <div className="mb-3 flex flex-wrap gap-1">
              {["open", "in_progress", "resolved", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`rounded border px-2 py-1 text-xs capitalize ${
                    selected.status === s ? "bg-brand-600 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="space-y-2 rounded bg-gray-50 p-3">
              {selected.messages.map((m: any) => (
                <div
                  key={m.id}
                  className={`rounded p-3 ${m.internalNote ? "bg-yellow-50 border-l-4 border-yellow-400" : "bg-white"}`}
                >
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">{m.authorName}</span> ({m.authorRole})
                    {m.internalNote && <span className="ml-2 text-yellow-700">[internal]</span>}
                    · {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <textarea
                placeholder={internalNote ? "Internal note (student won't see this)…" : "Reply to student…"}
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  Internal note
                </label>
                <button
                  onClick={sendReply}
                  disabled={busy || !replyText.trim()}
                  className="ml-auto rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? "Sending…" : internalNote ? "Save note" : "Send reply"}
                </button>
              </div>
              {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Stat({ label, value, tone }: any) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone || "text-gray-900"}`}>{value}</p>
    </div>
  );
}
