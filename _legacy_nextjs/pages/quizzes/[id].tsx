import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function TakeQuiz() {
  const router = useRouter();
  const { id } = router.query;
  const [me, setMe] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, { selected: number[]; text: string }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!id || !me) return;
    fetch(`/api/quizzes/${id}`).then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((q) => {
        setQuiz(q);
        const init: any = {};
        q.questions.forEach((qd: any) => { init[qd.id] = { selected: [], text: "" }; });
        setAnswers(init);
      })
      .catch(() => setMsg("Quiz not available"));
  }, [id, me]);

  async function start() {
    setBusy(true);
    const res = await fetch(`/api/quizzes/${id}/start`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    setAttempt(await res.json());
  }

  async function submit() {
    setBusy(true);
    const payload = {
      answers: Object.entries(answers).map(([questionId, a]) => ({
        questionId, selected: a.selected, text: a.text,
      })),
    };
    const res = await fetch(`/api/quizzes/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Submit failed");
    }
    setResult(await res.json());
  }

  if (!me || !quiz) return <Layout role={me?.role || "student"} name={me?.fullName}><p className="text-gray-500">Loading…</p></Layout>;

  if (result) {
    return (
      <Layout role={me.role} name={me.fullName}>
        <div className="rounded bg-white p-8 shadow text-center">
          <h1 className="text-2xl font-bold">Submitted</h1>
          {result.status === "pending_manual" ? (
            <p className="mt-2 text-yellow-700">Awaiting manual grading by staff.</p>
          ) : (
            <>
              <p className={`mt-4 text-4xl font-bold ${result.passed ? "text-green-600" : "text-red-600"}`}>
                {result.percent}%
              </p>
              <p className="mt-2 text-gray-600">{result.passed ? "Passed" : "Failed"}</p>
              <p className="text-sm text-gray-500">Score: {result.autoScore}/{result.maxScore}</p>
            </>
          )}
          <button onClick={() => router.push("/quizzes")} className="mt-6 rounded bg-brand-600 px-5 py-2 text-sm text-white">
            Back to quizzes
          </button>
        </div>
      </Layout>
    );
  }

  if (!attempt) {
    return (
      <Layout role={me.role} name={me.fullName}>
        <div className="rounded bg-white p-8 shadow text-center">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="mt-2 text-gray-600">{quiz.description}</p>
          <p className="mt-3 text-sm text-gray-500">
            {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} · {quiz.maxAttempts} attempt{quiz.maxAttempts > 1 ? "s" : ""}
            {quiz.timerSeconds > 0 && ` · ${Math.floor(quiz.timerSeconds / 60)} min limit`}
            · pass {quiz.passMark}%
          </p>
          <button onClick={start} disabled={busy} className="mt-6 rounded bg-brand-600 px-6 py-3 text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Starting…" : "Start attempt"}
          </button>
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">{quiz.title}</h1>
      <div className="space-y-4">
        {quiz.questions.map((q: any) => (
          <div key={q.id} className="rounded bg-white p-5 shadow">
            <p className="font-medium">{q.prompt}</p>
            <p className="text-xs text-gray-500 mb-3">{q.type} · {q.points} point{q.points === 1 ? "" : "s"}</p>

            {["mcq", "multi", "truefalse"].includes(q.type) && (
              <div className="space-y-1">
                {q.options.map((opt: string, oi: number) => (
                  <label key={oi} className="flex items-center gap-2 text-sm">
                    <input
                      type={q.type === "multi" ? "checkbox" : "radio"}
                      name={`q-${q.id}`}
                      checked={answers[q.id]?.selected.includes(oi)}
                      onChange={() => {
                        const cur = answers[q.id]?.selected || [];
                        const next = q.type === "multi"
                          ? cur.includes(oi) ? cur.filter((x: number) => x !== oi) : [...cur, oi]
                          : [oi];
                        setAnswers({ ...answers, [q.id]: { selected: next, text: "" } });
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {["short", "essay"].includes(q.type) && (
              <textarea
                rows={q.type === "essay" ? 6 : 2}
                value={answers[q.id]?.text || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: { selected: [], text: e.target.value } })}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder={q.type === "essay" ? "Write your answer…" : "Short answer"}
              />
            )}
          </div>
        ))}
        <button onClick={submit} disabled={busy} className="rounded bg-brand-600 px-6 py-3 text-white disabled:opacity-50">
          {busy ? "Submitting…" : "Submit answers"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </Layout>
  );
}
