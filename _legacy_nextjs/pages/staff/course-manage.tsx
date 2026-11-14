import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FileUploader from "@/components/FileUploader";

interface Module {
  _id: string;
  title: string;
  description: string;
  orderIndex: number;
  sessionsCount?: number;
}

interface Session {
  _id: string;
  title: string;
  orderIndex: number;
  moduleId: string | null;
  notes: string;
  materialUrls: string[];
}

export default function CourseManage() {
  const router = useRouter();
  const { courseId } = router.query;
  const [me, setMe] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [standaloneCount, setStandaloneCount] = useState(0);
  const [form, setForm] = useState({ title: "", moduleId: "" });
  const [materialUrls, setMaterialUrls] = useState<string[]>([]);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newSessionModule, setNewSessionModule] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/live");
      setMe(u);
    });
  }, [router]);

  async function load() {
    if (!courseId) return;
    const [mods, sess] = await Promise.all([
      fetch(`/api/modules?courseId=${courseId}`).then((r) => r.ok ? r.json() : { modules: [], standaloneSessions: 0 }),
      fetch(`/api/session-list?courseId=${courseId}`).then((r) => r.ok ? r.json() : []),
    ]);
    setModules(mods.modules || []);
    setStandaloneCount(mods.standaloneSessions || 0);
    setSessions(Array.isArray(sess) ? sess : []);
  }

  useEffect(() => { if (me && courseId) load(); }, [me, courseId]);

  async function createModule() {
    if (!moduleForm.title.trim()) return setMsg("Module title required");
    setBusy(true);
    const nextOrder = modules.length === 0 ? 1 : Math.max(...modules.map((m) => m.orderIndex)) + 1;
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        title: moduleForm.title,
        description: moduleForm.description,
        orderIndex: nextOrder,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setModuleForm({ title: "", description: "" });
    setMsg("Module created");
    load();
  }

  async function renameModule(id: string, currentTitle: string) {
    const title = prompt("New module title:", currentTitle);
    if (!title || title === currentTitle) return;
    const res = await fetch(`/api/modules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  async function moveModule(id: string, direction: "up" | "down") {
    const res = await fetch(`/api/modules/${id}/move-${direction}`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  async function deleteModule(id: string) {
    if (!confirm("Delete this module? Its sessions will become standalone.")) return;
    await fetch(`/api/modules/${id}`, { method: "DELETE" });
    load();
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setMsg("Session title required");
    setBusy(true);
    const nextOrder = sessions.length === 0 ? 1 : Math.max(...sessions.map((s) => s.orderIndex)) + 1;
    const res = await fetch("/api/session-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        moduleId: newSessionModule || null,
        orderIndex: nextOrder,
        title: form.title,
        notes: "",
        materialUrls,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setForm({ title: "", moduleId: "" });
    setMaterialUrls([]);
    setNewSessionModule("");
    setMsg("Session created");
    load();
  }

  async function moveSession(sessionId: string, moduleId: string) {
    const res = await fetch("/api/session-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, moduleId: moduleId || null }),
    });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  if (!me) return null;
  if (!courseId) return <Layout role={me.role} name={me.fullName}><p className="text-gray-500">Loading…</p></Layout>;

  const sessionsByModule: Record<string, Session[]> = {};
  const standaloneSessions: Session[] = [];
  sessions.forEach((s) => {
    if (s.moduleId) {
      (sessionsByModule[s.moduleId] ||= []).push(s);
    } else {
      standaloneSessions.push(s);
    }
  });

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Manage Course</h1>

      {/* ── Create Session ── */}
      <form onSubmit={createSession} className="mb-6 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Add Session</h2>
        <input
          placeholder="Session title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />
        <select
          value={newSessionModule}
          onChange={(e) => setNewSessionModule(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Standalone (no module)</option>
          {modules.map((m) => (
            <option key={m._id} value={m._id}>
              Module {m.orderIndex}: {m.title}
            </option>
          ))}
        </select>
        <FileUploader
          signatureUrl={`/api/upload-material?courseId=${courseId}&sessionId=new`}
          onUploaded={(url) => setMaterialUrls((u) => [...u, url])}
          label="Attach material"
        />
        {materialUrls.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-gray-600">
            {materialUrls.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        )}
        <button disabled={busy} className="mt-4 rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? "Creating…" : "Create Session"}
        </button>
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
      </form>

      {/* ── Modules ── */}
      <div className="mb-6 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Modules ({modules.length})</h2>

        <div className="mb-4 space-y-2 rounded border p-3 bg-gray-50">
          <input
            placeholder="Module title"
            value={moduleForm.title}
            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            rows={2}
            value={moduleForm.description}
            onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <button
            onClick={createModule}
            disabled={busy}
            className="rounded bg-brand-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            + Create module
          </button>
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-gray-500">No modules yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {modules.map((m) => {
              const inModule = sessionsByModule[m._id] || [];
              return (
                <li key={m._id} className="rounded border">
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{m.orderIndex}</span>
                      <span className="font-medium">{m.title}</span>
                      <span className="text-xs text-gray-500">({inModule.length} sessions)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => moveModule(m._id, "up")}
                        disabled={m.orderIndex === Math.min(...modules.map((x) => x.orderIndex))}
                        className="rounded border px-1.5 py-0.5 disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveModule(m._id, "down")}
                        disabled={m.orderIndex === Math.max(...modules.map((x) => x.orderIndex))}
                        className="rounded border px-1.5 py-0.5 disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => renameModule(m._id, m.title)}
                        className="rounded border px-2 py-0.5 text-brand-600"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteModule(m._id)}
                        className="rounded border px-2 py-0.5 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {m.description && (
                    <p className="px-3 pt-2 text-xs text-gray-600">{m.description}</p>
                  )}
                  {inModule.length === 0 ? (
                    <p className="px-3 py-2 text-xs italic text-gray-500">No sessions in this module.</p>
                  ) : (
                    <ul className="divide-y border-t">
                      {inModule.map((s) => (
                        <li key={s._id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>
                            <span className="text-xs text-gray-500">#{s.orderIndex}</span> {s.title}
                          </span>
                          <SessionMoveSelect
                            session={s}
                            modules={modules}
                            onMove={moveSession}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Standalone Sessions ── */}
      <div className="rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Standalone Sessions ({standaloneCount})</h2>
        {standaloneSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No standalone sessions.</p>
        ) : (
          <ul className="divide-y">
            {standaloneSessions.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="text-xs text-gray-500">#{s.orderIndex}</span> {s.title}
                </span>
                <SessionMoveSelect session={s} modules={modules} onMove={moveSession} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

function SessionMoveSelect({
  session,
  modules,
  onMove,
}: {
  session: Session;
  modules: Module[];
  onMove: (sessionId: string, moduleId: string) => void;
}) {
  if (modules.length === 0) return null;
  return (
    <select
      value={session.moduleId || ""}
      onChange={(e) => onMove(session._id, e.target.value)}
      className="rounded border px-2 py-1 text-xs"
      title="Move to module"
    >
      <option value="">Standalone</option>
      {modules.map((m) => (
        <option key={m._id} value={m._id}>
          Module {m.orderIndex}: {m.title}
        </option>
      ))}
    </select>
  );
}
