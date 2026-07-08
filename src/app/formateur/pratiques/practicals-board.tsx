"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2, CheckSquare } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { bulkDeletePracticals } from "@/app/dashboard/cours/[id]/extras-actions";
import { ReviewCard, type PracticalRow } from "./review-card";

type TabKey = "news" | "redo" | "share";

/**
 * Board de correction en 3 DOSSIERS :
 *  • Nouveaux (non corrigés)   → status "submitted"
 *  • À refaire                 → status "reviewed" (retour envoyé, en attente)
 *  • À partager sur le feed     → status "approved"
 */
export function PracticalsBoard({
  pending, approved, sharedIds,
}: {
  pending: PracticalRow[];
  approved: PracticalRow[];
  sharedIds: string[];
}) {
  const router = useRouter();
  const shared = new Set(sharedIds);

  const news = pending.filter((r) => r.status === "submitted");
  const redo = pending.filter((r) => r.status === "reviewed");

  const TABS: { key: TabKey; label: string; emoji: string; rows: PracticalRow[] }[] = [
    { key: "news", label: "Nouveaux", emoji: "🆕", rows: news },
    { key: "redo", label: "À refaire", emoji: "↩️", rows: redo },
    { key: "share", label: "À partager sur le feed", emoji: "🎬", rows: approved },
  ];

  const [tab, setTab] = useState<TabKey>(() => (news.length ? "news" : redo.length ? "redo" : approved.length ? "share" : "news"));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();

  const current = TABS.find((t) => t.key === tab)!;
  const currentIds = current.rows.map((r) => r.id);
  const allSel = currentIds.length > 0 && currentIds.every((id) => sel.has(id));

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll(on: boolean) {
    setSel((p) => { const n = new Set(p); currentIds.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
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

  const EMPTY: Record<TabKey, string> = {
    news: "Aucun nouveau travail à corriger.",
    redo: "Aucun travail à refaire en attente.",
    share: "Aucun travail validé à partager pour l'instant.",
  };

  return (
    <>
      {/* Onglets / dossiers */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSel(new Set()); }}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                on ? "bg-violet-950 dark:bg-orange-DEFAULT text-white shadow-md"
                   : "bg-white dark:bg-white/[0.05] text-violet-950/70 dark:text-white/70 ring-1 ring-violet-950/12 dark:ring-white/10 hover:ring-orange-400 hover:text-orange-600"
              }`}>
              <span>{t.emoji}</span> {t.label}
              <span className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                on ? "bg-white/25 text-white" : "bg-cream-100 dark:bg-white/10 text-violet-950/70 dark:text-white/60"
              }`}>{t.rows.length}</span>
            </button>
          );
        })}
      </div>

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

      {current.rows.length > 0 && (
        <div className="flex items-center justify-end mb-3">
          <button onClick={() => toggleAll(!allSel)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline">
            <CheckSquare size={14} /> {allSel ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>
      )}

      {current.rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">{current.emoji}</div>
          <p className="text-gray-400 font-dm">{EMPTY[tab]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {current.rows.map((r) => (
            <ReviewCard key={r.id} row={r}
              defaultApproved={tab === "share"} defaultShared={tab === "share" && shared.has(r.id)}
              selectable selected={sel.has(r.id)} onToggleSelect={() => toggle(r.id)} />
          ))}
        </div>
      )}
    </>
  );
}
