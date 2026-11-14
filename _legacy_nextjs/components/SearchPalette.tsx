import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

interface Result {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface GroupedResults {
  courses: Result[];
  instructors: Result[];
  resources: Result[];
  reels: Result[];
  jobs: Result[];
}

const GROUP_LABELS: Record<keyof GroupedResults, string> = {
  courses: "Courses",
  instructors: "Instructors",
  resources: "Resources",
  reels: "Reels",
  jobs: "Careers",
};

const GROUP_ICONS: Record<keyof GroupedResults, string> = {
  courses: "📚",
  instructors: "👨‍🏫",
  resources: "📎",
  reels: "🎬",
  jobs: "💼",
};

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const body = await res.json();
          setResults(body.results);
          setActiveIndex(0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // Flatten for keyboard navigation
  const flat: { group: keyof GroupedResults; item: Result }[] = [];
  if (results) {
    (Object.keys(results) as (keyof GroupedResults)[]).forEach((g) => {
      results[g].forEach((item) => flat.push({ group: g, item }));
    });
  }

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flat.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = flat[activeIndex];
        if (target) {
          router.push(target.item.href);
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, activeIndex, onClose, router]);

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses, instructors, resources, reels, careers…"
            className="flex-1 border-0 text-base outline-none placeholder:text-gray-400"
          />
          {loading && <span className="text-xs text-gray-400">…</span>}
          <kbd className="hidden rounded border bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500 md:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!q || q.trim().length < 2 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Type at least 2 characters to search
            </div>
          ) : loading && !results ? (
            <div className="p-6 text-center text-sm text-gray-500">Searching…</div>
          ) : !results || flat.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No results for &ldquo;{q}&rdquo;
            </div>
          ) : (
            (Object.keys(results) as (keyof GroupedResults)[]).map((g) => {
              const items = results[g];
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <div className="border-b bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {GROUP_ICONS[g]} {GROUP_LABELS[g]}
                  </div>
                  {items.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    return (
                      <button
                        key={`${g}-${item.id}`}
                        onClick={() => {
                          router.push(item.href);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIndex(runningIndex)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                          isActive ? "bg-brand-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium text-gray-900">{item.title}</span>
                        <span className="text-xs text-gray-500">{item.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <div className="flex gap-3">
            <span><kbd className="rounded border bg-white px-1">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border bg-white px-1">↵</kbd> open</span>
          </div>
          <span>Powered by Learn</span>
        </div>
      </div>
    </div>
  );
}
