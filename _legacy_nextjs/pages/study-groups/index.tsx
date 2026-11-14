import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Group {
  _id: string;
  name: string;
  description: string;
  ownerName: string;
  memberIds: string[];
  maxMembers: number;
  courseId: string | null;
}

export default function StudyGroups() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", courseId: "", maxMembers: 10 });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth-me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (!u) router.push("/login"); else setMe(u); });
  }, [router]);

  async function load() {
    const url = tab === "mine"
      ? "/api/study-groups?mine=true"
      : "/api/study-groups";
    const data = await fetch(url).then((r) => (r.ok ? r.json() : []));
    setGroups(Array.isArray(data) ? data : []);
  }

  useEffect(() => { if (me) load(); }, [me, tab]);

  async function create() {
    if (!form.name) return setMsg("Name required");
    setBusy(true);
    const res = await fetch("/api/study-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        courseId: form.courseId || null,
        maxMembers: Number(form.maxMembers),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setShowCreate(false);
    setForm({ name: "", description: "", courseId: "", maxMembers: 10 });
    load();
  }

  async function join(id: string) {
    const res = await fetch(`/api/study-groups/${id}/join`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  async function leave(id: string) {
    const res = await fetch(`/api/study-groups/${id}/leave`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.error || "Failed");
    }
    load();
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Study Groups</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {showCreate ? "Close" : "+ New group"}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 space-y-3 rounded bg-white p-5 shadow">
          <input
            placeholder="Group name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max members"
            value={form.maxMembers}
            onChange={(e) => setForm({ ...form, maxMembers: Number(e.target.value) })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={create}
            disabled={busy}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create group"}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("all")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "all" ? "bg-brand-600 text-white" : "border text-gray-700"}`}
        >
          All groups
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "mine" ? "bg-brand-600 text-white" : "border text-gray-700"}`}
        >
          My groups
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.length === 0 ? (
          <p className="col-span-full rounded border border-dashed p-6 text-center text-gray-500">
            No groups yet.
          </p>
        ) : (
          groups.map((g) => {
            const isMember = g.memberIds.includes(me.id);
            const isFull = g.memberIds.length >= g.maxMembers;
            return (
              <div key={g._id} className="rounded bg-white p-5 shadow">
                <h3 className="font-semibold">{g.name}</h3>
                {g.description && <p className="mt-1 text-sm text-gray-600">{g.description}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  Owner: {g.ownerName} · {g.memberIds.length}/{g.maxMembers} members
                </p>
                <div className="mt-3">
                  {isMember ? (
                    <button
                      onClick={() => leave(g._id)}
                      className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-700"
                    >
                      Leave
                    </button>
                  ) : (
                    <button
                      onClick={() => join(g._id)}
                      disabled={isFull}
                      className="rounded bg-brand-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {isFull ? "Full" : "Join"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
