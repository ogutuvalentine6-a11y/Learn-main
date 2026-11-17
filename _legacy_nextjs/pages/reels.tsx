import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VideoIcon } from "@/components/layout/icons";
import Navbar from "@/components/Navbar";

const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@khanacademy";
const YOUTUBE_CHANNEL_NAME = "Khan Academy";

interface Reel {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category?: string;
  durationSeconds?: number;
  views?: number;
  likes?: number;
  tags?: string[];
  createdAt?: string;
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function thumbnailFor(reel: Reel): string | null {
  if (reel.thumbnailUrl) return reel.thumbnailUrl;

  const youtubeId = extractYouTubeId(reel.videoUrl);
  return youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : null;
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [activeReel, setActiveReel] = useState<Reel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVideos() {
      try {
        const response = await fetch("/api/reels?limit=100", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load the educational video library.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The video API returned an unexpected response.");
        }

        if (!cancelled) setReels(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load videos."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeReel) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveReel(null);
    }

    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [activeReel]);

  function openVideo(reel: Reel) {
    setActiveReel(reel);

    // View tracking should never prevent playback.
    fetch(`/api/reels/${reel._id}/view`, {
      method: "POST",
    }).catch(() => undefined);
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(reels.map((reel) => reel.category || "General"))
    ).sort();
  }, [reels]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return reels.filter((reel) => {
      if (category !== "All" && (reel.category || "General") !== category) {
        return false;
      }

      if (!search) return true;

      return (
        (reel.title || "").toLowerCase().includes(search) ||
        (reel.description || "").toLowerCase().includes(search) ||
        (reel.tags || []).some((tag: string) =>
          tag.toLowerCase().includes(search)
        )
      );
    });
  }, [reels, query, category]);

  const featured = useMemo(
    () => reels.slice(0, 3),
    [reels]
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-bg font-sans text-fg">
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                  Learn educational resources
                </p>
                <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">
                  Video Library
                </h1>
                <p className="mt-3 max-w-2xl text-lg text-fg-muted">
                  Explore lessons in programming, mathematics, science,
                  business, engineering, technology and career development.
                </p>
              </div>

              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700"
              >
                <span aria-hidden="true">▶</span>
                Visit {YOUTUBE_CHANNEL_NAME}
              </a>
            </div>

            <div className="mt-8 space-y-4">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search videos by title, description or topic..."
                aria-label="Search videos"
                className="w-full max-w-xl rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:ring-2 focus:ring-brand-600"
              />

              <div className="flex flex-wrap gap-2">
                {["All", ...categories].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      category === item
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-border bg-surface text-fg hover:border-brand-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {!loading && !error && featured.length > 0 && category === "All" && !query && (
          <section className="bg-surface py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold">Recently published</h2>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {featured.map((reel) => {
                  const thumbnail = thumbnailFor(reel);

                  return (
                    <button
                      type="button"
                      key={reel._id}
                      onClick={() => openVideo(reel)}
                      className="group overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-video bg-surface-2">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-fg-muted">
                            <VideoIcon size={36} />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-2xl text-brand-600">
                            ▶
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="line-clamp-2 font-semibold">
                          {reel.title || "Untitled video"}
                        </h3>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-600">
                          {reel.category || "General"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-xl border border-border bg-surface"
                  >
                    <div className="aspect-video bg-surface-2" />
                    <div className="space-y-3 p-4">
                      <div className="h-4 w-3/4 rounded bg-surface-2" />
                      <div className="h-3 w-1/2 rounded bg-surface-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-border bg-surface px-5 py-16 text-center">
                <VideoIcon size={44} />
                <p className="mt-4 text-fg-muted">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-white"
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface px-5 py-16 text-center">
                <VideoIcon size={44} />
                <h2 className="mt-4 text-lg font-semibold">
                  {reels.length === 0
                    ? "No educational videos published yet."
                    : "No videos match your search."}
                </h2>
                <p className="mt-2 text-sm text-fg-muted">
                  {reels.length === 0
                    ? "Published lessons will appear here."
                    : "Try another search term or clear your category filter."}
                </p>
                {reels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                    }}
                    className="mt-4 rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-fg-muted">
                  Showing {filtered.length} video{filtered.length === 1 ? "" : "s"}
                </p>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((reel) => {
                    const thumbnail = thumbnailFor(reel);
                    const duration = formatDuration(reel.durationSeconds);

                    return (
                      <button
                        type="button"
                        key={reel._id}
                        onClick={() => openVideo(reel)}
                        className="group overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-video overflow-hidden bg-surface-2">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-fg-muted">
                              <VideoIcon size={34} />
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl text-brand-600 opacity-90">
                              ▶
                            </span>
                          </div>

                          {duration && (
                            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs text-white">
                              {duration}
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="line-clamp-2 font-semibold text-fg">
                            {reel.title || "Untitled video"}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm text-fg-muted">
                            {reel.description || "Educational lesson"}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                              {reel.category || "General"}
                            </span>
                            <span className="text-xs text-fg-muted">
                              {reel.views || 0} views
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {activeReel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6"
            onClick={() => setActiveReel(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Educational video player"
          >
            <div
              className="relative w-full max-w-6xl overflow-hidden rounded-xl bg-black"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 bg-gray-950 px-4 py-3 text-white">
                <h2 className="line-clamp-1 text-sm font-semibold sm:text-base">
                  {activeReel.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveReel(null)}
                  aria-label="Close video"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="aspect-video w-full bg-black">
                {extractYouTubeId(activeReel.videoUrl) ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(activeReel.videoUrl)}?autoplay=1&rel=0`}
                    title={activeReel.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <video
                    key={activeReel._id}
                    src={activeReel.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                  >
                    Your browser does not support HTML video playback.
                  </video>
                )}
              </div>

              <div className="bg-gray-950 px-4 py-3 text-white">
                <p className="text-sm text-gray-300">
                  {activeReel.description || "Educational video"}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {activeReel.category || "General"}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
