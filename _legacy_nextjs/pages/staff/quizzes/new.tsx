import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Question {
  id: string;
  type: "mcq" | "multi" | "truefalse" | "short" | "essay";
  prompt: string;
  options: string[];
  correctAnswers: number[];
  expectedText: string;
  points: number;
  explanation: string;
}

function blankQuestion(idx: number): Question {
  return {
    id: `q${idx + 1}`,
    type: "mcq",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswers: [0],
    expectedText: "",
    points: 1,
    explanation: "",
  };
}

export default function NewQuiz() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [meta, setMeta] = useState({
    courseId: "", title: "", description: "",
    timerSeconds: 0, passMark: 50, maxAttempts: 1, published: true,
  });
  const [questions, setQuestions] = useState<Question[]>([blankQuestion(0)]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u || u.role === "student") return router.push("/quizzes");
      setMe(u);
    });
    fetch("/api/course-list").then((r) => r.ok ? r.json() : []).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [router]);

  function updateQ(i: number, patch: Partial<Question>) {
    const qs = [...questions];
    qs[i] = { ...qs[i], ...patch };
    setQuestions(qs);
  }

  async function save() {
    if (!meta.courseId || !meta.title) return setMsg("Course and title required");
    for (const q of questions) {
      if (!q.prompt.trim()) return setMsg(`Question ${q.id} has empty prompt`);
      if (["mcq", "multi", "truefalse"].includes(q.type)) {
        if (q.options.some((o) => !o.trim())) return setMsg(`Question ${q.id} has empty options`);
        if (q.correctAnswers.length === 0) return setMsg(`Question ${q.id} has no correct answer`);
      }
      if (q.type === "short" && !q.expectedText.trim()) return setMsg(`Question ${q.id} needs expectedText`);
    }
    setBusy(true);
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, questions }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json();
      return setMsg(b.error || "Failed");
    }
    router.push("/staff/quizzes");
  }

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">Create Quiz</h1>

      <div className="space-y-4 rounded bg-white p-5 shadow">
        {/* Meta */}
        <div className="grid gap-3 md:grid-cols-2">
          <select value={meta.courseId} onChange={(e) => setMeta({ ...meta, courseId: e.target.value })} className="rounded border px-3 py-2 text-sm">
            <option value="">Select course</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Quiz title" className="rounded border px-3 py-2 text-sm" />
          <input type="number" value={meta.timerSeconds} onChange={(e) => setMeta({ ...meta, timerSeconds: Number(e.target.value) })} placeholder="Timer (seconds, 0 = none)" className="rounded border px-3 py-2 text-sm" />
          <input type="number" value={meta.passMark} onChange={(e) => setMeta({ ...meta, passMark: Number(e.target.value) })} placeholder="Pass mark %" className="rounded border px-3 py-2 text-sm" />
          <input type="number" value={meta.maxAttempts} onChange={(e) => setMeta({ ...meta, maxAttempts: Number(e.target.value) })} placeholder="Max attempts" className="rounded border px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={meta.published} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} />
            Published
          </label>
        </div>

        <textarea placeholder="Description (optional)" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={2} className="w-full rounded border px-3 py-2 text-sm" />

        {/* Questions */}
        <h2 className="mt-4 font-semibold">Questions</h2>
        {questions.map((q, i) => (
          <div key={q.id} className="rounded border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase text-gray-500">Question {i + 1} ({q.id})</span>
              {questions.length > 1 && (
                <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-xs text-red-600 underline">
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr,150px,80px]">
              <input value={q.prompt} onChange={(e) => updateQ(i, { prompt: e.target.value })} placeholder="Prompt" className="rounded border px-3 py-2 text-sm" />
              <select value={q.type} onChange={(e) => updateQ(i, { type: e.target.value as Question["type"] })} className="rounded border px-3 py-2 text-sm">
                <option value="mcq">MCQ (1 answer)</option>
                <option value="multi">Multi-answer</option>
                <option value="truefalse">True/False</option>
                <option value="short">Short answer</option>
                <option value="essay">Essay (manual)</option>
              </select>
              <input type="number" value={q.points} onChange={(e) => updateQ(i, { points: Number(e.target.value) })} placeholder="Points" className="rounded border px-3 py-2 text-sm" />
            </div>

            {["mcq", "multi", "truefalse"].includes(q.type) && (
              <div className="mt-2 space-y-1">
                {q.type === "truefalse" ? (
                  <div className="flex gap-3 text-sm">
                    <label><input type="radio" checked={q.correctAnswers[0] === 0} onChange={() => updateQ(i, { options: ["True", "False"], correctAnswers: [0] })} /> True</label>
                    <label><input type="radio" checked={q.correctAnswers[0] === 1} onChange={() => updateQ(i, { options: ["True", "False"], correctAnswers: [1] })} /> False</label>
                  </div>
                ) : (
                  q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 text-sm">
                      <input
                        type={q.type === "mcq" ? "radio" : "checkbox"}
                        checked={q.correctAnswers.includes(oi)}
                        onChange={() => {
                          const cur = q.correctAnswers;
                          const next = cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi];
                          updateQ(i, { correctAnswers: q.type === "mcq" ? [oi] : next });
                        }}
                      />
                      <input value={opt} onChange={(e) => {
                        const opts = [...q.options];
                        opts[oi] = e.target.value;
                        updateQ(i, { options: opts });
                      }} placeholder={`Option ${oi + 1}`} className="flex-1 rounded border px-2 py-1" />
                    </div>
                  ))
                )}
              </div>
            )}

            {q.type === "short" && (
              <input value={q.expectedText} onChange={(e) => updateQ(i, { expectedText: e.target.value })} placeholder="Expected answer (case-insensitive)" className="mt-2 w-full rounded border px-3 py-2 text-sm" />
            )}

            {q.type === "essay" && (
              <p className="mt-2 text-xs text-gray-500">Essay questions are graded manually by staff.</p>
            )}
          </div>
        ))}

        <button onClick={() => setQuestions([...questions, blankQuestion(questions.length)])} className="rounded border border-brand-600 px-3 py-1.5 text-sm text-brand-600">
          + Add question
        </button>

        <div className="border-t pt-4">
          <button onClick={save} disabled={busy} className="rounded bg-brand-600 px-5 py-2 text-sm text-white disabled:opacity-50">
            {busy ? "Creating…" : "Create quiz"}
          </button>
          {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
        </div>
      </div>
    </Layout>
  );
}
