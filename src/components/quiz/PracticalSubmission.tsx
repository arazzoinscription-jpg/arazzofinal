"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPracticalPhoto } from "@/app/actions/quiz";

export interface ExistingSubmission {
  status: "pending" | "approved" | "rejected";
  photo_url: string | null;
  comment: string | null;
  feedback: string | null;
  reviewed_at: string | null;
}

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending:  { label: "En attente de validation", cls: "bg-yellow-100 text-yellow-700", icon: "⏳" },
  approved: { label: "Approuvé", cls: "bg-green-100 text-green-700", icon: "✅" },
  rejected: { label: "À retravailler", cls: "bg-red-100 text-red-700", icon: "🔁" },
};

/** Soumission d'un travail pratique : upload photo + preview + suivi du statut. */
export function PracticalSubmission({ quizId, existing }: { quizId: string; existing: ExistingSubmission | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  // Si déjà soumis et pas rejeté → on affiche le statut
  if (existing && existing.status !== "rejected") {
    const s = STATUS[existing.status];
    return (
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.cls}`}>{s.icon} {s.label}</span>
        </div>
        {existing.photo_url && (
          <img src={existing.photo_url} alt="Votre soumission" className="w-full max-h-80 object-contain rounded-xl border border-cream-200 mb-4" />
        )}
        {existing.comment && <p className="text-sm text-gray-600 font-dm mb-3">Votre note : {existing.comment}</p>}
        {existing.feedback && (
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-violet-DEFAULT font-dm mb-1">💬 Retour de votre formatrice</p>
            <p className="text-sm text-gray-700 font-dm">{existing.feedback}</p>
          </div>
        )}
      </div>
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr("");
    if (f) setPreview(URL.createObjectURL(f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f) { setErr("Choisissez une photo."); return; }
    setErr("");
    const fd = new FormData();
    fd.append("quizId", quizId);
    fd.append("comment", comment);
    fd.append("file", f);
    startTransition(async () => {
      const res = await submitPracticalPhoto(fd);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      {existing?.status === "rejected" && existing.feedback && (
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-600 font-dm mb-1">🔁 À retravailler</p>
          <p className="text-sm text-gray-700 font-dm">{existing.feedback}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo de votre réalisation *</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} required
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-DEFAULT file:font-semibold hover:file:bg-violet-100" />
      </div>

      {preview && (
        <img src={preview} alt="Aperçu" className="w-full max-h-80 object-contain rounded-xl border border-cream-200" />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire (optionnel)</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
          placeholder="Décrivez votre travail…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <button type="submit" disabled={isPending}
        className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
        {isPending ? "Envoi…" : "📷 Envoyer ma photo"}
      </button>
    </form>
  );
}
