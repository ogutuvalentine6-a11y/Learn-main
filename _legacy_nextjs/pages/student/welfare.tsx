import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Message {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "academic", label: "Academic issue", desc: "Grades, courses, enrollment" },
  { value: "financial", label: "Financial issue", desc: "Payments, refunds, invoices" },
  { value: "welfare", label: "Welfare / wellbeing", desc: "Personal difficulties" },
  { value: "counseling", label: "Counseling (private)", desc: "Confidential support — admin only" },
  { value: "technical", label: "Technical issue", desc: "Platform bugs, login problems" },
  { value: "other", label: "Other", desc: "Anything else" },
];

export default function StudentWelfare() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ category: "academic", subject: "", body: "", priority: "normal" });
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login");
      else if (u.role !== "student") router.push(`/${u.role}/welfare`);
      else setMe(u);
    });
  }, [router]);

  async function load() {
    const d = await fetch("/api/welfare/tickets/my").then((r) => (r.ok ? r.json() : []));
    setTickets(Array.isArray(d) ? d : []);
  }

  useEffect(() => { if (me) load(); }, [me]);

  async function createTicket() {
    if (!form.subject.trim() || !form.body.trim()) return setMsg("Subject and body required");
    setBusy(true);
    const res = await fetch("/api/welfare/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || b.detail || "Failed");
    }
    setForm({ category: "academic", subject: "", body: "", priority: "normal" });
    setShowNew(false);
    setMsg(null);
    load();
  }

  async function openTicket(t: Ticket) {
    const res = await fetch(`/api/welfare/tickets/${t._id}`).then((r) => r.ok ? r.json() : null);
    if (res) setSelected(res);
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/welfare/tickets/${selected._id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setReplyText("");
    setMsg(null);
    load();
    openTicket(selected);
  }

  if (!me) return null;

  const statusBadge = (s: string) => {
    switch (s) {
      case "open": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-yellow-100 text-yellow-700";
      case "resolved": return "bg-green-100 text-green-700";
      case "closed": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case "urgent": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "normal": return "";
      default: return "";
    }
  };

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support & Welfare</h1>
          <p className="text-sm text-gray-500">
            Raise issues, request support, or get confidential counseling.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {showNew ? "Cancel" : "+ New ticket"}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 space-y-3 rounded bg-white p-5 shadow">
          <h2 className="font-semibold">New support ticket</h2>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} — {c.desc}
              </option>
            ))}
          </select>
          {form.category === "counseling" && (
            <p className="rounded bg-blue-50 p-3 text-xs text-blue-800">
              Counseling tickets are private. Only admins can view them —
              staff and other students cannot.
            </p>
          )}
          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Describe your issue in detail…"
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="low">Low priority</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              onClick={createTicket}
              disabled={busy}
              className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      <div className="rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">My Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
            No tickets yet. Raise one above if you need support.
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => (
              <button
                key={t._id}
                onClick={() => openTicket(t)}
                className="block w-full py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(t.status)}`}>
                        {t.status.replace("_", " ")}
                      </span>
                      <span className="text-xs uppercase text-gray-500">{t.category}</span>
                      {t.priority !== "normal" && (
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{t.subject}</p>
                    <p className="text-xs text-gray-500">
                      {t.messages.length} message{t.messages.length === 1 ? "" : "s"} · updated {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {selected.category} · {selected.status.replace("_", " ")} · {selected.priority}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            <div className="space-y-3 rounded bg-gray-50 p-3">
              {selected.messages.map((m) => (
                <div key={m.id} className="rounded bg-white p-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">{m.authorName}</span> ({m.authorRole}) ·{" "}
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                </div>
              ))}
            </div>

            {selected.status !== "closed" && (
              <div className="mt-4">
                <textarea
                  placeholder="Reply…"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <button
                  onClick={sendReply}
                  disabled={busy || !replyText.trim()}
                  className="mt-2 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send reply"}
                </button>
              </div>
            )}
            {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
          </div>
        </div>
      )}
    </Layout>
  );
}
