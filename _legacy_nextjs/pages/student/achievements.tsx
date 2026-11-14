import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function Achievements() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [lb, setLb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      fetch("/api/gamification/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/gamification/leaderboard?limit=5").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([g, l]) => {
        setData(g);
        setLb(Array.isArray(l) ? l : []);
      })
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <Layout role={me.role} name={me.fullName}><p className="text-gray-500">Loading…</p></Layout>;
  if (!data) return <Layout role={me.role} name={me.fullName}><p className="text-red-600">Could not load achievements.</p></Layout>;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-gray-500">
            Earn points for learning. Unlock badges as you progress.
          </p>
        </div>
        <a href="/leaderboard" className="text-sm text-brand-600 underline">
          View full leaderboard →
        </a>
      </div>

      {/* Points + progress */}
      <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-lg">
        <p className="text-sm uppercase opacity-80">Total points</p>
        <p className="mt-1 text-5xl font-bold">{data.points.toLocaleString()}</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>Badges earned</span>
            <span>{data.earnedCount}/{data.totalBadges}</span>
          </div>
          <div className="h-2 rounded-full bg-white/30">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${(data.earnedCount / data.totalBadges) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges grid */}
      <div className="mt-6 rounded bg-white p-5 shadow">
        <h2 className="mb-4 font-semibold">Badges</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.badges.map((b: any) => (
            <div
              key={b.badgeId}
              className={`rounded-lg border-2 p-4 text-center transition ${
                b.earned
                  ? "border-brand-300 bg-brand-50"
                  : "border-gray-200 bg-gray-50 opacity-50"
              }`}
            >
              <div className="text-4xl">{b.icon}</div>
              <p className="mt-2 text-sm font-semibold">{b.name}</p>
              <p className="mt-1 text-xs text-gray-600">{b.description}</p>
              {b.earned && b.earnedAt && (
                <p className="mt-1 text-xs text-brand-600">
                  {new Date(b.earnedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard preview */}
      <div className="mt-6 rounded bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Top 5 Learners</h2>
          <a href="/leaderboard" className="text-sm text-brand-600 underline">
            See all →
          </a>
        </div>
        {lb.length === 0 ? (
          <p className="text-sm text-gray-500">No one has earned points yet.</p>
        ) : (
          <ul className="divide-y">
            {lb.map((r) => (
              <li key={r.userId} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-lg">
                    {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
                  </span>
                  <span className="font-medium">{r.fullName}</span>
                </div>
                <span className="text-brand-600 font-bold">{r.points.toLocaleString()} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
