import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/leaderboard?limit=20")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const medal = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="mt-2 text-gray-600">
          Top learners ranked by points earned through quizzes, submissions,
          course completions, and community activity.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded border border-dashed p-10 text-center text-gray-500">
            No points earned yet. Be the first on the board!
          </div>
        ) : (
          <div className="mt-8 rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr className="text-xs uppercase text-gray-500">
                  <th className="py-3 pl-4 w-16">Rank</th>
                  <th className="py-3">Learner</th>
                  <th className="py-3 text-center">Badges</th>
                  <th className="py-3 text-right pr-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const m = medal(row.rank);
                  return (
                    <tr
                      key={row.userId}
                      className={`border-b ${m ? "bg-yellow-50" : ""}`}
                    >
                      <td className="py-3 pl-4 text-lg">
                        {m || `#${row.rank}`}
                      </td>
                      <td className="py-3">
                        <p className="font-medium">{row.fullName}</p>
                        {row.school && (
                          <p className="text-xs text-gray-500">{row.school}</p>
                        )}
                      </td>
                      <td className="py-3 text-center">{row.badgeCount}</td>
                      <td className="py-3 pr-4 text-right font-bold text-brand-600">
                        {row.points.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
