"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Loader2, Clapperboard } from "lucide-react";
import { setPracticalFeedback } from "@/app/dashboard/cours/[id]/extras-actions";
import { sharePracticalToFeedAsStaff } from "@/app/actions/community";
import { toast } from "@/components/ui/toast";

export interface PracticalRow {
  id: string;
  photo_url: string | null;
  video_url: string | null;
  note: string | null;
  feedback: string | null;
  created_at: string;
  status: string;
  studentName: string;
  lessonTitle: string;
  courseTitle: string;
}

/** Correction d'un travail pratique (lesson_practicals) : retour + valider / à retravailler. */
export function ReviewCard({ row, defaultApproved = false, defaultShared = false }: { row: PracticalRow; defaultApproved?: boolean; defaultShared?: boolean }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [approved, setApproved] = useState(defaultApproved); // validé → propose le partage
  const [shared, setShared] = useState(defaultShared);
  const isReviewed = row.status === "reviewed";

  function decide(status: "approved" | "reviewed") {
    if (status === "reviewed" && !feedback.trim()) {
      setErr("Expliquez ce qu'il faut retravailler avant d'envoyer le retour.");
      return;
    }
    setErr("");
    startTransition(async () => {
      const res = await setPracticalFeedback(row.id, feedback.trim(), status);
      if (res.ok) {
        if (status === "approved") { toast("Travail validé ✅", "success"); setApproved(true); }
        else { toast("Retour envoyé à l'élève — à retravailler ↩️", "success"); router.refresh(); }
      } else {
        toast(res.error ?? "Erreur", "error");
        setErr(res.error ?? "Erreur");
      }
    });
  }

  function shareToFeed() {
    startTransition(async () => {
      const res = await sharePracticalToFeedAsStaff(row.id);
      if (res.ok) { toast("Publié sur le feed communauté 🎬", "success"); setShared(true); }
      else toast(res.error ?? "Erreur", "error");
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

      {isReviewed && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
          <RotateCcw size={13} /> Retour envoyé — en attente d'une nouvelle soumission
        </div>
      )}

      {row.photo_url && (
        <a href={row.photo_url} target="_blank" rel="noreferrer">
          <img src={row.photo_url} alt="Travail soumis" className="w-full max-h-72 object-contain rounded-xl border border-cream-200 dark:border-white/10 mb-3 bg-cream-50 dark:bg-white/5" />
        </a>
      )}
      {row.video_url && (
        <video src={row.video_url} controls className="w-full rounded-xl border border-cream-200 dark:border-white/10 mb-3" />
      )}

      {row.note && <p className="text-sm text-gray-600 dark:text-white/70 font-dm mb-3 italic">« {row.note} »</p>}

      {!approved && (
        <>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="Votre retour à l'élève (obligatoire pour « à retravailler »)…"
            className="w-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-2"
          />
          {err && <p className="text-sm text-red-500 mb-2">{err}</p>}
        </>
      )}

      {approved ? (
        <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2 inline-flex items-center gap-1.5"><Check size={15} /> Travail validé</p>
          {row.feedback && <p className="text-xs text-green-800/80 dark:text-green-200/70 mb-2 italic">Retour : « {row.feedback} »</p>}
          <div className="flex gap-2">
            {!shared ? (
              <button onClick={shareToFeed} disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-700 text-white py-2 rounded-xl font-semibold text-sm hover:bg-violet-800 transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={15} />} Partager au feed
              </button>
            ) : (
              <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300"><Check size={15} /> Publié sur le feed</span>
            )}
            {!defaultApproved && (
              <button onClick={() => router.refresh()} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5">
                Terminé
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => decide("approved")} disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />} Valider
          </button>
          <button onClick={() => decide("reviewed")} disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-700 text-white py-2 rounded-xl font-semibold text-sm hover:bg-violet-800 transition-colors disabled:opacity-50">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} {isReviewed ? "Renvoyer le retour" : "À retravailler"}
          </button>
        </div>
      )}
    </div>
  );
}
