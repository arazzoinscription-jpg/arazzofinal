"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2, CheckSquare } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { bulkDeletePracticals } from "@/app/dashboard/cours/[id]/extras-actions";
import { ReviewCard, type PracticalRow } from "./review-card";

export function PracticalsBoard({
  pending, approved, sharedIds,
}: {
  pending: PracticalRow[];
  approved: PracticalRow[];
  sharedIds: string[];
}) {
  const router = useRouter();
  const shared = new Set(sharedIds);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleMany(ids: string[], on: boolean) {
    setSel((p) => { const n = new Set(p); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  }

  function removeSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Supprimer définitivement ${list.length} travail/travaux pratique(s) ?\nAction irréversible.`)) return;
    start(async () => {
      const res = await bulkDeletePracticals(list);
      if (res.ok) { toast(`${res.count} travail/travaux supprimé(s) ✅`, "success"); setSel(new Set()); router.refresh(); }
      else toast(res.error ?? "Suppression impossible", "error");
    });
  }

  const pendingIds = pending.map((r) => r.id);
  const approvedIds = approved.map((r) => r.id);
  const allPendingSel = pendingIds.length > 0 && pendingIds.every((id) => sel.has(id));
  const allApprovedSel = approvedIds.length > 0 && approvedIds.every((id) => sel.has(id));

  return (
    <>
      {/* Barre d'actions groupées */}
      {sel.size > 0 && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-2 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-violet-900 dark:text-violet-200 me-1">{sel.size} sélectionné(s)</span>
          <button onClick={removeSelected} disabled={busy}
            className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Supprimer la sélection
          </button>
          <button onClick={() => setSel(new Set())} className="ms-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-white/60">
            <X size={15} /> Tout désélectionner
          </button>
        </div>
      )}

      {/* À corriger */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-dm font-semibold text-gray-800 dark:text-white/80">
          À corriger <span className="text-gray-400 font-normal">({pending.length})</span>
        </h2>
        {pending.length > 0 && (
          <button onClick={() => toggleMany(pendingIds, !allPendingSel)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline">
            <CheckSquare size={14} /> {allPendingSel ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        )}
      </div>
      {pending.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 mb-10">
          <div className="text-5xl mb-3">🪡</div>
          <p className="text-gray-400 font-dm">Aucun travail en attente de correction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {pending.map((r) => (
            <ReviewCard key={r.id} row={r} selectable selected={sel.has(r.id)} onToggleSelect={() => toggle(r.id)} />
          ))}
        </div>
      )}

      {/* Travaux validés */}
      {approved.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-dm font-semibold text-gray-800 dark:text-white/80">
              Travaux validés <span className="text-gray-400 font-normal">({approved.length})</span>
            </h2>
            <button onClick={() => toggleMany(approvedIds, !allApprovedSel)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline">
              <CheckSquare size={14} /> {allApprovedSel ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approved.map((r) => (
              <ReviewCard key={r.id} row={r} defaultApproved defaultShared={shared.has(r.id)}
                selectable selected={sel.has(r.id)} onToggleSelect={() => toggle(r.id)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
