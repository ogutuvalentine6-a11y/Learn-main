import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function AdminDashboard() {
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/overview").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/recent").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, o, r]) => { setMe(u); setData({ overview: o, recent: r }); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout role="admin"><p className="text-gray-500">Loading…</p></Layout>;
  if (!me || !data?.overview) return <Layout role="admin"><p className="text-red-600">Failed to load.</p></Layout>;

  const o = data.overview;
  const r = data.recent || { recentUsers: [], recentPayments: [] };
  const totalPending = o.moderation.pendingResources + o.moderation.pendingReels;

  return (
    <Layout role="admin" name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-sm text-gray-500">Platform-wide metrics and moderation queues.</p>
        </div>
        <Link href="/admin/analytics" className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Full analytics →
        </Link>
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={o.users.total} sub={`${o.users.newThisWeek} new this week`} />
        <StatCard label="Active Courses" value={o.courses.active} sub={`${o.courses.inactive} inactive`} />
        <StatCard label="Paid Enrollments" value={o.enrollments.paid} sub={`${o.enrollments.pending} pending`} />
        <StatCard
          label="Revenue (month)"
          value={`NGN ${o.revenue.monthTotal.toLocaleString()}`}
          sub={`${o.revenue.monthCount} payments`}
        />
      </div>

      {/* ── User breakdown ── */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Students" value={o.users.students} />
        <MiniStat label="Staff" value={o.users.staff} />
        <MiniStat label="Admins" value={o.users.admins} />
        <MiniStat label="Blocked" value={o.users.blocked} />
      </div>

      {/* ── Moderation queues ── */}
      <Section title="Moderation Queues" action={{ label: "All queues", href: "/admin/resources" }}>
        <div className="grid gap-3 md:grid-cols-3">
          <QueueCard
            label="Pending Resources"
            count={o.moderation.pendingResources}
            href="/admin/resources"
            tone={o.moderation.pendingResources > 0 ? "yellow" : "green"}
          />
          <QueueCard
            label="Pending Reels"
            count={o.moderation.pendingReels}
            href="/admin/reels"
            tone={o.moderation.pendingReels > 0 ? "yellow" : "green"}
          />
          <QueueCard
            label="Live Sessions (upcoming)"
            count={o.live.upcoming}
            href="/live"
            tone="blue"
          />
        </div>
        {totalPending > 0 && (
          <p className="mt-3 text-sm text-yellow-700">
            ⚠ {totalPending} item{totalPending > 1 ? "s" : ""} waiting on you.
          </p>
        )}
      </Section>

      {/* ── Engagement metrics ── */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Reels Engagement"
          value={`${(o.reels.views || 0).toLocaleString()} views`}
          sub={`${o.reels.likes || 0} likes · ${o.reels.total} approved`}
        />
        <StatCard
          label="Completion Rate"
          value={`${o.progress.completionRate}%`}
          sub={`${o.progress.passed}/${o.progress.total} progress records passed`}
        />
        <StatCard
          label="Community"
          value={o.community.threads + o.community.studyGroups}
          sub={`${o.community.threads} threads · ${o.community.studyGroups} groups`}
        />
      </div>

      {/* ── Recent activity ── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Recent Signups" action={{ label: "All users", href: "/admin/users" }}>
          {r.recentUsers.length === 0 ? (
            <EmptyState msg="No recent signups." />
          ) : (
            <ul className="space-y-1">
              {r.recentUsers.map((u: any) => (
                <li key={u.id} className="flex justify-between border-b py-1.5 text-sm">
                  <div>
                    <span className="font-medium">{u.fullName}</span>
                    <span className="ml-2 text-xs text-gray-500">({u.role})</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent Payments" action={{ label: "All payments", href: "/admin/payments" }}>
          {r.recentPayments.length === 0 ? (
            <EmptyState msg="No payments yet." />
          ) : (
            <ul className="space-y-1">
              {r.recentPayments.map((p: any) => (
                <li key={p.id} className="flex justify-between border-b py-1.5 text-sm">
                  <span className="font-medium">NGN {p.amount.toLocaleString()}</span>
                  <span className="text-xs font-mono text-gray-500">{p.reference}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* ── Quick admin actions ── */}
      <div className="mt-6 rounded bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link href="/admin/users" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Manage users
          </Link>
          <Link href="/admin/courses" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Manage courses
          </Link>
          <Link href="/admin/homepage" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            Edit homepage
          </Link>
          <Link href="/admin/logs" className="rounded border p-3 text-center text-sm hover:bg-gray-50">
            View logs
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, sub }: any) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded border bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function QueueCard({ label, count, href, tone }: any) {
  const colors = {
    green: "border-green-200 bg-green-50",
    yellow: "border-yellow-200 bg-yellow-50",
    blue: "border-blue-200 bg-blue-50",
  };
  return (
    <Link href={href} className={`block rounded border p-4 ${colors[tone as keyof typeof colors]}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{count}</p>
      <p className="text-xs text-gray-500 mt-1">Click to review →</p>
    </Link>
  );
}

function Section({ title, action, children }: any) {
  return (
    <div className="mt-6 rounded bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action && (
          <Link href={action.href} className="text-sm text-brand-600 underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ msg }: any) {
  return (
    <div className="rounded border border-dashed p-6 text-center">
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}
