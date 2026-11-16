import { useState, useEffect } from "react";
import Link from "next/link";
import { BookIcon, CheckIcon, ClipboardIcon, CalendarIcon, ChartIcon, BellIcon } from "@/components/layout/icons";

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user and dashboard data
    Promise.all([
      fetch("/api/auth-me").then((res) => res.json()).catch(() => null),
      fetch("/api/student/dashboard").then((res) => res.json()).catch(() => null),
    ])
      .then(([userData, dashboardData]) => {
        setUser(userData);
        setData(dashboardData);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fallback/mock data if backend is unavailable (so you can see the UI)
  const stats = data?.stats || { enrolledCourses: 3, completedLessons: 24, pendingAssignments: 2, certificates: 1 };
  const upcoming = data?.upcoming || [
    { id: 1, title: "Advanced Mathematics Quiz", type: "Quiz", date: "Tomorrow, 10:00 AM", course: "Advanced Mathematics" },
    { id: 2, title: "Physics Lab Report", type: "Assignment", date: "Friday, 11:59 PM", course: "Applied Physics" },
  ];
  const recentActivity = data?.recentActivity || [
    { id: 1, text: "Completed lesson: Introduction to Calculus", time: "2 hours ago" },
    { id: 2, text: "Submitted assignment: Motion and Forces", time: "Yesterday" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-surface-2 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-surface-2 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface-2 rounded-xl"></div>
          <div className="h-96 bg-surface-2 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Welcome Banner ───────────────────────────────────── */}
      <div className="bg-brand-800 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "Student"}! 👋</h1>
            <p className="mt-2 text-brand-200 text-sm sm:text-base">You're making great progress. Keep up the momentum.</p>
          </div>
          <Link href="/student/courses" className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
            Go to My Courses
          </Link>
        </div>
        {/* Decorative background element */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <BookIcon size={160} />
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label="Enrolled Courses" value={stats.enrolledCourses} icon={<BookIcon size={20} />} tone="brand" />
        <StatCard label="Completed Lessons" value={stats.completedLessons} icon={<CheckIcon size={20} />} tone="success" />
        <StatCard label="Pending Tasks" value={stats.pendingAssignments} icon={<ClipboardIcon size={20} />} tone="warning" />
        <StatCard label="Certificates" value={stats.certificates} icon={<ChartIcon size={20} />} tone="info" />
      </div>

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upcoming Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-fg">Upcoming Assessments</h2>
              <Link href="/student/assignments" className="text-sm text-brand-600 hover:text-brand-800 font-medium">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {upcoming.length > 0 ? upcoming.map((item: any) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface-2/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      {item.type === "Quiz" ? <ClipboardIcon size={20} /> : <CalendarIcon size={20} />}
                    </div>
                    <div>
                      <p className="font-medium text-fg">{item.title}</p>
                      <p className="text-sm text-fg-muted mt-1">{item.course}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right w-full sm:w-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                      {item.type}
                    </span>
                    <p className="text-sm font-medium text-fg mt-1">{item.date}</p>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-fg-muted">No upcoming assessments. You're all caught up!</div>
              )}
            </div>
          </div>

          {/* Continue Learning */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
             <h2 className="text-lg font-semibold text-fg mb-4">Continue Learning</h2>
             <div className="flex flex-col sm:flex-row gap-4 items-center bg-bg-workspace rounded-xl p-4 border border-border">
                <img src="/images/education/hero-classroom.jpg" className="h-20 w-full sm:w-32 object-cover rounded-lg shadow-sm" alt="Course" />
                <div className="flex-1 w-full">
                  <h3 className="font-semibold text-fg">Advanced Mathematics</h3>
                  <p className="text-sm text-fg-muted mb-3">Module 4: Integral Calculus</p>
                  <div className="w-full bg-surface-2 rounded-full h-2">
                    <div className="bg-brand-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <p className="text-xs text-fg-muted mt-2 font-medium">65% Complete</p>
                </div>
                <Link href="/student/course-view" className="w-full sm:w-auto shrink-0 bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors text-center">
                  Resume
                </Link>
             </div>
          </div>
        </div>

        {/* Right Column: Recent Activity & Announcements */}
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <BellIcon size={18} className="text-brand-600" /> Recent Activity
            </h2>
            <div className="space-y-6">
              {recentActivity.map((activity: any, idx: number) => (
                <div key={activity.id} className="relative pl-6">
                  {idx !== recentActivity.length - 1 && (
                    <span className="absolute left-2 top-6 bottom-[-24px] w-0.5 bg-border" aria-hidden="true" />
                  )}
                  <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-brand-600 shadow-sm" />
                  <p className="text-sm font-medium text-fg">{activity.text}</p>
                  <p className="text-xs text-fg-muted mt-1">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable component local to this file (or import from components/ui/stat-card)
function StatCard({ label, value, icon, tone }: { label: string, value: any, icon: any, tone: "brand" | "success" | "warning" | "info" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-fg tracking-tight">{value}</p>
    </div>
  );
}
