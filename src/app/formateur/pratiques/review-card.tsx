"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Loader2 } from "lucide-react";
import { setPracticalFeedback } from "@/app/dashboard/cours/[id]/extras-actions";

export interface PracticalRow {
  id: string;
  photo_url: string | null;
  video_url: string | null;
  note: string | null;
  created_at: string;
  status: string;
  studentName: string;
  lessonTitle: string;
  courseTitle: string;
}

/** Correction d'un travail pratique (lesson_practicals) : retour + valider / à retravailler. */
export function ReviewCard({ row }: { row: PracticalRow }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function decide(status: "approved" | "reviewed") {
    if (status === "reviewed" && !feedback.trim()) {
      setErr("Expliquez ce qu'il faut retravailler.");
      return;
    }
    setErr("");
    startTransition(async () => {
      const res = await setPracticalFeedback(row.id, feedback.trim(), status);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white font-dm truncate">{row.studentName}</p>
          <p className="text-xs text-gray-400 font-dm truncate">{row.lessonTitle}{row.courseTitle ? ` · ${row.courseTitle}` : ""}</p>
        </div>
        <span className="text-xs text-gray-400 font-dm flex-shrink-0">
          {new Date(row.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>

      {row.photo_url && (
        <a href={row.photo_url} target="_blank" rel="noreferrer">
          <img src={row.photo_url} alt="Travail soumis" className="w-full max-h-72 object-contain rounded-xl border border-cream-200 dark:border-white/10 mb-3 bg-cream-50 dark:bg-white/5" />
        </a>
      )}
      {row.video_url && (
        <video src={row.video_url} controls className="w-full rounded-xl border border-cream-200 dark:border-white/10 mb-3" />
      )}

      {row.note && <p className="text-sm text-gray-600 dark:text-white/70 font-dm mb-3 italic">« {row.note} »</p>}

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        placeholder="Votre retour à l'élève (obligatoire pour « à retravailler »)…"
        className="w-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-2"
      />

      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}

      <div className="flex gap-2">
        <button onClick={() => decide("approved")} disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />} Valider
        </button>
        <button onClick={() => decide("reviewed")} disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-700 text-white py-2 rounded-xl font-semibold text-sm hover:bg-violet-800 transition-colors disabled:opacity-50">
          <RotateCcw size={14} /> À retravailler
        </button>
      </div>
    </div>
  );
}
