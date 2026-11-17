import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MenuIcon, XIcon, BookIcon, ShieldIcon, ChartIcon,
  VideoIcon, FileIcon, UsersIcon, AwardIcon,
} from "@/components/layout/icons";
import FooterMega from "@/components/FooterMega";

interface PublicStats {
  students?: number;
  courses?: number;
  instructors?: number;
  enrollments?: number;
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  instructorName?: string;
}

interface Reel {
  _id: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  videoUrl?: string;
  category?: string;
  duration?: number;
}

interface Resource {
  _id: string;
  title?: string;
  fileName?: string;
  fileType?: string;
  mimeType?: string;
  size?: number;
}


interface Founder {
  name?: string;
  role?: string;
  bio?: string;
  githubUrl?: string;
  avatarUrl?: string;
}

interface Instructor {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  title?: string;
  avatarUrl?: string;
}

interface CalendarEvent {
  _id: string;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
}

interface HomepageCMS {
  hero?: { title?: string; subtitle?: string; badgeText?: string };
  founder?: Founder;
  cta?: { title?: string; subtitle?: string; primaryLabel?: string; primaryHref?: string };
  announcements?: { text?: string; link?: string; active?: boolean }[];
}

const FALLBACK_IMAGES = [
  "/images/education/hero-classroom.jpg",
  "/images/education/classroom-learning.jpg",
  "/images/education/collaborative-learning.jpg",
  "/images/education/teacher-helping.jpg",
  "/images/education/library-study-support.jpg",
  "/images/education/pexels-max-fischer-5212329.jpg",
];

function courseImage(course: Course, idx: number): string {
  if (course.coverImageUrl) return course.coverImageUrl;
  return FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
}

function formatStat(n: number | undefined): string {
  if (!n || n < 0) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cms, setCms] = useState<HomepageCMS | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelsLoading, setReelsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/public-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setStats(d); })
      .catch(() => {});

    fetch("/api/course-list")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) {
          const list = Array.isArray(d) ? d.slice(0, 6) : [];
          setCourses(list);
          setLoadingCourses(false);
        }
      })
      .catch(() => { if (!cancelled) setLoadingCourses(false); });

    fetch("/api/reels")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) {
          setReels(Array.isArray(d) ? d : []);
          setReelsLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setReelsLoading(false); });

    fetch("/api/resources")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) {
          setResources(Array.isArray(d) ? d : []);
          setResourcesLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setResourcesLoading(false); });

    fetch("/api/instructors")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) {
          setInstructors(Array.isArray(d) ? d : []);
          setInstructorsLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setInstructorsLoading(false); });

    (async () => {
      const fetchEventList = async (url: string): Promise<unknown[]> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return [];

          const data: unknown = await response.json();

          if (Array.isArray(data)) return data;

          if (
            data !== null &&
            typeof data === "object" &&
            "items" in data &&
            Array.isArray(data.items)
          ) {
            return data.items;
          }

          return [];
        } catch {
          return [];
        }
      };

      const [liveItems, academicItems] = await Promise.all([
        fetchEventList("/api/events/upcoming"),
        fetchEventList("/api/academic/calendar/events?upcoming=true"),
      ]);

      const normalizeEvents = (
        items: unknown[],
        source: "live" | "academic"
      ): CalendarEvent[] =>
        items.map((item, index) => {
          const event =
            item !== null && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};

          const rawId = event.id ?? event._id;
          const rawStart =
            event.scheduledAt ?? event.startDate ?? event.startAt;
          const rawEnd = event.endDate ?? event.endAt;

          return {
            _id: `${source}-${String(rawId ?? index)}`,
            title:
              typeof event.title === "string" ? event.title : undefined,
            description:
              typeof event.description === "string"
                ? event.description
                : undefined,
            startAt:
              typeof rawStart === "string" ? rawStart : undefined,
            endAt: typeof rawEnd === "string" ? rawEnd : undefined,
          };
        });

      const combined = [
        ...normalizeEvents(liveItems, "live"),
        ...normalizeEvents(academicItems, "academic"),
      ]
        .filter((event) => event.startAt)
        .sort(
          (a, b) =>
            new Date(a.startAt!).getTime() -
            new Date(b.startAt!).getTime()
        );

      if (!cancelled) {
        setEvents(combined);
        setEventsLoading(false);
      }
    })();

    fetch("/api/homepage-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setCms(d); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const heroTitle = cms?.hero?.title ?? "Learn Without Limits. Build Your Future.";
  const heroSubtitle = cms?.hero?.subtitle ??
    "Structured courses, live classrooms, expert instructors, and measurable progress — one connected learning platform.";
  const founder = cms?.founder;
  const announcements = (cms?.announcements ?? []).filter((a) => a.active !== false);
  const uniqueCategories = Array.from(
    new Set(courses.map((c) => c.category).filter((c): c is string => !!c))
  ).slice(0, 6);
  const totalStats = (stats?.students ?? 0) + (stats?.courses ?? 0) + (stats?.instructors ?? 0);
  const showStats = totalStats > 0;

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      {/* Announcement bar */}
      <div className="bg-brand-800 text-white text-center py-2 px-4 text-sm font-medium">
        🎓 New Autumn cohort now open.{" "}
        <Link href="/courses" className="underline hover:text-brand-200">
          Explore courses →
        </Link>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-2xl font-bold text-brand-800 tracking-tight">
              Learn<span className="text-brand-600">.</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/courses" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">Courses</Link>
              <Link href="/instructors" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">Instructors</Link>
              <Link href="/resources" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">Resources</Link>
              <Link href="/reels" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">Videos</Link>
              <Link href="/about" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">About</Link>
              <Link href="/contact" className="text-sm font-medium text-fg hover:text-brand-600 transition-colors">Contact</Link>
            </nav>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">Sign In</Link>
              <Link href="/register" className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm">
                Get Started
              </Link>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-fg-muted hover:text-fg hover:bg-surface-2"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden bg-surface border-t border-border animate-home-slide-down">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/courses" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">Courses</Link>
              <Link href="/instructors" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">Instructors</Link>
              <Link href="/resources" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">Resources</Link>
              <Link href="/reels" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">Videos</Link>
              <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">About</Link>
              <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium text-fg hover:bg-surface-2">Contact</Link>
              <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-brand-600 hover:bg-surface-2 mt-4 border-t border-border pt-4">Sign In</Link>
              <Link href="/register" className="block px-3 py-2 rounded-md text-base font-medium text-white bg-brand-600 hover:bg-brand-700 mt-2 text-center">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
              <div className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-fg sm:text-5xl md:text-6xl animate-home-fade-in-up">
                    <span className="block xl:inline">Empowering Learning.</span>{" "}
                    <span className="block text-brand-600 xl:inline">Building Knowledge.</span>
                  </h1>
                  <p className="mt-3 text-base text-fg-muted sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0 animate-home-fade-in" style={{ animationDelay: "0.15s" }}>
                    {heroSubtitle}
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start sm:gap-3">
                    <Link
                      href="/courses"
                      className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 md:py-4 md:text-lg transition-colors"
                    >
                      Explore Courses
                    </Link>
                    <Link
                      href="/register"
                      className="mt-3 sm:mt-0 inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-brand-700 bg-brand-50 hover:bg-brand-100 md:py-4 md:text-lg transition-colors"
                    >
                      Create Account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <img
              className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
              src="/images/education/hero-classroom.jpg"
              alt="Students learning in a classroom"
            />
          </div>
        </section>

        {/* Stats — only if real data exists */}
        {showStats && (
          <section className="bg-brand-800 py-12 animate-home-fade-in">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
                <div>
                  <p className="text-4xl font-extrabold text-white">{formatStat(stats?.students)}</p>
                  <p className="mt-2 text-sm font-medium text-brand-200 uppercase tracking-wide">Students</p>
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-white">{formatStat(stats?.instructors)}</p>
                  <p className="mt-2 text-sm font-medium text-brand-200 uppercase tracking-wide">Instructors</p>
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-white">{formatStat(stats?.courses)}</p>
                  <p className="mt-2 text-sm font-medium text-brand-200 uppercase tracking-wide">Courses</p>
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-white">{formatStat(stats?.enrollments)}</p>
                  <p className="mt-2 text-sm font-medium text-brand-200 uppercase tracking-wide">Enrollments</p>
                </div>
              </div>
            </div>
          </section>
        )}

                {/* Popular Categories */}
        {uniqueCategories.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Explore by category</h2>
                <p className="mt-4 text-lg text-fg-muted">Real course categories from the platform.</p>
              </div>
              <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {uniqueCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/courses?category=${encodeURIComponent(cat)}`}
                    className="group bg-surface rounded-xl border border-border p-5 text-center hover:border-brand-600 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                  >
                    <p className="text-sm font-medium text-fg group-hover:text-brand-600 transition-colors">{cat}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

{/* Featured Courses — real data */}
        <section className="py-16 bg-bg sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Explore our courses</h2>
              <p className="mt-4 text-lg text-fg-muted">
                Real courses from the platform catalog — no placeholders.
              </p>
            </div>
            <div className="mt-12">
              {loadingCourses ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden animate-pulse">
                      <div className="w-full h-48 bg-surface-2" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-surface-2 rounded w-2/3" />
                        <div className="h-3 bg-surface-2 rounded w-full" />
                        <div className="h-3 bg-surface-2 rounded w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-xl border border-border">
                  <BookIcon size={48} />
                  <p className="mt-4 text-lg text-fg-muted">No courses are published yet. Check back soon.</p>
                  <Link href="/register" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                    Be the first to learn
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course, idx) => (
                    <article key={course._id} className="bg-surface rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                      <img
                        src={courseImage(course, idx)}
                        alt={course.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-5">
                        {course.category && (
                          <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">{course.category}</span>
                        )}
                        <h3 className="mt-2 text-lg font-bold text-fg line-clamp-2">{course.title}</h3>
                        {course.description && (
                          <p className="mt-2 text-sm text-fg-muted line-clamp-3">{course.description}</p>
                        )}
                        <Link
                          href={`/courses/${course._id}`}
                          className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          View course <span className="ml-1">→</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature grid — fixed typo classes */}
        <section className="py-16 bg-white sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">A complete learning ecosystem</h2>
              <p className="mt-4 text-lg text-fg-muted">
                Everything you need to teach, learn, and manage academic success in one unified platform.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/resources" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-4"><FileIcon size={24} /></div>
                <h3 className="text-lg font-bold text-fg mb-2">Learning Resources</h3>
                <p className="text-sm text-fg-muted leading-relaxed">PDFs, notes, study guides, and downloadable course materials.</p>
              </Link>
              <Link href="/reels" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-4"><VideoIcon size={24} /></div>
                <h3 className="text-lg font-bold text-fg mb-2">Video Lessons</h3>
                <p className="text-sm text-fg-muted leading-relaxed">Short-form educational reels and live interactive classrooms.</p>
              </Link>
              <Link href="/quizzes" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-4"><ShieldIcon size={24} /></div>
                <h3 className="text-lg font-bold text-fg mb-2">Secure Assessments</h3>
                <p className="text-sm text-fg-muted leading-relaxed">Timed quizzes, graded assignments, direct instructor feedback.</p>
              </Link>
              <Link href="/student/analytics" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-4"><ChartIcon size={24} /></div>
                <h3 className="text-lg font-bold text-fg mb-2">Progress Tracking</h3>
                <p className="text-sm text-fg-muted leading-relaxed">Detailed analytics for students, instructors, and administrators.</p>
              </Link>
            </div>
          </div>
        </section>

                {/* Video Lessons */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
              <div>
                <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Video lessons</h2>
                <p className="mt-4 text-lg text-fg-muted">
                  Short-form educational reels and featured learning content.
                </p>
              </div>
              <Link href="/reels" className="mt-4 sm:mt-0 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
                Browse all videos <span className="ml-1">→</span>
              </Link>
            </div>
            {reelsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden animate-pulse">
                    <div className="w-full aspect-video bg-surface-2" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-surface-2 rounded w-3/4" />
                      <div className="h-3 bg-surface-2 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reels.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <VideoIcon size={48} />
                <p className="mt-4 text-lg text-fg-muted">No videos published yet.</p>
                <Link href="/reels" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                  Visit the video library
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reels.slice(0, 6).map((reel, idx) => (
                  <Link key={reel._id} href="/reels" className="group bg-surface rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative aspect-video bg-surface-2 overflow-hidden">
                      <img
                        src={reel.thumbnailUrl || reel.thumbnail || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                        alt={reel.title || reel.caption || "Video lesson"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-brand-600 text-2xl font-bold">▶</div>
                      </div>
                      {reel.duration ? (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
                          {Math.floor(reel.duration / 60)}:{String(Math.floor(reel.duration % 60)).padStart(2, "0")}
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-fg line-clamp-2">
                        {reel.title || reel.caption || "Untitled video"}
                      </h3>
                      {reel.category && (
                        <p className="mt-1 text-xs text-brand-600 uppercase tracking-wide font-medium">{reel.category}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Learning Resources */}
        <section className="py-16 bg-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
              <div>
                <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Learning resources</h2>
                <p className="mt-4 text-lg text-fg-muted">
                  PDFs, notes, study guides, and downloadable course materials.
                </p>
              </div>
              <Link href="/resources" className="mt-4 sm:mt-0 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
                Browse library <span className="ml-1">→</span>
              </Link>
            </div>
            {resourcesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-surface rounded-lg border border-border p-5 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-surface-2 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-2 rounded w-3/4" />
                        <div className="h-3 bg-surface-2 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <FileIcon size={48} />
                <p className="mt-4 text-lg text-fg-muted">No learning resources uploaded yet.</p>
                <Link href="/resources" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                  Open resource library
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.slice(0, 6).map((res) => {
                  const type = (res.fileType || res.mimeType || "").toLowerCase();
                  const ext = type.split("/").pop() || type;
                  const label = (ext || "file").toUpperCase();
                  return (
                    <Link key={res._id} href="/resources" className="group bg-surface rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                          <FileIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-fg text-sm line-clamp-2 group-hover:text-brand-600 transition-colors">
                            {res.title || res.fileName || "Untitled resource"}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
                            <span className="px-1.5 py-0.5 rounded bg-surface-2 font-medium">{label}</span>
                            {res.size ? (
                              <span>{res.size > 1024 * 1024 ? (res.size / 1024 / 1024).toFixed(1) + " MB" : Math.round(res.size / 1024) + " KB"}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

                {/* Featured Instructors */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
              <div>
                <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Featured instructors</h2>
                <p className="mt-4 text-lg text-fg-muted">Industry professionals dedicated to your success.</p>
              </div>
              <Link href="/instructors" className="mt-4 sm:mt-0 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
                All instructors <span className="ml-1">→</span>
              </Link>
            </div>
            {instructorsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface rounded-xl border border-border p-6 animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-surface-2 mx-auto" />
                    <div className="mt-4 h-4 bg-surface-2 rounded w-2/3 mx-auto" />
                  </div>
                ))}
              </div>
            ) : instructors.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <UsersIcon size={48} />
                <p className="mt-4 text-lg text-fg-muted">Instructor profiles coming soon.</p>
                <Link href="/instructors" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                  Browse instructors
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {instructors.slice(0, 4).map((inst) => {
                  const instructorId = inst.id || inst._id;
                  if (!instructorId) return null;
                  const nm = inst.fullName || inst.name || "Instructor";
                  return (
                    <Link key={instructorId} href={`/instructors/${instructorId}`} className="group bg-surface rounded-xl border border-border p-6 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                      {inst.avatarUrl ? (
                        <img src={inst.avatarUrl} alt={nm} className="w-20 h-20 rounded-full object-cover mx-auto" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold mx-auto">
                          {nm.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <h3 className="mt-4 font-semibold text-fg group-hover:text-brand-600 transition-colors">{nm}</h3>
                      {inst.title && <p className="mt-1 text-sm text-fg-muted line-clamp-1">{inst.title}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Latest Announcements */}
        {announcements.length > 0 && (
          <section className="py-16 bg-bg">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-extrabold text-fg text-center sm:text-4xl">Latest updates</h2>
              <div className="mt-8 space-y-3">
                {announcements.slice(0, 5).map((a, i) => (
                  <div key={i} className="bg-surface rounded-lg border border-border p-5 flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">📢</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-fg">{a.text}</p>
                      {a.link && (
                        <Link href={a.link} className="text-sm text-brand-600 hover:text-brand-700 mt-1 inline-block">
                          Learn more →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
              <div>
                <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Upcoming events</h2>
                <p className="mt-4 text-lg text-fg-muted">Live sessions, workshops, and academic activities.</p>
              </div>
              <Link href="/events" className="mt-4 sm:mt-0 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
                All events <span className="ml-1">→</span>
              </Link>
            </div>
            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse">
                    <div className="h-4 bg-surface-2 rounded w-1/3" />
                    <div className="mt-3 h-3 bg-surface-2 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <p className="text-lg text-fg-muted">No events scheduled right now.</p>
                <Link href="/events" className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
                  View calendar
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.slice(0, 6).map((ev) => (
                  <Link key={ev._id} href="/events" className="group bg-surface rounded-xl border border-border p-5 hover:border-brand-600 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                    {ev.startAt && (
                      <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">
                        {new Date(ev.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    <h3 className="mt-2 font-semibold text-fg group-hover:text-brand-600 transition-colors line-clamp-2">
                      {ev.title || "Untitled event"}
                    </h3>
                    {ev.description && (
                      <p className="mt-2 text-sm text-fg-muted line-clamp-2">{ev.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

{/* Founder section — from CMS, honest about empty bio */}
        {founder && founder.name && (
          <section className="py-16 bg-brand-50 lg:py-24">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  <div className="md:col-span-1 flex items-center justify-center p-8 bg-brand-600">
                    {founder.avatarUrl ? (
                      <img
                        src={founder.avatarUrl}
                        alt={founder.name}
                        className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-brand-700 flex items-center justify-center text-white text-4xl font-extrabold border-4 border-white shadow-lg">
                        {founder.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 p-8 lg:p-10">
                    <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-2">Founder</p>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-fg">{founder.name}</h2>
                    {founder.role && <p className="mt-1 text-base text-fg-muted">{founder.role}</p>}
                    {founder.bio ? (
                      <p className="mt-4 text-fg-muted leading-relaxed">{founder.bio}</p>
                    ) : (
                      <p className="mt-4 text-fg-muted leading-relaxed">
                        Building an education platform designed for real progress — not just pretty pages.
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-3">
                      {founder.githubUrl && (
                        <a
                          href={founder.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                        >
                          GitHub profile →
                        </a>
                      )}
                      <Link
                        href="/about"
                        className="inline-flex items-center px-4 py-2 rounded-md border border-border text-fg text-sm font-medium hover:bg-surface-2 transition-colors"
                      >
                        Learn more about Learn
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

                {/* Why Learn */}
        <section className="py-16 bg-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-fg sm:text-4xl">Why learn with us?</h2>
              <p className="mt-4 text-lg text-fg-muted">Built for real progress, not just pretty pages.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mx-auto">🎯</div>
                <h3 className="mt-4 font-bold text-fg">Outcome focused</h3>
                <p className="mt-2 text-sm text-fg-muted leading-relaxed">Structured curriculum with measurable progress and verifiable certificates.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mx-auto">👥</div>
                <h3 className="mt-4 font-bold text-fg">Live instruction</h3>
                <p className="mt-2 text-sm text-fg-muted leading-relaxed">Real instructors, real classrooms — live sessions and interactive discussions.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mx-auto">🔒</div>
                <h3 className="mt-4 font-bold text-fg">Secure and private</h3>
                <p className="mt-2 text-sm text-fg-muted leading-relaxed">JWT-verified auth, role-based access, and audited actions across the platform.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-fg text-center sm:text-4xl">Frequently asked questions</h2>
            <div className="mt-10 space-y-3">
              {[
                { q: "How do I enrol in a course?", a: "Create a free account, browse the catalogue, and click Enrol on any course. Paid courses use secure Paystack checkout." },
                { q: "Do you offer certificates?", a: "Yes — complete a course and pass its assessments to earn a verifiable certificate from your dashboard." },
                { q: "Can I access content on mobile?", a: "The entire platform is mobile-first: courses, videos, resources, and your dashboard all work on phones and tablets." },
                { q: "How are live sessions scheduled?", a: "Instructors publish live sessions in the academic calendar. You'll be notified through the platform and can join from your dashboard." },
                { q: "What payment methods do you accept?", a: "Card payments via Paystack. All transactions are PCI-compliant and processed on secure infrastructure." },
                { q: "How do I get support?", a: "Visit the Help Centre or Contact page. Students can also raise welfare tickets from their dashboard." },
              ].map((faq, i) => (
                <details key={i} className="group bg-surface rounded-lg border border-border p-5">
                  <summary className="font-semibold text-fg cursor-pointer list-none flex justify-between items-center gap-4">
                    <span>{faq.q}</span>
                    <span className="text-brand-600 group-open:rotate-180 transition-transform flex-shrink-0">▾</span>
                  </summary>
                  <p className="mt-3 text-sm text-fg-muted leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 bg-bg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-fg">Have questions?</h2>
            <p className="mt-3 text-lg text-fg-muted">Our team is here to help with admissions, courses, and technical support.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link href="/contact" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">Contact us</Link>
              <Link href="/about" className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-border text-fg font-medium hover:bg-surface-2">About Learn</Link>
            </div>
          </div>
        </section>

{/* CTA */}
        <section className="bg-brand-800 py-16">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {cms?.cta?.title ?? "Ready to start your learning journey?"}
            </h2>
            <p className="mt-4 text-lg text-brand-200">
              {cms?.cta?.subtitle ?? "Join students and professionals building their future with Learn."}
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Link
                href={cms?.cta?.primaryHref ?? "/register"}
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-brand-800 bg-white hover:bg-brand-100 transition-colors shadow-sm"
              >
                {cms?.cta?.primaryLabel ?? "Get Started Today"}
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-full text-white hover:bg-brand-700 transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterMega />
    </div>
  );
}
