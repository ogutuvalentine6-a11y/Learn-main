import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";
import { FileIcon } from "@/components/layout/icons";

const FILE_TYPES = [
  { ext: "pdf", label: "PDF" },
  { ext: "docx", label: "DOCX" },
  { ext: "doc", label: "DOC" },
  { ext: "pptx", label: "PPTX" },
  { ext: "xlsx", label: "XLSX" },
  { ext: "txt", label: "TXT" },
  { ext: "md", label: "MD" },
] as const;

interface Resource {
  _id: string;
  title?: string;
  fileName?: string;
  fileType?: string;
  mimeType?: string;
  size?: number;
  description?: string;
  fileUrl?: string;
  url?: string;
  courseId?: string;
  courseName?: string;
  uploadedAt?: string;
  createdAt?: string;
}

function fileExt(r: Resource): string {
  const raw = r.fileType || r.mimeType || r.fileName || "";
  const fromSlash = raw.split("/").pop() || "";
  const fromDot = (r.fileName || "").split(".").pop() || "";
  return (fromSlash || fromDot || "file").toLowerCase().replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx").replace("vnd.openxmlformats-officedocument.presentationml.presentation", "pptx").replace("vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
}

function fileLabel(ext: string): string {
  const found = FILE_TYPES.find((t) => t.ext === ext);
  return found ? found.label : ext.toUpperCase().slice(0, 5);
}

function formatSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return Math.round(bytes / 1024) + " KB";
}

function formatDate(s?: string): string | null {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return null; }
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const endpoints = ["/api/resources", "/api/public/resources"];
      for (const url of endpoints) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            const d = await r.json();
            const list = Array.isArray(d) ? d : d?.items || [];
            if (!cancelled) {
              setResources(list);
              setLoading(false);
            }
            return;
          }
        } catch {}
      }
      if (!cancelled) {
        setErr("Could not load resources. Sign in to access course materials.");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const availableTypes = useMemo(() => {
    const set = new Set(resources.map((r) => fileExt(r)));
    return FILE_TYPES.filter((t) => set.has(t.ext));
  }, [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== "All" && fileExt(r) !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.fileName || "").toLowerCase().includes(q) ||
        (r.courseName || "").toLowerCase().includes(q)
      );
    });
  }, [resources, query, typeFilter]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        <section className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Learning Resources</h1>
            <p className="mt-3 text-lg text-fg-muted max-w-2xl">
              PDFs, notes, study guides, presentations, and downloadable materials from across the platform.
            </p>
            <div className="mt-8 space-y-4">
              <input
                type="search"
                placeholder="Search by title, course, or filename…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full max-w-xl px-4 py-3 rounded-lg border border-border bg-surface text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-600"
                aria-label="Search resources"
              />
              {availableTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTypeFilter("All")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      typeFilter === "All"
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-surface text-fg border-border hover:border-brand-600"
                    }`}
                  >
                    All
                  </button>
                  {availableTypes.map((t) => (
                    <button
                      key={t.ext}
                      onClick={() => setTypeFilter(t.ext)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        typeFilter === t.ext
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-surface text-fg border-border hover:border-brand-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-lg border border-border p-5 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-2 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-2 rounded w-3/4" />
                        <div className="h-3 bg-surface-2 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : err ? (
              <div className="text-center py-16 bg-surface rounded-xl border border-border">
                <div className="flex justify-center"><FileIcon size={48} /></div>
                <p className="mt-4 text-lg text-fg-muted max-w-xl mx-auto">{err}</p>
                <Link href="/login" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">Sign in</Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-xl border border-border">
                <div className="flex justify-center"><FileIcon size={48} /></div>
                <p className="mt-4 text-lg text-fg-muted">
                  {resources.length === 0 ? "No learning resources published yet." : "No resources match your filter."}
                </p>
                {resources.length > 0 && (
                  <button onClick={() => { setQuery(""); setTypeFilter("All"); }} className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md border border-border text-fg font-medium hover:bg-surface-2">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-fg-muted">
                  {filtered.length} resource{filtered.length === 1 ? "" : "s"}
                  {typeFilter !== "All" && ` · ${fileLabel(typeFilter)}`}
                  {query && ` · matching "${query}"`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((r) => {
                    const ext = fileExt(r);
                    const size = formatSize(r.size);
                    const date = formatDate(r.uploadedAt || r.createdAt);
                    const href = r.fileUrl || r.url || "#";
                    return (
                      <a
                        key={r._id}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="group bg-surface rounded-lg border border-border p-5 hover:shadow-md hover:border-brand-600 hover:-translate-y-1 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0 font-bold text-[10px]">
                            {fileLabel(ext)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-fg text-sm line-clamp-2 group-hover:text-brand-600 transition-colors">
                              {r.title || r.fileName || "Untitled resource"}
                            </h3>
                            {r.description && (
                              <p className="mt-1 text-xs text-fg-muted line-clamp-2">{r.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted flex-wrap">
                              {size && <span>{size}</span>}
                              {r.courseName && <span className="text-brand-600">· {r.courseName}</span>}
                              {date && <span>· {date}</span>}
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <FooterMega />
    </>
  );
}
