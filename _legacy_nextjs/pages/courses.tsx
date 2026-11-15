import { useState, useEffect } from "react";
import Link from "next/link";
import { BookIcon, UsersIcon, ClockIcon, SearchIcon } from "@/components/layout/icons";

// Fallback data if backend is empty
const FALLBACK_COURSES = [
  { _id: "1", title: "Introduction to Computer Science", category: "Technology", instructor: "Dr. Sarah Jenkins", level: "Beginner", duration: "8 Weeks", price: 0, image: "/images/education/collaborative-learning.jpg" },
  { _id: "2", title: "Advanced Mathematics", category: "Science", instructor: "Prof. Alan Turing", level: "Advanced", duration: "12 Weeks", price: 49.99, image: "/images/education/classroom-learning.jpg" },
  { _id: "3", title: "Business Management", category: "Business", instructor: "Elena Rostova", level: "Intermediate", duration: "6 Weeks", price: 29.99, image: "/images/education/library-study-support.jpg" },
  { _id: "4", title: "Environmental Biology", category: "Science", instructor: "Dr. David Attenborough", level: "Beginner", duration: "10 Weeks", price: 0, image: "/images/education/teacher-helping.jpg" },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    // Attempt to fetch from your FastAPI backend
    fetch("/api/course-list")
      .then((res) => res.json())
      .then((data) => {
        // Handle different response shapes (array or {courses: []})
        const list = Array.isArray(data) ? data : data?.courses || [];
        setCourses(list.length > 0 ? list : FALLBACK_COURSES);
      })
      .catch(() => {
        // Fallback for local dev if backend isn't running
        setCourses(FALLBACK_COURSES);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category || "General")))];

  const filtered = courses.filter((c) => {
    const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || 
                          c.instructor?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "All" || c.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-bg font-sans">
      
      {/* ── Catalogue Hero ─────────────────────────────────────── */}
      <div className="bg-brand-800 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Explore our courses
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-200">
            Find the perfect course to advance your skills. Search our catalogue of expert-led programmes.
          </p>
          
          {/* Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted">
              <SearchIcon size={20} />
            </div>
            <input
              type="text"
              placeholder="Search courses or instructors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 rounded-xl border-0 text-fg shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
            />
          </div>
        </div>
      </div>

      {/* ── Filters & Content ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Category Pills */}
        <div className="flex overflow-x-auto pb-4 mb-8 space-x-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                category === cat 
                  ? "bg-brand-600 text-white border-brand-600" 
                  : "bg-surface text-fg border-border hover:border-brand-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface rounded-xl border border-border h-96 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24 bg-surface rounded-xl border border-border">
            <h3 className="text-lg font-semibold text-fg">No courses found</h3>
            <p className="mt-2 text-fg-muted">Try adjusting your search or filters.</p>
            <button onClick={() => { setSearch(""); setCategory("All"); }} className="mt-4 text-brand-600 font-medium hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          /* Course Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course, idx) => (
              <Link key={course._id || idx} href={`/courses/${course._id || idx}`} className="group flex flex-col bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                
                {/* Thumbnail */}
                <div className="relative h-48 bg-surface-2 overflow-hidden">
                  <img 
                    src={course.image || "/images/education/classroom-lecture.jpg"} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold px-2.5 py-1 rounded-md text-brand-800 shadow-sm uppercase tracking-wide">
                    {course.category || "General"}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-fg line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {course.title}
                  </h3>
                  
                  <div className="mt-2 flex items-center text-sm text-fg-muted">
                    <UsersIcon size={16} className="mr-1.5 shrink-0" />
                    <span className="truncate">{course.instructor || "Learn Instructor"}</span>
                  </div>

                  {/* Meta Bottom */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-border mt-4">
                    <div className="flex items-center text-xs font-medium text-fg-muted">
                      <ClockIcon size={14} className="mr-1" />
                      {course.duration || "Flexible"}
                    </div>
                    <div className="text-sm font-bold text-brand-600">
                      {course.price ? `$${course.price}` : "Free"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
