import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FileUploader from "@/components/FileUploader";

export default function AssignmentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [uploaded, setUploaded] = useState<{ url: string } | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const r = await fetch(`/api/assignments/${id}`).then((x) => x.ok ? x.json() : null);
    setData(r);
    if (me?.role !== "student") {
      const s = await fetch(`/api/assignments/${id}/submissions`).then((x) => x.ok ? x.json() : []);
      setSubmissions(Array.isArray(s) ? s : []);
    }
  }

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => { if (id && me) load(); }, [id, me]);

  async function submit() {
    if (!uploaded) return setMsg("Upload a file first");
    const res = await fetch(`/api/assignments/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: uploaded.url, note }),
    });
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setUploaded(null);
    setNote("");
    setMsg("Submitted.");
    load();
  }

  async function grade(subId: string, maxScore: number) {
    const input = prompt(`Score (max ${maxScore}):`);
    if (input === null) return;
    const score = Number(input);
    if (isNaN(score) || score < 0 || score > maxScore) return alert("Invalid score");
    const feedback = prompt("Feedback (optional):") || "";
    await fetch(`/api/assignments/submissions/${subId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, feedback }),
    });
    load();
  }

  if (!me || !data) return <Layout role={me?.role || "student"} name={me?.fullName}><p className="text-gray-500">Loading…</p></Layout>;

  const a = data.assignment;
  const mySub = data.mySubmission;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{a.title}</h1>
        <p className="text-sm text-gray-500">
          {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleString()}` : "No deadline"} · max {a.maxScore}
        </p>
        {a.instructions && <p className="mt-3 whitespace-pre-wrap text-gray-700">{a.instructions}</p>}
      </div>

      {me.role === "student" && (
        <>
          <div className="mb-6 rounded bg-white p-5 shadow">
            <h2 className="mb-3 font-semibold">Your submission</h2>
            {mySub ? (
              <div className="space-y-1 text-sm">
                <p>Submitted: {new Date(mySub.submittedAt).toLocaleString()}</p>
                <a href={mySub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">View file →</a>
                {mySub.note && <p className="text-gray-600">Note: {mySub.note}</p>}
                {mySub.score !== null ? (
                  <p className="mt-2 font-medium">
                    Score: {mySub.score}/{a.maxScore}
                    {mySub.feedback && ` — ${mySub.feedback}`}
                  </p>
                ) : (
                  <p className="text-yellow-700">Awaiting grading</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not submitted yet.</p>
            )}
            <div className="mt-4 border-t pt-4">
              <FileUploader
                signatureUrl="/api/resources/upload-signature"
                resourceType="auto"
                label={mySub ? "Replace submission" : "Choose file"}
                onUploaded={(url) => { setUploaded({ url }); setMsg("File uploaded — click Submit."); }}
              />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="mt-2 w-full rounded border px-3 py-2 text-sm" />
              <button onClick={submit} disabled={!uploaded} className="mt-2 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                Submit
              </button>
              {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
            </div>
          </div>
        </>
      )}

      {me.role !== "student" && (
        <div className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Submissions ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="py-2">Student</th>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s._id} className="border-b">
                    <td className="py-2">{s.studentName}</td>
                    <td>{new Date(s.submittedAt).toLocaleDateString()}</td>
                    <td>{s.score !== null ? `${s.score}/${a.maxScore}` : "—"}</td>
                    <td className="space-x-2 py-2">
                      <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">File</a>
                      <button onClick={() => grade(s._id, a.maxScore)} className="text-brand-600 underline">Grade</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Layout>
  );
}
