import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VideoIcon } from "@/components/layout/icons";
import Navbar from "@/components/Navbar";

// ──────── CONFIG — replace with YOUR channel when ready ────────
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@khanacademy";
const YOUTUBE_CHANNEL_NAME = "Khan Academy";
// ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Programming",
  "Mathematics",
  "Science",
  "Business",
  "Engineering",
  "Career and Study Skills",
] as const;
type Category = (typeof CATEGORIES)[number] | "All";

interface Reel {
  _id: string;
  title?: string;
  caption?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  duration?: number;
  isFeatured?: boolean;
  createdAt?: string;
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function thumbnailFor(reel: Reel): string | null {
  if (reel.thumbnailUrl) return reel.thumbnailUrl;
  const id = extractYouTubeId(reel.videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const endpoints = ["/api/reels", "/api/public/reels", "/api/reels?status=published"];
      for (const url of endpoints) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            const d = await r.json();
            const list = Array.isArray(d) ? d : d?.items || [];
            if (!cancelled) {
              setReels(list);
              setLoading(false);
            }
            return;
          }
        } catch {}
      }
      if (!cancelled) {
        setErr(
          "Could not load videos. If the endpoint requires authentication, please sign in."
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeVideoId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveVideoId(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeVideoId]);

  const filtered = useMemo(() => {
    return reels.filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.caption || "").toLowerCase().includes(q)
      );
    });
  }, [reels, query, category]);

  const featured = useMemo(() => {
    const flagged = reels.filter((r) => r.isFeatured);
    if (flagged.length >= 3) return flagged.slice(0, 3);
    return [...reels]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 3);
  }, [reels]);

  const visibleCategories = useMemo(() => {
    const set = new Set(reels.map((r) => r.category).filter(Boolean));
    return CATEGORIES.filter((c) => set.has(c));
  }, [reels]);

  return (
    <>
      <Navbar />
    <div className="min-h-screen bg-bg text-fg font-sans">
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Video Library</h1>
              <p className="mt-3 text-lg text-fg-muted max-w-2xl">
                Educational videos across Programming, Mathematics, Science, Business,
                Engineering, and Career skills — curated for Learn students.
              </p>
            </div>
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex-shrink-0"
            >
              <span className="text-lg">▶</span>
              Visit {YOUTUBE_CHANNEL_NAME} on YouTube
            </a>
          </div>

          <div className="mt-8 space-y-4">
            <input
              type="search"
              placeholder="Search videos by title or topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-xl px-4 py-3 rounded-lg border border-border bg-surface text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Search videos"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("All")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  category === "All"
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface text-fg border-border hover:border-brand-600"
                }`}
              >
                All
              </button>
              {visibleCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === c
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-surface text-fg border-border hover:border-brand-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && category === "All" && !query && (
        <section className="py-12 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold text-fg">Featured</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((r) => {
                const thumb = thumbnailFor(r);
                const ytId = extractYouTubeId(r.videoUrl);
                return (
                  <button
                    key={r._id}
                    onClick={() => ytId && setActiveVideoId(ytId)}
                    disabled={!ytId}
                    className="group relative bg-bg rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow text-left disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <div className="relative aspect-video bg-surface-2">
                      {thumb ? (
                        <img src={thumb} alt={r.title || ""} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-fg-muted">
                          <VideoIcon size={32} />
                        </div>
                      )}
                      {ytId && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-brand-600 text-2xl">
                            ▶
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-fg line-clamp-2">{r.title || r.caption || "Untitled video"}</h3>
                      {r.category && <p className="mt-1 text-xs text-brand-600 uppercase tracking-wide font-medium">{r.category}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden animate-pulse">
                  <div className="w-full aspect-video bg-surface-2" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-surface-2 rounded w-3/4" />
                    <div className="h-3 bg-surface-2 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : err ? (
            <div className="text-center py-16 bg-surface rounded-xl border border-border">
              <div className="flex justify-center"><VideoIcon size={48} /></div>
              <p className="mt-4 text-lg text-fg-muted max-w-xl mx-auto">{err}</p>
              <Link href="/login" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">Sign in</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-xl border border-border">
              <div className="flex justify-center"><VideoIcon size={48} /></div>
              <p className="mt-4 text-lg text-fg-muted">
                {reels.length === 0 ? "No videos published yet." : "No videos match your filter."}
              </p>
              {reels.length === 0 ? (
                <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                  Visit our YouTube channel
                </a>
              ) : (
                <button onClick={() => { setQuery(""); setCategory("All"); }} className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md border border-border text-fg font-medium hover:bg-surface-2">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-fg-muted">
                {filtered.length} video{filtered.length === 1 ? "" : "s"}
                {category !== "All" && ` in ${category}`}
                {query && ` matching "${query}"`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((r) => {
                  const thumb = thumbnailFor(r);
                  const ytId = extractYouTubeId(r.videoUrl);
                  const dur = formatDuration(r.duration);
                  return (
                    <button
                      key={r._id}
                      onClick={() => ytId && setActiveVideoId(ytId)}
                      disabled={!ytId}
                      className="group bg-surface rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      <div className="relative aspect-video bg-surface-2 overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt={r.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-fg-muted"><VideoIcon size={32} /></div>
                        )}
                        {ytId && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-brand-600 text-2xl">▶</div>
                          </div>
                        )}
                        {dur && <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">{dur}</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-fg line-clamp-2 group-hover:text-brand-600 transition-colors">
                          {r.title || r.caption || "Untitled video"}
                        </h3>
                        {r.category && <p className="mt-2 text-xs text-brand-600 uppercase tracking-wide font-medium">{r.category}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {activeVideoId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActiveVideoId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Video player"
        >
          <div
            className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
              title="Video lesson"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <button
              onClick={() => setActiveVideoId(null)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 text-white hover:bg-black/90 flex items-center justify-center text-xl font-bold"
              aria-label="Close video"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
