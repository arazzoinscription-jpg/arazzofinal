"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPractical } from "@/app/formateur/quiz/actions";

export interface PracticalRow {
  id: string;
  photo_url: string | null;
  comment: string | null;
  created_at: string;
  studentName: string;
  quizTitle: string;
  lessonTitle: string;
}

/** Carte de révision d'un travail pratique : aperçu photo + approuver / rejeter avec retour. */
export function ReviewCard({ row }: { row: PracticalRow }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function decide(status: "approved" | "rejected") {
    if (status === "rejected" && !feedback.trim()) {
      setErr("Expliquez ce qu'il faut retravailler.");
      return;
    }
    setErr("");
    startTransition(async () => {
      const res = await reviewPractical({ id: row.id, status, feedback: feedback.trim() || null });
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 font-dm truncate">{row.studentName}</p>
          <p className="text-xs text-gray-400 font-dm truncate">{row.quizTitle} · {row.lessonTitle}</p>
        </div>
        <span className="text-xs text-gray-400 font-dm flex-shrink-0">
          {new Date(row.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>

      {row.photo_url && (
        <a href={row.photo_url} target="_blank" rel="noreferrer">
          <img src={row.photo_url} alt="Travail soumis" className="w-full max-h-72 object-contain rounded-xl border border-cream-200 mb-3 bg-cream-50" />
        </a>
      )}

      {row.comment && <p className="text-sm text-gray-600 font-dm mb-3 italic">« {row.comment} »</p>}

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        placeholder="Retour pour l'élève (obligatoire si refus)…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-2"
      />

      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={isPending}
          className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "✅ Approuver (+50 XP)"}
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={isPending}
          className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          🔁 À retravailler
        </button>
      </div>
    </div>
  );
}
