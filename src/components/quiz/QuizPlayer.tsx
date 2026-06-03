"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAttempt, type QuizResult } from "@/app/actions/quiz";

export interface PlayerQuestion {
  id: string;
  question: string;
  type: "qcm" | "true_false" | "number" | "photo";
  options: string[] | null;
  points: number;
}
interface QuizPlayerProps {
  quizId: string;
  title: string;
  minScore: number;
  timeLimitSeconds: number | null;
  maxAttempts: number;
  attemptsUsed: number;
  questions: PlayerQuestion[];
}

/** Pluie de confettis (CSS only, déclenchée au score parfait). */
function Confetti() {
  const colors = ["#4B3BC7", "#E07840", "#E9B8CD", "#CBA36B", "#7c5fd6"];
  const pieces = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2.2 + Math.random() * 1.6,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: "absolute", top: "-5vh", left: `${p.left}%`,
          width: p.size, height: p.size, background: p.color, borderRadius: 2,
          animation: `confetti-fall ${p.dur}s linear ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

export function QuizPlayer({ quizId, title, minScore, timeLimitSeconds, maxAttempts, attemptsUsed, questions }: QuizPlayerProps) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"playing" | "submitting" | "result">("playing");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitSeconds);
  const startRef = useRef(Date.now());

  const q = questions[idx];
  const total = questions.length;
  const progressPct = Math.round(((idx + (phase === "result" ? 1 : 0)) / total) * 100);

  async function finish() {
    setPhase("submitting");
    const spent = Math.round((Date.now() - startRef.current) / 1000);
    const res = await submitQuizAttempt(quizId, answers, spent);
    setResult(res);
    setPhase("result");
  }

  // Chronomètre
  useEffect(() => {
    if (timeLeft == null || phase !== "playing") return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  function setAnswer(val: string) { setAnswers((a) => ({ ...a, [q.id]: val })); }
  function next() { if (idx < total - 1) setIdx(idx + 1); else finish(); }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  // ── Écran résultat ──
  if (phase === "result" && result) {
    const perfect = result.score === 100;
    const corr = new Map((result.corrections ?? []).map((c) => [c.questionId, c]));
    return (
      <div className="max-w-xl mx-auto">
        {perfect && <Confetti />}
        <div className={`rounded-3xl p-8 text-center text-white shadow-glow ${result.passed ? "bg-gradient-to-br from-green-500 to-green-700" : "bg-gradient-to-br from-orange-500 to-orange-700"}`}>
          <div className="text-6xl mb-3">{perfect ? "🌟" : result.passed ? "🎉" : "💪"}</div>
          <h2 className="font-playfair text-3xl font-bold">{result.score}%</h2>
          <p className="mt-1 font-dm">
            {result.passed ? "Quiz réussi !" : `Score minimum : ${minScore}%`}
            {perfect && " — Sans faute !"}
          </p>
        </div>

        {/* Corrections */}
        <div className="mt-6 space-y-3">
          {questions.map((qq, i) => {
            const c = corr.get(qq.id);
            return (
              <div key={qq.id} className="bg-white rounded-2xl border border-cream-200 p-4">
                <div className="flex items-start gap-2">
                  <span>{c?.isCorrect ? "✅" : "❌"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 font-dm text-sm">{i + 1}. {qq.question}</p>
                    <p className="text-xs text-gray-500 font-dm mt-0.5">Votre réponse : {answers[qq.id] ?? "—"}</p>
                    {!c?.isCorrect && c?.correctAnswer && (
                      <p className="text-xs text-green-700 font-dm">Bonne réponse : {c.correctAnswer}</p>
                    )}
                    {c?.explanation && <p className="text-xs text-gray-500 font-dm italic mt-1">💡 {c.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          {!result.passed && (result.attemptsLeft ?? 0) > 0 && (
            <button onClick={() => { setPhase("playing"); setIdx(0); setAnswers({}); setResult(null); setTimeLeft(timeLimitSeconds); startRef.current = Date.now(); }}
              className="flex-1 bg-violet-DEFAULT text-white py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors">
              Réessayer ({result.attemptsLeft} restante{(result.attemptsLeft ?? 0) > 1 ? "s" : ""})
            </button>
          )}
          <button onClick={() => router.back()} className="flex-1 border-2 border-violet-DEFAULT text-violet-DEFAULT py-3 rounded-xl font-bold hover:bg-violet-50 transition-colors">
            Retour au cours
          </button>
        </div>
      </div>
    );
  }

  // ── Écran de jeu ──
  if (!q) return null;
  const answered = answers[q.id] != null && answers[q.id] !== "";

  return (
    <div className="max-w-xl mx-auto">
      {/* En-tête : progression + chrono */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-dm">Question {idx + 1} / {total}</span>
        {timeLeft != null && (
          <span className={`text-sm font-bold font-dm ${timeLeft < 15 ? "text-red-500" : "text-violet-DEFAULT"}`}>⏱ {fmtTime(timeLeft)}</span>
        )}
      </div>
      <div className="h-2 bg-cream-200 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT rounded-full transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Question */}
      <div key={q.id} className="animate-question-in bg-white rounded-3xl border border-cream-200 shadow-soft p-6">
        <p className="text-xs text-gray-400 font-dm mb-2">{q.points} point{q.points > 1 ? "s" : ""}</p>
        <h3 className="font-playfair text-xl font-bold text-gray-900 mb-5">{q.question}</h3>

        {q.type === "qcm" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => (
              <button key={opt} onClick={() => setAnswer(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-dm transition-all ${
                  answers[q.id] === opt ? "border-violet-DEFAULT bg-violet-50 text-violet-DEFAULT font-semibold" : "border-cream-200 hover:border-violet-200"
                }`}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "true_false" && (
          <div className="grid grid-cols-2 gap-3">
            {["Vrai", "Faux"].map((opt) => (
              <button key={opt} onClick={() => setAnswer(opt)}
                className={`py-4 rounded-xl border-2 font-bold font-dm transition-all ${
                  answers[q.id] === opt ? "border-violet-DEFAULT bg-violet-50 text-violet-DEFAULT" : "border-cream-200 hover:border-violet-200"
                }`}>
                {opt === "Vrai" ? "✓ Vrai" : "✗ Faux"}
              </button>
            ))}
          </div>
        )}

        {q.type === "number" && (
          <input type="number" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Votre réponse chiffrée"
            className="w-full border-2 border-cream-200 rounded-xl px-4 py-3 font-dm focus:outline-none focus:border-violet-DEFAULT" />
        )}

        {q.type === "photo" && (
          <p className="text-sm text-gray-400 font-dm">Cette question nécessite une soumission photo (quiz pratique).</p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-5 flex justify-between gap-3">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
          className="px-5 py-3 rounded-xl border border-cream-200 text-gray-600 font-semibold disabled:opacity-40">
          ← Précédent
        </button>
        <button onClick={next} disabled={!answered || phase === "submitting"}
          className="flex-1 bg-violet-DEFAULT text-white py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-50">
          {phase === "submitting" ? "Validation…" : idx === total - 1 ? "Terminer le quiz" : "Suivant →"}
        </button>
      </div>
    </div>
  );
}
