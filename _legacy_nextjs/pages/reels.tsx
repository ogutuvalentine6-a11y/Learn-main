import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FileUploader from "@/components/FileUploader";

interface Reel {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  ownerName: string;
  ownerRole: string;
  status: string;
  views: number;
  likes: number;
}

const CATEGORIES = [
  "General", "Programming", "Mathematics", "Science",
  "Business", "Engineering", "Languages", "Career", "Study Skills",
];

export default function ReelsPage() {
  const [me, setMe] = useState<any>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  // Upload form
  const [uploaded, setUploaded] = useState<{ url: string; publicId: string } | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "General", tags: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  async function load() {
    setLoading(true);
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    const data = await fetch(`/api/reels${params}`).then((r) => (r.ok ? r.json() : []));
    setReels(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [category]);

  async function toggleLike(id: string) {
    if (!me) return;
    const res = await fetch(`/api/reels/${id}/like`, { method: "POST" });
    if (!res.ok) return;
    const { liked } = await res.json();
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.add(id);
      else next.delete(id);
      return next;
    });
    load();
  }

  async function save() {
    if (!uploaded) return setMsg("Upload a video first");
    if (!form.title) return setMsg("Title required");
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        videoUrl: uploaded.url,
        publicId: uploaded.publicId,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Save failed");
    }
    setUploaded(null);
    setForm({ title: "", description: "", category: "General", tags: "" });
    setMsg("Submitted. " + (me?.role === "student" ? "Awaiting admin review." : "Live now."));
    load();
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">Educational Reels</h1>
            <div className="flex flex-wrap gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {me && (
                <button
                  onClick={() => setShowUpload((s) => !s)}
                  className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
                >
                  {showUpload ? "Close uploader" : "+ Upload reel"}
                </button>
              )}
            </div>
          </div>

          {showUpload && me && (
            <section className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="rounded border border-gray-700 bg-black px-3 py-2 text-sm text-white"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded border border-gray-700 bg-black px-3 py-2 text-sm text-white"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <textarea
                  placeholder="Description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded border border-gray-700 bg-black px-3 py-2 text-sm text-white md:col-span-2"
                />
                <input
                  placeholder="Tags (comma-separated)"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="rounded border border-gray-700 bg-black px-3 py-2 text-sm text-white md:col-span-2"
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <FileUploader
                  signatureUrl="/api/reels/upload-signature"
                  resourceType="video"
                  label={uploaded ? "Replace video" : "Choose video"}
                  onUploaded={(url, publicId) => {
                    setUploaded({ url, publicId });
                    setMsg("Video uploaded — click Save reel.");
                  }}
                />
                <button
                  onClick={save}
                  disabled={!uploaded || busy}
                  className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save reel"}
                </button>
                {uploaded && <span className="text-xs text-green-400">✓ Ready</span>}
              </div>
              {msg && <p className="mt-2 text-sm text-gray-300">{msg}</p>}
            </section>
          )}

          {loading ? (
            <p className="mt-8 text-center text-gray-400">Loading…</p>
          ) : reels.length === 0 ? (
            <p className="mt-8 rounded border border-dashed border-gray-700 p-10 text-center text-gray-400">
              No reels yet. Be the first to upload one.
            </p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-6">
              {reels.map((r) => (
                <ReelCard
                  key={r._id}
                  reel={r}
                  liked={likedSet.has(r._id)}
                  onLike={() => toggleLike(r._id)}
                  canLike={!!me}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ReelCard({
  reel,
  liked,
  onLike,
  canLike,
}: {
  reel: Reel;
  liked: boolean;
  onLike: () => void;
  canLike: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  // Play when card becomes mostly visible; pause when out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.intersectionRatio > 0.6) {
          video.play().then(() => setPlaying(true)).catch(() => {});
          // fire view counter once
          fetch(`/api/reels/${reel._id}/view`, { method: "POST" }).catch(() => {});
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reel._id]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: "9 / 16" }}
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl || undefined}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) { v.play(); setPlaying(true); }
          else { v.pause(); setPlaying(false); }
        }}
      />

      {/* Overlay info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
        <p className="text-xs uppercase tracking-wider text-gray-300">{reel.category}</p>
        <h2 className="mt-1 text-lg font-bold">{reel.title}</h2>
        {reel.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-200">{reel.description}</p>
        )}
        <p className="mt-2 text-xs text-gray-300">
          by {reel.ownerName} · {reel.views} views
        </p>
      </div>

      {/* Like button */}
      <button
        onClick={onLike}
        disabled={!canLike}
        className="absolute right-3 bottom-3 flex flex-col items-center rounded-full bg-black/50 p-3 text-white backdrop-blur disabled:opacity-50"
      >
        <span className="text-xl">{liked ? "❤" : "♡"}</span>
        <span className="text-xs">{reel.likes}</span>
      </button>

      {!playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/80">
          <span className="text-4xl">▶</span>
        </div>
      )}

      {reel.status !== "approved" && (
        <div className="absolute top-3 left-3 rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-medium text-black">
          {reel.status}
        </div>
      )}
    </div>
  );
}
