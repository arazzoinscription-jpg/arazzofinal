"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuestion } from "../actions";

type QType = "qcm" | "true_false" | "number" | "photo";

/** Formulaire d'ajout d'une question à un quiz. */
export function QuestionForm({ quizId, nextIndex }: { quizId: string; nextIndex: number }) {
  const router = useRouter();
  const [type, setType] = useState<QType>("qcm");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctQcm, setCorrectQcm] = useState(0);
  const [correctTf, setCorrectTf] = useState("Vrai");
  const [correctNum, setCorrectNum] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function setOption(i: number, v: string) {
    setOptions((o) => o.map((x, j) => (j === i ? v : x)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    let opts: string[] | null = null;
    let correct: string | null = null;

    if (type === "qcm") {
      opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) { setErr("Ajoutez au moins 2 options."); return; }
      correct = options[correctQcm]?.trim() || null;
      if (!correct) { setErr("Indiquez la bonne réponse."); return; }
    } else if (type === "true_false") {
      correct = correctTf;
    } else if (type === "number") {
      if (correctNum.trim() === "" || isNaN(Number(correctNum))) { setErr("Réponse numérique invalide."); return; }
      correct = correctNum.trim();
    }
    // type "photo" : pas de bonne réponse (correction manuelle)

    startTransition(async () => {
      const res = await addQuestion({
        quiz_id: quizId,
        question: question.trim(),
        type,
        options: opts,
        correct_answer: correct,
        explanation: explanation.trim() || null,
        points,
        order_index: nextIndex,
      });
      if (res.ok) {
        setQuestion(""); setOptions(["", ""]); setCorrectQcm(0);
        setCorrectNum(""); setExplanation(""); setPoints(1);
        router.refresh();
      } else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 font-dm">Ajouter une question</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as QType)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="qcm">QCM (choix multiple)</option>
          <option value="true_false">Vrai / Faux</option>
          <option value="number">Réponse numérique</option>
          <option value="photo">Photo (correction manuelle)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Question *</label>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} required rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
      </div>

      {type === "qcm" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Options (cochez la bonne réponse)</label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={correctQcm === i} onChange={() => setCorrectQcm(i)} className="accent-violet-600" />
              <input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions((arr) => arr.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" onClick={() => setOptions((o) => [...o, ""])}
              className="text-sm text-orange-600 font-semibold hover:underline">+ Ajouter une option</button>
          )}
        </div>
      )}

      {type === "true_false" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonne réponse</label>
          <select value={correctTf} onChange={(e) => setCorrectTf(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="Vrai">Vrai</option>
            <option value="Faux">Faux</option>
          </select>
        </div>
      )}

      {type === "number" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonne réponse (nombre)</label>
          <input value={correctNum} onChange={(e) => setCorrectNum(e.target.value)} inputMode="decimal"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Points</label>
          <input type="number" min={1} value={points} onChange={(e) => setPoints(Math.max(1, Number(e.target.value)))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Explication (affichée après réponse, optionnel)</label>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <button type="submit" disabled={isPending}
        className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
        {isPending ? "Ajout…" : "+ Ajouter la question"}
      </button>
    </form>
  );
}
