import { FormEvent, useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import FileUploader from "@/components/FileUploader";

interface Reel {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category?: string;
  durationSeconds?: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  views?: number;
  createdAt?: string;
}

interface User {
  fullName: string;
  email: string;
  role: string;
}

const CATEGORIES = [
  "General",
  "Programming",
  "Mathematics",
  "Science",
  "Business",
  "Engineering",
  "Career and Study Skills",
  "Technology",
];

export default function StaffVideosPage() {
  const [me, setMe] = useState<User | null>(null);
  const [videos, setVideos] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("0");
  const [videoUrl, setVideoUrl] = useState("");
  const [publicId, setPublicId] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const loadVideos = useCallback(async () => {
    const response = await fetch("/api/reels?mine=true&limit=100", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not load your videos.");
    }

    const data = await response.json();
    setVideos(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialise() {
      try {
        const response = await fetch("/api/auth-me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.href = "/login?next=/staff/videos";
          return;
        }

        const user: User = await response.json();

        if (user.role !== "staff") {
          window.location.href =
            user.role === "admin" ? "/admin/dashboard" : "/login";
          return;
        }

        if (active) setMe(user);
        await loadVideos();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load the video dashboard."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialise();

    return () => {
      active = false;
    };
  }, [loadVideos]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!videoUrl || !publicId) {
      setError("Upload a video file before publishing.");
      return;
    }

    if (title.trim().length < 2) {
      setError("The video title must contain at least 2 characters.");
      return;
    }

    const duration = Number(durationSeconds);

    if (!Number.isFinite(duration) || duration < 0) {
      setError("Enter a valid video duration in seconds.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/reels", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          publicId,
          thumbnailUrl: thumbnailUrl.trim(),
          durationSeconds: Math.floor(duration),
          category,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          courseId: courseId.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : "The video could not be published.";
        throw new Error(detail);
      }

      setTitle("");
      setDescription("");
      setCategory("General");
      setTags("");
      setCourseId("");
      setDurationSeconds("0");
      setVideoUrl("");
      setPublicId("");
      setThumbnailUrl("");

      setNotice("Your video has been published successfully.");
      await loadVideos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected upload error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteVideo(video: Reel) {
    const confirmed = window.confirm(
      `Delete "${video.title}" from your video library?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/reels/${video._id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Could not delete this video.");
      }

      setVideos((current) => current.filter((item) => item._id !== video._id));
      setNotice("Video record deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  if (loading) {
    return (
      <Layout role="staff">
        <p className="text-gray-500">Loading video dashboard…</p>
      </Layout>
    );
  }

  return (
    <Layout role="staff" name={me?.fullName}>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Educational Videos</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload lessons and manage the videos you have published.
            </p>
          </div>

          <a
            href="/reels"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            View public library
          </a>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {notice}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Publish a video</h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload the video to Cloudinary, complete its details, then publish it.
              Staff videos are automatically approved.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Video file
              </label>
              <FileUploader
                signatureUrl="/api/reels/upload-signature"
                resourceType="video"
                accept="video/*"
                maxSizeMB={500}
                label={videoUrl ? "Upload a different video" : "Choose video file"}
                onUploaded={(url, id) => {
                  setVideoUrl(url);
                  setPublicId(id);
                  setError("");
                }}
              />

              {videoUrl && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <p className="font-medium">Video uploaded successfully.</p>
                  <p className="mt-1 break-all text-xs">{publicId}</p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block underline"
                  >
                    Preview uploaded video
                  </a>
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="video-title" className="mb-2 block text-sm font-medium text-gray-700">
                  Video title *
                </label>
                <input
                  id="video-title"
                  required
                  minLength={2}
                  maxLength={140}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Introduction to Python programming"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label htmlFor="video-category" className="mb-2 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="video-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="video-description" className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="video-description"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explain what students will learn in this lesson..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {description.length}/1000
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="video-tags" className="mb-2 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  id="video-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="python, programming, beginners"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Separate tags with commas.</p>
              </div>

              <div>
                <label htmlFor="video-course" className="mb-2 block text-sm font-medium text-gray-700">
                  Course ID (optional)
                </label>
                <input
                  id="video-course"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  placeholder="Enter an existing course ID"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="video-duration" className="mb-2 block text-sm font-medium text-gray-700">
                  Duration in seconds
                </label>
                <input
                  id="video-duration"
                  type="number"
                  min="0"
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="video-thumbnail" className="mb-2 block text-sm font-medium text-gray-700">
                  Thumbnail URL (optional)
                </label>
                <input
                  id="video-thumbnail"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={saving || !videoUrl}
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Publishing…" : "Publish educational video"}
              </button>
              <span className="text-xs text-gray-500">
                Upload a video before publishing.
              </span>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My uploaded videos</h2>
              <p className="text-sm text-gray-500">
                {videos.length} video{videos.length === 1 ? "" : "s"} in your account
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadVideos().catch((err) => setError(err.message))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <h3 className="font-semibold text-gray-800">No videos uploaded yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your published videos will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((video) => (
                <article key={video._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="aspect-video w-full bg-gray-100 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-100 text-sm text-gray-500">
                      Video
                    </div>
                  )}

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{video.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                          video.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : video.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {video.status}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm text-gray-500">
                      {video.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{video.category || "General"}</span>
                      <span>{video.views || 0} views</span>
                    </div>

                    {video.rejectionReason && (
                      <p className="text-xs text-red-600">{video.rejectionReason}</p>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        Open video
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteVideo(video)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
