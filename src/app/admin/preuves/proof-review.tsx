"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewProof } from "@/app/actions/admin/payments";
import { toast } from "@/components/ui/toast";

export interface ProofRow {
  id: string;
  status: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  admin_note: string | null;
  extracted_amount: number | null;
  ai_confidence: number | null;
  ai_is_fake: boolean | null;
  signedUrl: string | null;
  order: { id: string; order_number: string; total: number; full_name: string | null; email: string | null } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "À vérifier", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approuvée", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Refusée", cls: "bg-red-100 text-red-700" },
  needs_resubmit: { label: "À renvoyer", cls: "bg-orange-100 text-orange-700" },
};
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export function ProofReview({ proof }: { proof: ProofRow }) {
  const router = useRouter();
  const [note, setNote] = useState(proof.admin_note ?? "");
  const [isPending, startTransition] = useTransition();
  const st = STATUS[proof.status] ?? STATUS.pending;
  const done = proof.status !== "pending";

  function decide(decision: "approved" | "rejected" | "needs_resubmit") {
    if ((decision === "rejected" || decision === "needs_resubmit") && !note.trim()) {
      toast("Ajoutez une note expliquant la décision", "error"); return;
    }
    startTransition(async () => {
      const res = await reviewProof({ proofId: proof.id, decision, note: note.trim() || null });
      if (res.ok) { toast("Décision enregistrée", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 font-dm">{proof.order?.order_number ?? "—"}</p>
          <p className="text-xs text-gray-400 font-dm truncate">{proof.order?.full_name} · {proof.order?.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${st.cls}`}>{st.label}</span>
      </div>

      {/* Visualisation preuve */}
      {proof.signedUrl ? (
        proof.file_type === "pdf" ? (
          <a href={proof.signedUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-cream-50 rounded-xl border border-cream-200 h-40 text-gray-500 hover:bg-cream-100">
            📄 Ouvrir le PDF en grand
          </a>
        ) : (
          <a href={proof.signedUrl} target="_blank" rel="noreferrer">
            <img src={proof.signedUrl} alt="Preuve" className="w-full max-h-72 object-contain rounded-xl border border-cream-200 bg-cream-50" />
          </a>
        )
      ) : <p className="text-sm text-gray-400">Fichier indisponible.</p>}

      {/* Montants + IA */}
      <div className="grid grid-cols-2 gap-2 text-sm font-dm mt-3">
        <div className="bg-cream-50 rounded-lg px-3 py-2">
          <span className="text-gray-400 text-xs block">Montant commande</span>
          <span className="font-semibold text-gray-800">{proof.order ? fmt(proof.order.total) : "—"}</span>
        </div>
        <div className="bg-cream-50 rounded-lg px-3 py-2">
          <span className="text-gray-400 text-xs block">Montant détecté (IA)</span>
          <span className="font-semibold text-gray-800">{proof.extracted_amount != null ? fmt(proof.extracted_amount) : "—"}</span>
        </div>
      </div>
      {proof.ai_is_fake && (
        <p className="text-xs text-red-600 font-semibold mt-2">⚠️ Suspicion de faux détectée par l'IA{proof.ai_confidence != null ? ` (${Math.round(proof.ai_confidence * 100)}%)` : ""}.</p>
      )}

      {done ? (
        proof.admin_note && <p className="text-sm text-gray-500 font-dm mt-3 bg-cream-50 rounded-lg p-2">Note : {proof.admin_note}</p>
      ) : (
        <>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (obligatoire si refus / renvoi)…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <button onClick={() => decide("approved")} disabled={isPending}
              className="bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">Accepter</button>
            <button onClick={() => decide("needs_resubmit")} disabled={isPending}
              className="bg-orange-100 text-orange-700 py-2 rounded-xl text-sm font-semibold hover:bg-orange-200 disabled:opacity-50">Redemander</button>
            <button onClick={() => decide("rejected")} disabled={isPending}
              className="bg-red-50 text-red-600 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50">Refuser</button>
          </div>
        </>
      )}
    </div>
  );
}
