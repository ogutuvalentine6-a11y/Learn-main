import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FileUploader from "@/components/FileUploader";

interface Resource {
  _id: string;
  title: string;
  description: string;
  url: string;
  kind: string;
  format: string;
  category: string;
  ownerName: string;
  visibility: string;
  status: string;
  downloads: number;
  createdAt: string;
}

const CATEGORIES = ["General", "Programming", "Mathematics", "Science", "Business", "Engineering", "Languages", "Career", "Study Skills"];

export default function ResourcesPage() {
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<Resource[]>([]);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ q: "", category: "", kind: "" });

  // Upload form
  const [uploaded, setUploaded] = useState<{ url: string; publicId: string } | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "General", visibility: "private", courseId: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.category) params.set("category", filter.category);
    if (filter.kind) params.set("kind", filter.kind);
    if (tab === "mine") params.set("mine", "true");
    const data = await fetch(`/api/resources?${params}`).then((r) => (r.ok ? r.json() : []));
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab, filter]);

  async function save() {
    if (!uploaded) return setMsg("Upload a file first");
    if (!form.title) return setMsg("Title is required");
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        url: uploaded.url,
        publicId: uploaded.publicId,
        format: uploaded.url.split(".").pop()?.split("?")[0] || "",
        category: form.category,
        courseId: form.courseId || null,
        visibility: form.visibility,
        kind: uploaded.url.match(/\.(mp4|webm|mov)$/i) ? "video"
            : uploaded.url.match(/\.(mp3|wav|m4a)$/i) ? "audio"
            : uploaded.url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? "image"
            : "document",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Save failed");
    }
    setUploaded(null);
    setForm({ title: "", description: "", category: "General", visibility: "private", courseId: "" });
    setMsg("Resource submitted.");
    load();
  }

  async function download(id: string) {
    const res = await fetch(`/api/resources/${id}/download`, { method: "POST" });
    if (!res.ok) return setMsg("Download failed");
    const { url } = await res.json();
    window.open(url, "_blank");
    load();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Resource Library</h1>
        <p className="mt-2 text-gray-600">Educational materials shared by students and instructors.</p>

        {me && (
          <section className="mt-8 rounded-lg border bg-gray-50 p-5">
            <h2 className="mb-3 font-semibold">Upload a resource</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea placeholder="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border px-3 py-2 text-sm md:col-span-2" />
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="rounded border px-3 py-2 text-sm">
                <option value="private">Private (only me)</option>
                <option value="course">Course-scoped</option>
                <option value="public">Public (needs review)</option>
              </select>
              {form.visibility === "course" && (
                <input placeholder="Course ID" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <FileUploader
                signatureUrl="/api/resources/upload-signature"
                resourceType="auto"
                label={uploaded ? "Replace file" : "Choose file"}
                onUploaded={(url, publicId) => { setUploaded({ url, publicId }); setMsg("File uploaded — now click Save."); }}
              />
              <button onClick={save} disabled={!uploaded || busy} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {busy ? "Saving…" : "Save resource"}
              </button>
              {uploaded && <span className="text-xs text-green-700">✓ File ready</span>}
            </div>
            {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex rounded border">
            <button onClick={() => setTab("all")} className={`px-3 py-1.5 text-sm ${tab === "all" ? "bg-brand-600 text-white" : "text-gray-700"}`}>All</button>
            {me && <button onClick={() => setTab("mine")} className={`px-3 py-1.5 text-sm ${tab === "mine" ? "bg-brand-600 text-white" : "text-gray-700"}`}>Mine</button>}
          </div>
          <input placeholder="Search…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className="rounded border px-3 py-1.5 text-sm" />
          <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="rounded border px-3 py-1.5 text-sm">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} className="rounded border px-3 py-1.5 text-sm">
            <option value="">All types</option>
            <option value="document">Document</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">No resources found.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <div key={r._id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{r.category}</span>
                  {r.status !== "approved" && (
                    <span className="text-xs text-yellow-700">{r.status}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                {r.description && <p className="mt-1 flex-1 text-sm text-gray-600">{r.description}</p>}
                <p className="mt-2 text-xs text-gray-500">by {r.ownerName} · {r.downloads} downloads</p>
                <button onClick={() => download(r._id)} className="mt-3 rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
