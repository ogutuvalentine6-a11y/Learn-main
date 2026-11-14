import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function StudentAttendance() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      fetch("/api/attendance/my-summary").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/attendance/my").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, r]) => {
        setSummary(Array.isArray(s) ? s : []);
        setRecords(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  const statusStyle = (s: string) => {
    switch (s) {
      case "present": return "bg-green-100 text-green-700";
      case "absent": return "bg-red-100 text-red-700";
      case "late": return "bg-yellow-100 text-yellow-700";
      case "excused": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">My Attendance</h1>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : summary.length === 0 ? (
        <div className="rounded border border-dashed p-10 text-center text-gray-500">
          No attendance recorded yet. It appears once your instructor marks a class.
        </div>
      ) : (
        <>
          {/* Per-course summary */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summary.map((s) => {
              const percent = s.percent ?? 0;
              const tone =
                percent >= 90 ? "text-green-600 border-green-200" :
                percent >= 75 ? "text-yellow-600 border-yellow-200" :
                "text-red-600 border-red-200";
              return (
                <div key={s.courseId} className={`rounded-lg border-2 bg-white p-5 shadow-sm ${tone}`}>
                  <h2 className="font-semibold text-gray-900">{s.courseTitle}</h2>
                  <p className="mt-2 text-3xl font-bold">
                    {s.percent === null ? "—" : `${s.percent}%`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {s.present + s.late}/{s.total - s.excused} attended
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                    <div>
                      <p className="font-medium text-green-700">{s.present}</p>
                      <p className="text-gray-500">present</p>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-700">{s.late}</p>
                      <p className="text-gray-500">late</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-700">{s.absent}</p>
                      <p className="text-gray-500">absent</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-700">{s.excused}</p>
                      <p className="text-gray-500">excused</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed records */}
          <div className="rounded bg-white p-5 shadow">
            <h2 className="mb-3 font-semibold">All Records ({records.length})</h2>
            {records.length === 0 ? (
              <p className="text-sm text-gray-500">No individual records yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Status</th>
                    <th>Marked By</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id} className="border-b">
                      <td className="py-2 font-mono text-xs">{r.date}</td>
                      <td>
                        <span className={`text-xs rounded px-2 py-0.5 capitalize ${statusStyle(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">{r.markedByName || "—"}</td>
                      <td className="text-xs text-gray-600">{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
